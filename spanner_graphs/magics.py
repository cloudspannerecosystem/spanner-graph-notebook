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

from IPython.core.display import HTML, JSON
from IPython.core.magic import Magics, magics_class, cell_magic
from IPython.display import display, clear_output
from networkx import DiGraph
import ipywidgets as widgets
from ipywidgets import interact
from jinja2 import Template

from spanner_graphs.database import get_database_instance
from spanner_graphs.graph_server import (
    GraphServer, execute_query, execute_node_expansion, 
    EdgeDirection, validate_property_type
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
    return JSON(execute_query(project=params_dict["project"],
                              instance=params_dict["instance"],
                              database=params_dict["database"],
                              query=query,
                              mock=params_dict["mock"]))

def receive_node_expansion_request(request: dict, params: str):
    """Handle node expansion requests in Google Colab environment"""
    params_dict = json.loads(params)
    return JSON(execute_node_expansion(
        project=params_dict["project"],
        instance=params_dict["instance"],
        database=params_dict["database"],
        graph=params_dict["graph"],
        uid=request["uid"],
        node_key_property_name=request["node_key_property_name"],
        node_key_property_value=request["node_key_property_value"],
        direction=EdgeDirection(request["direction"]),
        edge_label=request.get("edge_label"),
        property_type=validate_property_type(request["node_key_property_type"])
    ))

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

    def visualize(self):
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
            }))
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
            args = parser.parse_args(line.split())
            if not args.mock:
                if not (args.project and args.instance and args.database):
                    raise ValueError(
                        "Please provide `--project`, `--instance`, "
                        "and `--database` values for your query.")

            self.args = parser.parse_args(line.split())
            self.cell = cell
            self.database = get_database_instance(
                self.args.project,
                self.args.instance,
                self.args.database,
                mock=self.args.mock)
            clear_output(wait=True)
            self.visualize()
        except BaseException as e:
            print(f"Error: {e}")
            print("Usage: %%spanner_graph --project PROJECT_ID "
                  "--instance INSTANCE_ID --database DATABASE_ID "
                  "[--mock] ")
            print("       Graph query here...")


def load_ipython_extension(ipython):
    """Registration function"""
    ipython.register_magics(NetworkVisualizationMagics)
