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

"""
This module tests the conversion file in `spanner_graph/conversion.py`
"""

from __future__ import annotations
import unittest

from spanner_graphs.conversion import get_nodes_edges
from spanner_graphs.database import MockSpannerDatabase


class TestConversion(unittest.TestCase):
    """
    Test class for conversion implementation
    """

    def test_get_nodes_edges(self) -> None:
        """
        Test direct conversion from database query results to nodes and edges
        using mock database data.
        """
        # Get data from mock database
        mock_db = MockSpannerDatabase()
        data, fields, _, schema_json = mock_db.execute_query("")

        # Convert data to nodes and edges
        nodes, edges = get_nodes_edges(data, fields)

        # Verify we got some nodes and edges
        self.assertTrue(len(nodes) > 0, "Should have at least one node")
        self.assertTrue(len(edges) > 0, "Should have at least one edge")

        # Test node uniqueness
        node_ids = {node.identifier for node in nodes}
        self.assertEqual(len(nodes), len(node_ids), "All nodes should have unique identifiers")

        # Test edge uniqueness
        edge_ids = {edge.identifier for edge in edges}
        self.assertEqual(len(edges), len(edge_ids), "All edges should have unique identifiers")

        # Test node structure
        for node in nodes:
            self.assertTrue(hasattr(node, 'identifier'), "Node should have an identifier")
            self.assertTrue(hasattr(node, 'labels'), "Node should have labels")
            self.assertTrue(hasattr(node, 'properties'), "Node should have properties")
            self.assertIsInstance(node.labels, list, "Node labels should be a list")
            self.assertIsInstance(node.properties, dict, "Node properties should be a dict")

        # Test edge structure
        for edge in edges:
            self.assertTrue(hasattr(edge, 'identifier'), "Edge should have an identifier")
            self.assertTrue(hasattr(edge, 'labels'), "Edge should have labels")
            self.assertTrue(hasattr(edge, 'properties'), "Edge should have properties")
            self.assertTrue(hasattr(edge, 'source'), "Edge should have a source")
            self.assertTrue(hasattr(edge, 'destination'), "Edge should have a destination")
            self.assertIsInstance(edge.labels, list, "Edge labels should be a list")
            self.assertIsInstance(edge.properties, dict, "Edge properties should be a dict")
            
            # Verify edge endpoints exist in nodes
            source_exists = any(node.identifier == edge.source for node in nodes)
            dest_exists = any(node.identifier == edge.destination for node in nodes)
            self.assertTrue(source_exists, f"Edge source {edge.source} should exist in nodes")
            self.assertTrue(dest_exists, f"Edge destination {edge.destination} should exist in nodes")

if __name__ == "__main__":
    unittest.main()
