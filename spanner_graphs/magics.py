# Copyright 2024 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Magic class for our visualization"""

import argparse
import base64
import random
import uuid
from enum import Enum, auto
import json
import os
import sys
from threading import Thread
import re

from IPython.core.display import HTML, JSON, Javascript
from IPython.core.magic import Magics, magics_class, cell_magic
from IPython.display import display, clear_output
from networkx import DiGraph
import ipywidgets as widgets
from ipywidgets import interact
from jinja2 import Template

from spanner_graphs.exec_env import get_database_instance
from spanner_graphs.graph_server import (
    GraphServer, execute_query, execute_node_expansion,
    validate_node_expansion_request
)
from spanner_graphs.graph_visualization import generate_visualization_html
from google.cloud import spanner_admin_instance_v1, spanner_admin_database_v1
from googleapiclient.discovery import build
from google.api_core.client_options import ClientOptions
import pydata_google_auth


singleton_server_thread: Thread = None

def _load_file(path: list[str]) -> str:
        file_path = os.path.sep.join(path)
        if not os.path.exists(file_path):
                raise FileNotFoundError(f"Template file not found: {file_path}")

        with open(file_path, 'r') as file:
                content = file.read()

        return content

def _load_image(path: list[str]) -> str:
    file_path = os.path.sep.join(path)
    if not os.path.exists(file_path):
        print("image does not exist")
        return ''

    if file_path.lower().endswith('.svg'):
        with open(file_path, 'r') as file:
            svg = file.read()
            return base64.b64encode(svg.encode('utf-8')).decode('utf-8')
    else:
        with open(file_path, 'rb') as file:
            return base64.b64decode(file.read()).decode('utf-8')

def _parse_element_display(element_rep: str) -> dict[str, str]:
    """Helper function to parse element display fields into a dict."""
    if not element_rep:
        return {}
    res = {
        e.strip().split(":")[0].lower(): e.strip().split(":")[1]
        for e in element_rep.strip().split(",")
    }
    return res

def is_colab() -> bool:
    """Check if code is running in Google Colab"""
    try:
        import google.colab
        return True
    except ImportError:
        return False

def receive_query_request(query: str, params: str):
    params_dict = json.loads(params)
    return JSON(execute_query(project=params_dict["project"],
                              instance=params_dict["instance"],
                              database=params_dict["database"],
                              query=query,
                              mock=params_dict["mock"]))

def receive_node_expansion_request(request: dict, params_str: str):
    """Handle node expansion requests in Google Colab environment

    Args:
        request: A dictionary containing node expansion details including:
            - uid: str - Unique identifier of the node to expand
            - node_labels: List[str] - Labels of the node
            - node_properties: List[Dict] - Properties of the node with key, value, and type
            - direction: str - Direction of expansion ("INCOMING" or "OUTGOING")
            - edge_label: Optional[str] - Label of edges to filter by
        params_str: A JSON string containing connection parameters:
            - project: str - GCP project ID
            - instance: str - Spanner instance ID
            - database: str - Spanner database ID
            - graph: str - Graph name
            - mock: bool - Whether to use mock data

    Returns:
        JSON: A JSON-serialized response containing either:
            - The query results with nodes and edges
            - An error message if the request failed
    """
    try:
        return JSON(execute_node_expansion(params_str, request))
    except BaseException as e:
        return JSON({"error": e})
    
def get_default_credentials_with_project():
    credentials, _ = pydata_google_auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"], 
        use_local_webserver=False
    )
    return credentials

def fetch_all_gcp_resources(credentials):
    result = {}
    try:
        crm_service = build("cloudresourcemanager", "v1", credentials=credentials)
        projects_resp = crm_service.projects().list().execute()
        projects = projects_resp.get("projects", [])

        for project in projects:
            project_id = project["projectId"]
            result[project_id] = {"instances": {}}

            client_options = ClientOptions(quota_project_id=project_id)
            instance_client = spanner_admin_instance_v1.InstanceAdminClient(
                credentials=credentials,
                client_options=client_options
            )

            try:
                instances = instance_client.list_instances(parent=f"projects/{project_id}")
            except Exception as e:
                print(f"[!] Skipping project {project_id} due to instance error: {e}")
                continue

            for instance in instances:
                instance_id = instance.name.split("/")[-1]
                result[project_id]["instances"][instance_id] = []

                db_client = spanner_admin_database_v1.DatabaseAdminClient(
                    credentials=credentials,
                    client_options=client_options
                )

                try:
                    dbs = db_client.list_databases(
                        parent=f"projects/{project_id}/instances/{instance_id}"
                    )
                    for db in dbs:
                        db_id = db.name.split("/")[-1]
                        result[project_id]["instances"][instance_id].append(db_id)
                except Exception as e:
                    print(f"[!] Skipping databases for {project_id}/{instance_id}: {e}")
                    continue
    except Exception as e:
        print(f"[!] Error fetching GCP resources: {e}")
        # Return an empty result if there's a broader error during fetching
        return {} 
    return result

@magics_class
class NetworkVisualizationMagics(Magics):
    """Network visualizer with Networkx"""

    def __init__(self, shell):
        super().__init__(shell)
        self.database = None
        self.limit = 5
        self.args = None
        self.cell = None

        if is_colab():
            from google.colab import output
            output.register_callback('graph_visualization.Query', receive_query_request)
            output.register_callback('graph_visualization.NodeExpansion', receive_node_expansion_request)
        else:
            global singleton_server_thread
            alive = singleton_server_thread and singleton_server_thread.is_alive()
            if not alive:
                singleton_server_thread = GraphServer.init()

    def visualize(self, show_config_popup=False):
        """Helper function to create and display the visualization"""
        # Extract the graph name from the query (if present)
        graph = ""
        if 'GRAPH ' in self.cell.upper():
            match = re.search(r'GRAPH\s+(\w+)', self.cell, re.IGNORECASE)
            if match:
                graph = match.group(1)

        # Generate the HTML content
        html_content = generate_visualization_html(
            query=self.cell,
            port=GraphServer.port,
            params=json.dumps({
                "project": self.args.project,
                "instance": self.args.instance,
                "database": self.args.database,
                "mock": self.args.mock,
                "graph": graph
            }),
            show_config_on_load=show_config_popup
        )
        display(HTML(html_content))

    @cell_magic
    def spanner_graph(self, line: str, cell: str):
        """spanner_graph function"""

        parser = argparse.ArgumentParser(
            description="Visualize network from Spanner database",
            exit_on_error=False)
        parser.add_argument("--project", help="GCP project ID")
        parser.add_argument("--instance",
                            help="Spanner instance ID")
        parser.add_argument("--database",
                            help="Spanner database ID")
        parser.add_argument("--mock",
                            action="store_true",
                            help="Use mock database")

        try:
            if not line.strip():
                self.args = argparse.Namespace(
                    project="",
                    instance="",
                    database="",
                    mock=False
                )
                self.cell = cell
                display(HTML("""
                <div id="loader-container" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100px;
                    font-family: Arial, sans-serif;
                ">
                <div style="text-align: center;">
                    <div class="loader" style="
                        border: 6px solid #f3f3f3;
                        border-top: 6px solid #4285F4;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: auto;
                    "></div>
                    <div style="margin-top: 10px;">Authenticating and fetching GCP resources...</div>
                </div>
                <style>
                    @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                    }
                </style>
                </div>
            """))
                try:
                    credentials = get_default_credentials_with_project()
                    gcp_data = fetch_all_gcp_resources(credentials)
                except Exception as e:
                    gcp_data = {}
                    print(f"Error fetching GCP resources: {e}")
                
                display(Javascript("""
                    const loader = document.getElementById('loader-container');
                    if (loader) loader.remove();
                    """))

                html_content = generate_visualization_html(
                    query=cell,
                    port=GraphServer.port,
                    params=json.dumps({
                        "project": "",
                        "instance": "",
                        "database": "",
                        "mock": False,
                        "graph": ""
                    }),
                    gcp_data=json.dumps(gcp_data),  # pass to HTML
                    show_config_on_load=True
                )
                display(HTML(html_content))
                return

            args = parser.parse_args(line.split())
            if not args.mock:
                if not (args.project and args.instance and args.database):
                    raise ValueError(
                        "Please provide `--project`, `--instance`, "
                        "and `--database` values for your query.")
                if not cell or not cell.strip():
                    print("Error: Query is required.")
                    return

            self.args = args
            self.cell = cell
            self.database = get_database_instance(
                self.args.project,
                self.args.instance,
                self.args.database,
                mock=self.args.mock)
            clear_output(wait=True)
            self.visualize(show_config_popup=False)
        except BaseException as e:
            print(f"Error: {e}")
            print("Usage: %%spanner_graph --project PROJECT_ID "
                  "--instance INSTANCE_ID --database DATABASE_ID "
                  "[--mock] ")
            print("       Graph query here...")


def load_ipython_extension(ipython):
    """Registration function"""
    ipython.register_magics(NetworkVisualizationMagics)
