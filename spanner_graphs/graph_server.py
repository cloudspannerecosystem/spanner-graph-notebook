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

import http.server
import socketserver
import json
import threading
import requests
import portpicker
from networkx.classes import DiGraph

from spanner_graphs.conversion import prepare_data_for_graphing, columns_to_native_numpy
from spanner_graphs.database import get_database_instance


def execute_query(project: str, instance: str, database: str, query: str, mock = False):
    database = get_database_instance(project, instance, database, mock)

    try:
        query_result, fields, rows, schema_json = database.execute_query(query)
        d, ignored_columns = columns_to_native_numpy(query_result, fields)

        graph: DiGraph = prepare_data_for_graphing(
            incoming=d,
            schema_json=schema_json)

        nodes = []
        for (node_id, node) in graph.nodes(data=True):
            nodes.append(node)

        edges = []
        for (from_id, to_id, edge) in graph.edges(data=True):
            edges.append(edge)

        return {
            "response": {
                "nodes": nodes,
                "edges": edges,
                "schema": schema_json,
                "rows": rows
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
    }

    @staticmethod
    def build_route(endpoint):
        return f"{GraphServer.url}{endpoint}"

    @staticmethod
    def start_server():
        with socketserver.TCPServer(("", GraphServer.port), GraphServerHandler) as httpd:
            print(f"Spanner Graph notebook loaded")
            httpd.serve_forever()

    @staticmethod
    def init():
        server_thread = threading.Thread(target=GraphServer.start_server)
        server_thread.start()
        return server_thread

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
        self.send_header('Content-type', 'application/json')
        self.send_header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_message_response(self, message):
        self.do_json_response({'message': message})

    def do_data_response(self, data):
        self.do_json_response(data)

    def parse_post_data(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        return json.loads(post_data)

    def handle_get_ping(self):
        self.do_message_response('pong')

    def handle_post_ping(self):
        data = self.parse_post_data()
        self.do_data_response({'your_request': data})

    def handle_post_query(self):
        data = self.parse_post_data()
        response = execute_query(
            project=data["project"],
            instance=data["instance"],
            database=data["database"],
            query=data["query"],
            mock=data["mock"]
        )
        self.do_data_response(response)

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