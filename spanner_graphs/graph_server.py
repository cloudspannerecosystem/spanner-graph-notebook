# Copyright 2025 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import http.server
import socketserver
import json
import threading
from enum import Enum

import requests
import portpicker
import atexit

from spanner_graphs.conversion import get_nodes_edges
from spanner_graphs.database import get_database_instance


class EdgeDirection(Enum):
    INCOMING = "INCOMING"
    OUTGOING = "OUTGOING"

def execute_node_expansion(
    project: str,
    instance: str,
    database: str,
    node_key_property_name: str,
    node_key_property_value: str,
    graph: str,
    uid: str,
    direction: EdgeDirection,
    edge_label: str = None):

    edge = "e" if not edge_label else f"e:{edge_label}"

    # Build the path pattern based on direction
    path_pattern = (
        f"(n)-[{edge}]->(d)"
        if direction == EdgeDirection.OUTGOING
        else f"(n)<-[{edge}]-(d)"
    )

    query = f"""
        GRAPH {graph}
        LET uid = "{uid}"
        MATCH (n)
        WHERE n.{node_key_property_name} = "{node_key_property_value}" and STRING(TO_JSON(n).identifier) = uid
        RETURN n

        NEXT

        MATCH p1 = {path_pattern}
        RETURN TO_JSON(p1) as p1
        """

    return execute_query(project, instance, database, query, mock=False)

def execute_query(project: str, instance: str, database: str, query: str, mock = False):
    database = get_database_instance(project, instance, database, mock)

    try:
        query_result, fields, rows, schema_json = database.execute_query(query)
        nodes, edges = get_nodes_edges(query_result, fields, schema_json)
        
        return {
            "response": {
                "nodes": [node.to_json() for node in nodes],
                "edges": [edge.to_json() for edge in edges],
                "schema": schema_json,
                "rows": rows,
                "query_result": query_result
            }
        }
    except Exception as e:
        return {
            "error": getattr(e, "message", str(e))
        }


class GraphServer:
    port = portpicker.pick_unused_port()
    host = 'http://localhost'
    url = f"{host}:{port}"

    endpoints = {
        "get_ping": "/get_ping",
        "post_ping": "/post_ping",
        "post_query": "/post_query",
        "post_node_expansion": '/post_node_expansion',
    }

    _server = None

    @staticmethod
    def build_route(endpoint):
        return f"{GraphServer.url}{endpoint}"

    @staticmethod
    def start_server():
        class ThreadedTCPServer(socketserver.TCPServer):
            # Allow socket reuse to avoid "Address already in use" errors
            allow_reuse_address = True
            # Daemon threads automatically terminate when the main program exits
            daemon_threads = True

        with ThreadedTCPServer(("", GraphServer.port), GraphServerHandler) as httpd:
            GraphServer._server = httpd
            print(f"Spanner Graph Notebook loaded")
            GraphServer._server.serve_forever()

    @staticmethod
    def init():
        server_thread = threading.Thread(target=GraphServer.start_server)
        server_thread.start()
        return server_thread

    @staticmethod
    def stop_server():
        if GraphServer._server:
            GraphServer._server.shutdown()
            print("Spanner Graph Notebook shutting down...")

    @staticmethod
    def get_ping():
        route = GraphServer.build_route(GraphServer.endpoints["get_ping"])
        response = requests.get(route)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Request failed with status code {response.status_code}")
            return False

    @staticmethod
    def post_ping(data):
        route = GraphServer.build_route(GraphServer.endpoints["post_ping"])
        response = requests.post(route, json=data)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Request failed with status code {response.status_code}")
            return False

class GraphServerHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_json_response(self, data):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_message_response(self, message):
        self.do_json_response({'message': message})

    def do_data_response(self, data):
        self.do_json_response(data)

    def do_error_response(self, message):
        self.do_json_response({'error': message})

    def parse_post_data(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length).decode("utf-8")
        return json.loads(post_data)

    def handle_get_ping(self):
        self.do_message_response("pong")

    def handle_post_ping(self):
        data = self.parse_post_data()
        self.do_data_response({"your_request": data})

    def handle_post_query(self):
        data = self.parse_post_data()
        params = json.loads(data["params"])
        response = execute_query(            
            project=params["project"],
            instance=params["instance"],
            database=params["database"],
            query=data["query"],
            mock=params["mock"]
        )
        self.do_data_response(response)

    def handle_post_node_expansion(self):
        data = self.parse_post_data()
        required_fields = ["project", "instance", "database", "graph", "uid", "node_key_property_name", "node_key_property_value", "direction"]
        missing_fields = [field for field in required_fields if data.get(field) is None]
        
        if missing_fields:
            self.do_error_response(f"Missing required fields: {', '.join(missing_fields)}")
            return

        project = data.get("project")
        instance = data.get("instance")
        database = data.get("database")
        graph = data.get("graph")
        uid = data.get("uid")
        node_key_property_name = data.get("node_key_property_name")
        node_key_property_value = data.get("node_key_property_value")
        edge_label = data.get("edge_label")
        
        try:
            direction = EdgeDirection(data.get("direction"))
        except ValueError:
            self.do_error_response(f"Invalid direction: must be INCOMING or OUTGOING, got \"{data.get('direction')}\"")
            return

        self.do_data_response(execute_node_expansion(
            project=project, 
            instance=instance, 
            database=database, 
            graph=graph, 
            uid=uid,
            node_key_property_name=node_key_property_name, 
            node_key_property_value=node_key_property_value,
            direction=direction,
            edge_label=edge_label
        ))

    def do_GET(self):
        if self.path == GraphServer.endpoints["get_ping"]:
            self.handle_get_ping()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == GraphServer.endpoints["post_ping"]:
            self.handle_post_ping()
        elif self.path == GraphServer.endpoints["post_query"]:
            self.handle_post_query()
        elif self.path == GraphServer.endpoints["post_node_expansion"]:
            self.handle_post_node_expansion()

atexit.register(GraphServer.stop_server)