# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import unittest

from spanner_graphs.schema_manager import SchemaManager
from  spanner_graphs.graph_entities import Node, Edge

class TestSchemaManager(unittest.TestCase):
    def setUp(self):
        self.sample_schema = {
            "nodeTables": [
                {
                    "name": "Person",
                    "labelNames": ["Person"],
                    "keyColumns": ["id"],
                     "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                },
                {
                    "name": "Account",
                    "labelNames": ["Account"],
                    "keyColumns": ["account_id"],
                    "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                },
                {
                    "name": "BankAccount",
                    "labelNames": ["Account"],
                    "keyColumns": ["id"],
                    "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                },
                {
                    "name": "People",
                    "labelNames": ["Person", "Human"],
                    "keyColumns": ["id"],
                    "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                }
            ]
        }
        self.schema_manager = SchemaManager(self.sample_schema)

    def test_unique_node_labels(self):
        self.assertEqual(self.schema_manager.unique_node_labels, {"Person"})

    def test_get_unique_node_key_property_names(self):
        item = {
            "identifier": "1",
            "labels": ["Person"],
            "properties": {
                "id": "123",
                "type": "Current"
            },
        }

        node = Node.from_json(item)
        propert_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(propert_names, ["id"])

    def test_get_non_unique_node_key_property_names(self):
        item = {
            "identifier": "1",
            "labels": ["Account"],
            "properties": {
                "type": "Current"
                # Missing 'account_id' property which is required according to the schema
            },
        }

        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])

    def test_non_existing_node(self):
        item = {
            "identifier": "1",
            "labels": ["NoneExisting"],
            "properties": {
                "type": "Current"
            },
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])

    def test_type_error(self):
        with self.assertRaises(TypeError):
            self.schema_manager.get_key_property_names("NotANode")

    def test_multi_label_node(self):
        """Test that a node with multiple labels returns the correct key property names."""
        item = {
            "identifier": "1",
            "labels": ["Person", "Human"],
            "properties": {
                "id": "123",
                "name": "John Doe"
            },
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, ["id"])

    def test_multi_label_node_different_order(self):
        """Test that label order doesn't matter when matching node tables."""
        item = {
            "identifier": "1",
            "labels": ["Human", "Person"],  # Reversed order from schema
            "properties": {
                "id": "123",
                "name": "John Doe"
            },
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, ["id"])

    def test_missing_key_properties(self):
        """Test that when a node is missing key properties, an empty list is returned."""
        item = {
            "identifier": "1",
            "labels": ["Person", "Human"],
            "properties": {
                "name": "John Doe"  # Missing 'id' property
            },
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])

    def test_empty_properties(self):
        """Test that a node with empty properties returns an empty list."""
        item = {
            "identifier": "1",
            "labels": ["Person"],
            "properties": {},
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])

    def test_empty_labels(self):
        """Test that a node with empty labels returns an empty list."""
        item = {
            "identifier": "1",
            "labels": [],
            "properties": {
                "id": "123"
            },
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])
