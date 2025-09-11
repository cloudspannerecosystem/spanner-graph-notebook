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
from dataclasses import is_dataclass, asdict

from IPython.core.display import HTML, JSON
from IPython.core.magic import Magics, magics_class, cell_magic
from IPython.display import display, clear_output
from networkx import DiGraph
import ipywidgets as widgets
from ipywidgets import interact
from jinja2 import Template

from spanner_graphs.database import DatabaseSelector
from spanner_graphs.exec_env import get_database_instance
from spanner_graphs.graph_server import (
    GraphServer, execute_query, execute_node_expansion,
    validate_node_expansion_request
)
from spanner_graphs.graph_visualization import generate_visualization_html

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
    selector_dict = params_dict.get("selector")
    if not selector_dict:
        return JSON({"error": "Missing selector in params"})
    try:
        return JSON(execute_query(selector_dict=selector_dict, query=query))
    except Exception as e:
        return JSON({"error": str(e)})

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
            - selector: Dict - The DatabaseSelector object as a dict
            - graph: str - Graph name

    Returns:
        JSON: A JSON-serialized response containing either:
            - The query results with nodes and edges
            - An error message if the request failed
    """
    try:
        params_dict = json.loads(params_str)
        selector_dict = params_dict.get("selector")
        graph = params_dict.get("graph")
        if not selector_dict:
            return JSON({"error": "Missing selector in params"})

        return JSON(execute_node_expansion(selector_dict=selector_dict, graph=graph, request=request))
    except BaseException as e:
        return JSON({"error": str(e)})

def custom_json_serializer(o):
    """A JSON serializer that handles dataclasses and enums."""
    if is_dataclass(o):
        return asdict(o)
    if isinstance(o, Enum):
        return f"{o.__class__.__name__}.{o.name}"
    raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

@magics_class
class NetworkVisualizationMagics(Magics):
    """Network visualizer with Networkx"""

    def __init__(self, shell):
        super().__init__(shell)
        self.database = None
        self.limit = 5
        self.args = None
        self.cell = None
        self.selector = None

        if is_colab():
            from google.colab import output
            output.register_callback('graph_visualization.Query', receive_query_request)
            output.register_callback('graph_visualization.NodeExpansion', receive_node_expansion_request)
        else:
            global singleton_server_thread
            alive = singleton_server_thread and singleton_server_thread.is_alive()
            if not alive:
                singleton_server_thread = GraphServer.init()

    def visualize(self):
        """Helper function to create and display the visualization"""
        # Extract the graph name from the query (if present)
        graph = ""
        if 'GRAPH ' in self.cell.upper():
            match = re.search(r'GRAPH\s+(\w+)', self.cell, re.IGNORECASE)
            if match:
                graph = match.group(1)

        # Pack the selector and graph into the params to be sent to the GraphServer
        params = {
            "selector": self.selector,
            "graph": graph
        }

        # Generate the HTML content
        html_content = generate_visualization_html(
            query=self.cell,
            port=GraphServer.port,
            params=json.dumps(params, default=custom_json_serializer))

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
        parser.add_argument("--infra_db_path",
                            action="store_true",
                            help="Connect to internal Infra Spanner")

        try:
            args = parser.parse_args(line.split())
            selector = None
            if args.mock:
                selector = DatabaseSelector.mock()
            elif args.infra_db_path:
                selector = DatabaseSelector.infra(infra_db_path=args.database)
            else:
                if not (args.project and args.instance):
                    raise ValueError(
                        "Please provide `--project` and `--instance` for Cloud Spanner."
                    )
                selector = DatabaseSelector.cloud(args.project, args.instance, args.database)

            if not args.mock and (not cell or not cell.strip()):
                print("Error: Query is required.")
                return

            self.args = args
            self.cell = cell
            self.selector = selector
            self.database = get_database_instance(self.selector)
            clear_output(wait=True)
            self.visualize()
        except BaseException as e:
            print(f"Error: {e}")
            print("Usage: %%spanner_graph --infra_db_path <db_path>")
            print("       %%spanner_graph --project <proj> --instance <inst> --database <db>")
            print("       %%spanner_graph --mock")
            print("       Graph query here...")

def load_ipython_extension(ipython):
    """Registration function"""
    ipython.register_magics(NetworkVisualizationMagics)
