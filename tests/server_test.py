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

import unittest
import requests
import json
from spanner_graphs.graph_server import GraphServer
from spanner_graphs.database import SpannerEnv

class TestSpannerServer(unittest.TestCase):
    def setUp(self):
        self.server_thread = GraphServer.init()

    def tearDown(self):
        GraphServer.stop_server()  # Stop the server after each test
        self.server_thread.join()  # Wait for the thread to finish

    def test_ping(self):
        self.assertTrue(self.server_thread.is_alive())

        response = GraphServer.get_ping()
        self.assertEqual(response, {"message": "pong"})

        request = {"data": "ping"}
        response = GraphServer.post_ping(request)
        self.assertEqual(response, {"your_request": request})

    def test_post_query_with_mock(self):
        """Test querying with mock database"""
        # Build the request URL
        route = GraphServer.build_route(GraphServer.endpoints["post_query"])

        # Create request data with the new structure
        params = json.dumps({
            "selector": {
                "env": str(SpannerEnv.MOCK)
            },
            "graph": "TestGraph"
        })

        request_data = {
            "params": params,
            "query": "GRAPH TestGraph MATCH (n) RETURN n"
        }

        # Send POST request
        response = requests.post(route, json=request_data)

        # Verify response
        self.assertEqual(response.status_code, 200)
        response_data = response.json()

        # Check response structure
        self.assertIn("response", response_data)
        response = response_data["response"]
        self.assertIn("nodes", response)
        self.assertIn("edges", response)
        self.assertIn("schema", response)
        self.assertIn("rows", response)
        self.assertIn("query_result", response)

        # Verify we got some data
        self.assertTrue(len(response["nodes"]) > 0, "Should have at least one node")
        self.assertTrue(len(response["edges"]) > 0, "Should have at least one edge")

        # Verify node structure
        node = response["nodes"][0]
        self.assertIn("identifier", node)
        self.assertIn("labels", node)
        self.assertIn("properties", node)

        # Verify edge structure
        edge = response["edges"][0]
        self.assertIn("identifier", edge)
        self.assertIn("labels", edge)
        self.assertIn("properties", edge)
        self.assertIn("source_node_identifier", edge)
        self.assertIn("destination_node_identifier", edge)

    def test_node_expansion_error_handling(self):
        """Test that errors in node expansion are properly handled and returned."""
        # Build the request URL
        route = GraphServer.build_route(GraphServer.endpoints["post_node_expansion"])

        # Create request data with invalid fields to trigger validation error
        params = {
            "selector": {
                "env": str(SpannerEnv.CLOUD),
                "project_id": "test-project",
                "instance_id": "test-instance",
                "database_id": "test-database"
            },
            "graph": "test-graph",
        }
        request_data = {
            "params": json.dumps(params),
            "request": {
                "uid": "test-uid",
                # Missing required node_labels field
                "direction": "INVALID_DIRECTION"  # Invalid direction
            }
        }

        # Send POST request
        response = requests.post(route, json=request_data)

        # Verify response
        self.assertEqual(response.status_code, 200)  # Server still returns 200 but with error data
        response_data = response.json()

        # Check error presence
        self.assertIn("error", response_data)
        self.assertIsNotNone(response_data["error"])

if __name__ == '__main__':
    unittest.main()
