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

"""This module provides test for the graph_entities implementation"""

import unittest
import networkx as nx
from spanner_graphs.graph_entities import Node, Edge


class TestNode(unittest.TestCase):
    """Test case for a Node"""

    def test_node_creation(self):
        """Test that a node is created correctly using `Node.from_json`"""
        data = {
            "identifier": "1",
            "labels": ["Person"],
            "properties": {
                "name": "Emmanuel"
            },
        }

        node = Node.from_json(data)
        self.assertEqual(node.identifier, "1")
        self.assertEqual(node.labels, ["Person"])
        self.assertEqual(node.properties, {"name": "Emmanuel"})

    def test_add_node_to_graph(self):
        """Test that a node is added correctly to a networkx graph"""
        graph = nx.MultiDiGraph()
        node_mapping = {}

        data = {
            "identifier": "1",
            "labels": ["Person"],
            "properties": {
                "name": "Emmanuel"
            },
        }

        node = Node.from_json(data)
        if node.identifier not in node_mapping:
            node_mapping[node.identifier] = len(node_mapping) + 1

        node.add_to_graph(graph)

        self.assertIn(node_mapping["1"], graph)
        node_id = node_mapping["1"]

class TestEdge(unittest.TestCase):
    """Test cases for the Edge class"""

    def test_edge_creation(self):
        """Test that an Edge object is created correctly"""
        data = {
            "identifier": "3",
            "source_node_identifier": "1",
            "destination_node_identifier": "2",
            "labels": ["KNOWS"],
            "properties": {
                "since": "2020"
            },
        }

        edge = Edge.from_json(data)
        self.assertEqual(edge.source, "1")
        self.assertEqual(edge.destination, "2")
        self.assertEqual(edge.labels, ["KNOWS"])
        self.assertEqual(edge.properties, {"since": "2020"})

    def test_add_edge_to_graph(self):
        """Test that an edge is added correct to a graph"""
        graph = nx.DiGraph()
        node_mapping = {"1": 1, "2": 2}

        data = {
            "identifier": "1",
            "source_node_identifier": "1",
            "destination_node_identifier": "2",
            "labels": ["KNOWS"],
            "properties": {
                "since": "2020"
            },
        }

        edge = Edge.from_json(data)
        edge.add_to_graph(graph)

        self.assertIn((1, 2), graph.edges)
        # self.assertEqual(graph.edges[1, 2]["label"], "KNOWS")
        # self.assertEqual(graph.edges[1, 2]["title"],
        #                  "--- Edge Properties ---\nsince: 2020")

    def test_add_edge_to_graph_with_missing_nodes(self):
        """Test that edge with a missing node is not added to graph"""
        graph = nx.DiGraph()
        node_mapping = {"1": 1}

        data = {
            "identifier": "2",
            "source_node_identifier": "1",
            "destination_node_identifier": "2",
            "labels": ["KNOWS"],
            "properties": {
                "since": "2020"
            },
        }

        edge = Edge.from_json(data)
        edge.add_to_graph(graph)

        self.assertNotIn((1, 2), graph.edges)
