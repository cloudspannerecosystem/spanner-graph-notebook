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
import json
from threading import Thread
import re

from IPython.core.display import HTML, JSON, Javascript
from IPython.core.magic import Magics, magics_class, line_cell_magic
from IPython.display import display, clear_output

from spanner_graphs.exec_env import get_database_instance
from spanner_graphs.graph_server import (
    GraphServer, execute_query, execute_node_expansion,
)
from spanner_graphs.graph_visualization import generate_visualization_html
from spanner_graphs.gcp_helper import GcpHelper
from .utils import FileHandler


singleton_server_thread: Thread = None

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
    
def receive_instances_request(project: str):
    try:
        credentials = GcpHelper.get_default_credentials_with_project()
        instances = GcpHelper.fetch_project_instances(credentials, project)
        return JSON({"instances": instances})
    except Exception as e:
        return JSON({"error": str(e), "instances": []})


def receive_databases_request(project: str, instance: str):
    try:
        credentials = GcpHelper.get_default_credentials_with_project()
        databases = GcpHelper.fetch_instance_databases(credentials, project, instance)
        return JSON({"databases": databases})
    except Exception as e:
        return JSON({"error": str(e), "databases": []})

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

            output.register_callback('graph_visualization.GetInstances', receive_instances_request)
            output.register_callback('graph_visualization.GetDatabases', receive_databases_request)
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

    @line_cell_magic
    def spanner_graph(self, line: str, cell: str = None):
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
                self.cell = ""
                FileHandler.show_loader("Authenticating and fetching GCP resources...")

                try:
                    credentials = GcpHelper.get_default_credentials_with_project()
                    projects = GcpHelper.fetch_gcp_projects(credentials)
                except Exception as e:
                    projects = {}
                    print(f"Error fetching GCP resources: {e}")

                REMOVE_LOADER = FileHandler.hide_loader()
                display(Javascript(REMOVE_LOADER + '\nremoveLoader();'))

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
                    projects=json.dumps({"projects": projects}),
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
                mock=self.args.mock
            )
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
