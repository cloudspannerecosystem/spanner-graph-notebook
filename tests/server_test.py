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
from spanner_graphs.graph_server import GraphServer

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
        
        # Create request data
        request_data = {
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "query": "GRAPH TestGraph MATCH (n) RETURN n",
            "mock": True
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

if __name__ == '__main__':
    unittest.main()
