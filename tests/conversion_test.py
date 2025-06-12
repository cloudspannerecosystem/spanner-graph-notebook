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
import json

from spanner_graphs.conversion import get_nodes_edges
from spanner_graphs.database import SpannerFieldInfo, MockSpannerDatabase


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
        query_result = mock_db.execute_query("")

        # Convert data to nodes and edges
        nodes, edges = get_nodes_edges(query_result.data, query_result.fields)

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

    def test_get_nodes_edges_with_missing_nodes(self) -> None:
        """Test that intermediate nodes are created for missing node references in edges."""
        # Create mock data with edges that reference nodes that don't exist in the result
        data = {
            "column1": [
                json.dumps({
                    "kind": "edge",
                    "identifier": "edge1",
                    "source_node_identifier": "node1",
                    "destination_node_identifier": "node2",
                    "labels": ["CONNECTS_TO"],
                    "properties": {"weight": 5}
                }),
                json.dumps({
                    "kind": "node",
                    "identifier": "node1",
                    "labels": ["Device"],
                    "properties": {"name": "Router"}
                })
                # Note: node2 is intentionally missing
            ]
        }

        # Create a mock field for the column
        field = SpannerFieldInfo(
            name="column1",
            typename="JSON"
        )

        # Convert data to nodes and edges
        nodes, edges = get_nodes_edges(data, [field])

        # Verify we got the expected number of nodes and edges
        self.assertEqual(len(edges), 1, "Should have one edge")
        self.assertEqual(len(nodes), 2, "Should have two nodes (one real, one intermediate)")

        # Verify node identifiers
        node_ids = {node.identifier for node in nodes}
        self.assertIn("node1", node_ids, "Original node should exist")
        self.assertIn("node2", node_ids, "Missing node should be created as intermediate")

        # Find the intermediate node
        intermediate_node = next((node for node in nodes if node.identifier == "node2"), None)
        self.assertIsNotNone(intermediate_node, "Intermediate node should exist")
        self.assertTrue(intermediate_node.intermediate, "Node should be marked as intermediate")
        self.assertEqual(intermediate_node.labels, ["Intermediate"], "Intermediate node should have the Intermediate label")
        self.assertIn("note", intermediate_node.properties, "Intermediate node should have a note property")

    def test_get_nodes_edges_with_multiple_references(self) -> None:
        """Test that multiple edges referencing the same missing node only create one intermediate node."""
        # Create mock data with multiple edges that reference the same missing node
        data = {
            "column1": [
                json.dumps({
                    "kind": "edge",
                    "identifier": "edge1",
                    "source_node_identifier": "node1",
                    "destination_node_identifier": "missing_node",
                    "labels": ["CONNECTS_TO"],
                    "properties": {"weight": 5}
                }),
                json.dumps({
                    "kind": "edge",
                    "identifier": "edge2",
                    "source_node_identifier": "node2",
                    "destination_node_identifier": "missing_node",
                    "labels": ["CONNECTS_TO"],
                    "properties": {"weight": 10}
                }),
                json.dumps({
                    "kind": "node",
                    "identifier": "node1",
                    "labels": ["Device"],
                    "properties": {"name": "Router"}
                }),
                json.dumps({
                    "kind": "node",
                    "identifier": "node2",
                    "labels": ["Device"],
                    "properties": {"name": "Switch"}
                })
                # Note: missing_node is intentionally missing
            ]
        }

        # Create a mock field for the column
        field = SpannerFieldInfo(
            name="column1",
            typename="JSON"
        )

        # Convert data to nodes and edges
        nodes, edges = get_nodes_edges(data, [field])

        # Verify we got the expected number of nodes and edges
        self.assertEqual(len(edges), 2, "Should have two edges")
        self.assertEqual(len(nodes), 3, "Should have three nodes (two real, one intermediate)")

        # Count intermediate nodes
        intermediate_nodes = [node for node in nodes if node.intermediate]
        self.assertEqual(len(intermediate_nodes), 1, "Should create only one intermediate node")
        self.assertEqual(intermediate_nodes[0].identifier, "missing_node", "Intermediate node identifier should match")

    def test_get_nodes_edges_with_complete_data(self) -> None:
        """Test that no intermediate nodes are created when all node references are present."""
        # Create mock data with edges where all referenced nodes exist
        data = {
            "column1": [
                json.dumps({
                    "kind": "edge",
                    "identifier": "edge1",
                    "source_node_identifier": "node1",
                    "destination_node_identifier": "node2",
                    "labels": ["CONNECTS_TO"],
                    "properties": {"weight": 5}
                }),
                json.dumps({
                    "kind": "node",
                    "identifier": "node1",
                    "labels": ["Device"],
                    "properties": {"name": "Router"}
                }),
                json.dumps({
                    "kind": "node",
                    "identifier": "node2",
                    "labels": ["Device"],
                    "properties": {"name": "Switch"}
                })
            ]
        }

        # Create a mock field for the column
        field = SpannerFieldInfo(
            name="column1",
            typename="JSON"
        )

        # Convert data to nodes and edges
        nodes, edges = get_nodes_edges(data, [field])

        # Verify we got the expected number of nodes and edges
        self.assertEqual(len(edges), 1, "Should have one edge")
        self.assertEqual(len(nodes), 2, "Should have exactly two nodes (no intermediates)")

        # Verify no intermediate nodes exist
        intermediate_nodes = [node for node in nodes if node.intermediate]
        self.assertEqual(len(intermediate_nodes), 0, "Should not create any intermediate nodes")

if __name__ == "__main__":
    unittest.main()
