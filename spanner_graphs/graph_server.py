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
from typing import Union, Dict, Any

import requests
import portpicker
import atexit
from datetime import datetime

from spanner_graphs.conversion import get_nodes_edges
from spanner_graphs.exec_env import get_database_instance
from spanner_graphs.database import SpannerQueryResult
from google.cloud import spanner
from spanner_graphs.gcp_helper import GcpHelper
from urllib.parse import urlparse, parse_qs

# Supported types for a property
PROPERTY_TYPE_SET = {
    'BOOL',
    'BYTES',
    'DATE',
    'ENUM',
    'INT64',
    'NUMERIC',
    'FLOAT32',
    'FLOAT64',
    'STRING',
    'TIMESTAMP'
}

class NodePropertyForDataExploration:
    def __init__(self, key: str, value: Union[str, int, float, bool], type_str: str):
        self.key = key
        self.value = value
        self.type_str = type_str


class EdgeDirection(Enum):
    INCOMING = "INCOMING"
    OUTGOING = "OUTGOING"

cached_credentials = None


def is_valid_property_type(property_type: str) -> bool:
    """
    Validates a property type.

    Args:
        property_type: The property type string from the request

    Returns:
        'True' if the property type is valid and supported

    Raises:
        ValueError: If the property type is invalid
    """
    if not property_type:
        raise ValueError("Property type must be provided")

    # Convert to uppercase for case-insensitive comparison
    property_type = property_type.upper()

    # Check if the type is valid
    if property_type not in PROPERTY_TYPE_SET:
        valid_types = ', '.join(sorted(PROPERTY_TYPE_SET))
        raise ValueError(f"Invalid property type: {property_type}. Allowed types are: {valid_types}")

    return True

def validate_node_expansion_request(data) -> (list[NodePropertyForDataExploration], EdgeDirection):
    required_fields = ["project", "instance", "database", "graph", "uid", "node_labels", "direction"]
    missing_fields = [field for field in required_fields if data.get(field) is None]

    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

    node_labels = data.get("node_labels")
    node_properties = data.get("node_properties", [])

    # Validate node_labels
    if not isinstance(node_labels, list):
        raise ValueError("node_labels must be an array")

    for label in node_labels:
        if not isinstance(label, str):
            raise ValueError("Each node label must be a string")

    # Validate node_properties
    if not isinstance(node_properties, list):
        raise ValueError("node_properties must be an array")

    validated_properties: list[NodePropertyForDataExploration] = []
    for idx, prop in enumerate(node_properties):
        if not isinstance(prop, dict):
            raise ValueError(f"Property at index {idx} must be an object")

        if not all(field in prop for field in ["key", "value", "type"]):
            raise ValueError(f"Property at index {idx} is missing required fields (key, value, type)")

        try:
            prop_type_str = prop["type"]
            if isinstance(prop_type_str, str):
                # This must be True. If not, an execption would be thrown.
                assert(is_valid_property_type(prop_type_str))

                value = prop["value"]
                if prop_type_str in ('INT64', 'NUMERIC'):
                    if not (isinstance(value, int) or (isinstance(value, str) and value.isdigit())):
                        raise ValueError(f"Property '{prop['key']}' value must be a number for type {prop_type_str}")
                elif prop_type_str in ('FLOAT32', 'FLOAT64'):
                    try:
                        float(value)
                    except (ValueError, TypeError):
                        raise ValueError(
                            f"Property '{prop['key']}' value must be a valid float for type {prop_type_str}")
                elif prop_type_str == 'BOOL':
                    if not isinstance(value, bool) and not (isinstance(value, str) and value.lower() in ["true", "false"]):
                        raise ValueError(f"Property '{prop['key']}' value must be a boolean for type {prop_type_str}")

                validated_properties.append(NodePropertyForDataExploration(
                    key=prop["key"],
                    value=prop["value"],
                    type_str=prop_type_str
                ))
            else:
                raise ValueError(f"Property type at index {idx} must be a string")
        except ValueError as e:
            raise ValueError(f"Invalid property type in property at index {idx}: {str(e)}")

    try:
        direction = EdgeDirection(data.get("direction"))
    except ValueError:
        raise ValueError(f"Invalid direction: must be INCOMING or OUTGOING, got \"{data.get('direction')}\"")

    return validated_properties, direction


def execute_node_expansion(
    params_str: str,
    request: dict
) -> dict:
    """Execute a node expansion query to find connected nodes and edges.

    Args:
        params_str: A JSON string containing connection parameters (project,
        instance, database, graph, mock).
        request: A dictionary containing node expansion request details (uid,
        node_labels, node_properties, direction, edge_label).

    Returns:
        dict: A dictionary containing the query response with nodes and edges.
    """

    params = json.loads(params_str)
    node_properties, direction = validate_node_expansion_request(params | request)

    project = params.get("project")
    instance = params.get("instance")
    database = params.get("database")
    graph = params.get("graph")
    uid = request.get("uid")
    node_labels = request.get("node_labels")
    edge_label = request.get("edge_label")

    edge = "e" if not edge_label else f"e:{edge_label}"

    # Build the path pattern based on direction
    path_pattern = (
        f"(n)-[{edge}]->(d)"
        if direction == EdgeDirection.OUTGOING
        else f"(n)<-[{edge}]-(d)"
    )

    node_label_str = ""
    if node_labels and len(node_labels) > 0:
        node_label_str = f": {' & '.join(node_labels)}"

    node_property_clauses: list[str] = []
    params_dict: dict = {}
    param_types_dict: dict = {}

    for i, node_property in enumerate(node_properties):
        param_name = f"param_{i}"
        node_property_clauses.append(f"n.{node_property.key} = @{param_name}")

        # Convert value to native Python type
        type_str = node_property.type_str
        value = node_property.value

        if type_str in ("INT64", "NUMERIC"):
            value_casting = int(value)
            param_type = spanner.param_types.INT64
        elif type_str in ("FLOAT32", "FLOAT64"):
            value_casting = float(value)
            param_type = spanner.param_types.FLOAT64
        elif type_str == "BOOL":
            value_casting = value.lower() == "true"
            param_type = spanner.param_types.BOOL
        elif type_str == "STRING":
            value_casting = str(value)
            param_type = spanner.param_types.STRING
        elif type_str == "DATE":
            value_casting = datetime.strptime(value, "%Y-%m-%d").date()
            param_type = spanner.param_types.DATE
        elif type_str == "TIMESTAMP":
            value_casting = datetime.fromisoformat(value.replace("Z", "+00:00"))
            param_type = spanner.param_types.TIMESTAMP

        params_dict[param_name] = value_casting
        param_types_dict[param_name] = param_type

    filtered_uid = "STRING(TO_JSON(n).identifier) = @uid"
    params_dict["uid"] = str(uid)
    param_types_dict["uid"] = spanner.param_types.STRING

    where_clauses = node_property_clauses + [filtered_uid]
    where_clause_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = f"""
        GRAPH {graph}
        MATCH (n{node_label_str})
        {where_clause_str}
        RETURN n

        NEXT

        MATCH {path_pattern}
        RETURN TO_JSON(e) as e, TO_JSON(d) as d
        """

    return execute_query(
        project, instance, database, query, mock=False,
        params=params_dict, param_types=param_types_dict
    )


def execute_query(
    project: str,
    instance: str,
    database: str,
    query: str,
    mock: bool = False,
    params: Dict[str, Any] = None,
    param_types: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """Executes a query against a database and formats the result.

    Connects to a database, runs the query, and processes the resulting object.
    On success, it formats the data into nodes and edges for graph visualization.
    If the query fails, it returns a detailed error message, optionally
    including the database schema to aid in debugging.

    Args:
        project: The cloud project ID.
        instance: The database instance name.
        database: The database name.
        query: The query string to execute.
        mock: If True, use a mock database instance for testing. Defaults to False.

    Returns:
        A dictionary containing either the structured 'response' with nodes,
        edges, and other data, or an 'error' key with a descriptive message.
    """
    try:
        db_instance = get_database_instance(project, instance, database, mock)
        result: SpannerQueryResult = db_instance.execute_query(
            query,
            params=params,
            param_types=param_types
        )

        if len(result.rows) == 0 and result.err:
            error_message = f"Query error: \n{getattr(result.err, 'message', str(result.err))}"
            if result.schema_json:
                # Prepend a helpful message if the schema is available
                error_message = (
                    "We've detected an error in your query. To help you troubleshoot, "
                    "the graph schema's layout is shown above.\n\n" + error_message
                )

            # Consolidate the repetitive error response into a single return
            return {
                "response": {
                    "schema": result.schema_json,
                    "query_result": result.data,
                    "nodes": [],
                    "edges": [],
                    "rows": [],
                },
                "error": error_message,
            }

        # Process a successful query result
        nodes, edges = get_nodes_edges(result.data, result.fields,
                                       result.schema_json)

        return {
            "response": {
                "nodes": [node.to_json() for node in nodes],
                "edges": [edge.to_json() for edge in edges],
                "schema": result.schema_json,
                "rows": result.rows,
                "query_result": result.data,
            }
        }
    except Exception as e:
        return {"error": getattr(e, "message", str(e))}


class GraphServer:
    port = portpicker.pick_unused_port()
    host = 'http://localhost'
    url = f"{host}:{port}"

    endpoints = {
        "get_ping": "/get_ping",
        "post_ping": "/post_ping",
        "post_query": "/post_query",
        "post_node_expansion": '/post_node_expansion',
        "gcp_projects": '/gcp_projects',
        "get_instances": '/get_instances',
        "get_databases": '/get_databases',
        "save_config": '/save_config',
        "get_saved_config": '/get_saved_config'
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
    def set_port(port):
        """Set a specific port for the server to use"""
        GraphServer.port = port
        GraphServer.url = f"{GraphServer.host}:{GraphServer.port}"

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
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


    def do_message_response(self, message):
        self.do_json_response({'message': message})

    def do_data_response(self, data):
        self.do_json_response(data)

    def do_error_response(self, message):
        if isinstance(message, Exception):
            message = str(message)
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
        """Handle POST requests for node expansion.

        Expects a JSON payload with:
        - params: A JSON string containing connection parameters (project, instance, database, graph)
        - request: A dictionary with node details (uid, node_labels, node_properties, direction, edge_label)
        """
        try:
            data = self.parse_post_data()

            # Execute node expansion with:
            # - params_str: JSON string with connection parameters (project, instance, database, graph)
            # - request: Dict with node details (uid, node_labels, node_properties, direction, edge_label)
            self.do_data_response(execute_node_expansion(
                params_str=data.get("params"),
                request=data.get("request")
            ))
        except BaseException as e:
            self.do_error_response(e)
            return

    def get_gcp_resources(self):
        try:
            # Always fetch fresh data
            credentials = GcpHelper.get_default_credentials_with_project()
            gcp_data = GcpHelper.fetch_all_gcp_resources(credentials)
            self.do_json_response(gcp_data)
        except Exception as e:
            self.do_error_response(str(e))
            
    def get_gcp_projects_only(self):
        global cached_credentials
        try:
            if not cached_credentials:
                cached_credentials = GcpHelper.get_default_credentials_with_project()
            projects = GcpHelper.fetch_gcp_projects(cached_credentials)
            self.do_json_response({"projects": projects})
        except Exception as e:
            self.do_error_response(str(e))

    def handle_get_instances(self):
        global cached_credentials
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            project_id = params.get("project", [None])[0]

            if not project_id:
                self.do_error_response("project_id is missing")
                return

            if not cached_credentials:
                cached_credentials = GcpHelper.get_default_credentials_with_project()

            instances = GcpHelper.fetch_project_instances(cached_credentials, project_id)

            self.do_json_response({"instances": instances})

        except Exception as e:
            self.do_error_response(str(e))

    def handle_get_databases(self):
        global cached_credentials
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            project_id = params.get("project", [None])[0]
            instance_id = params.get("instance", [None])[0]

            if not project_id or not instance_id:
                self.do_error_response("both project_id and instance_id are required")
                return

            if not cached_credentials:
                cached_credentials = GcpHelper.get_default_credentials_with_project()

            databases = GcpHelper.fetch_instance_databases(cached_credentials, project_id, instance_id)

            self.do_json_response({"databases": databases})

        except Exception as e:
            self.do_error_response(str(e))

    def handle_save_user_data(self):
        print("handle user data function")
        global saved_user_config
        try:
            data = self.parse_post_data()
            saved_user_config = data
            self.do_json_response({"status": "saved"})
        except Exception as e:
            self.do_error_response(str(e))

    def get_saved_user_data(self):
        print("get user data")
        global saved_user_config
        self.do_data_response(saved_user_config)

    def do_GET(self):
        parsed_path = urlparse(self.path).path
        print(parsed_path)
        if self.path == GraphServer.endpoints["get_ping"]:
            self.handle_get_ping()
        elif parsed_path == GraphServer.endpoints["get_instances"]:
            self.handle_get_instances()
        elif parsed_path == GraphServer.endpoints["get_databases"]:
            self.handle_get_databases()
        elif self.path == GraphServer.endpoints["gcp_projects"]:
            self.get_gcp_projects_only()
        elif self.path == GraphServer.endpoints["get_saved_config"]:
            self.get_saved_user_data()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == GraphServer.endpoints["post_ping"]:
            self.handle_post_ping()
        elif self.path == GraphServer.endpoints["post_query"]:
            self.handle_post_query()
        elif self.path == GraphServer.endpoints["post_node_expansion"]:
            self.handle_post_node_expansion()
        elif self.path == GraphServer.endpoints['save_config']:
            self.handle_save_user_data()

atexit.register(GraphServer.stop_server)
