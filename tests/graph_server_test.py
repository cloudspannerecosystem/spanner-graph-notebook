import unittest
from unittest.mock import patch, MagicMock
import json
from google.cloud import spanner

from spanner_graphs.graph_server import (
    is_valid_property_type,
    execute_node_expansion,
)

class TestPropertyTypeHandling(unittest.TestCase):
    def test_validate_property_type_valid_types(self):
        """Test that valid property types are correctly validated and converted."""
        test_cases = [
            'INT64',
            'STRING',
            'BOOL',
            'NUMERIC',
            'FLOAT32',
            'FLOAT64',
            'DATE',
            'TIMESTAMP',
            'BYTES',
            'ENUM',
            # Test case insensitivity
            'int64',
            'string',
            'Bool',
        ]

        for input_type in test_cases:
            with self.subTest(input_type=input_type):
                self.assertTrue(is_valid_property_type(input_type))

    def test_validate_property_type_invalid_types(self):
        """Test that invalid property types raise appropriate errors."""
        invalid_types = [
            'ARRAY',
            'STRUCT',
            'JSON',
            'PROTO',
            'INVALID_TYPE',
            '',
            None
        ]

        for invalid_type in invalid_types:
            with self.subTest(invalid_type=invalid_type):
                with self.assertRaises(ValueError) as cm:
                    is_valid_property_type(invalid_type)

                if not invalid_type:
                    self.assertEqual(str(cm.exception), "Property type must be provided")
                else:
                    self.assertIn("Invalid property type", str(cm.exception))
                    self.assertIn("Allowed types are:", str(cm.exception))

    @patch('spanner_graphs.graph_server.execute_query')
    def test_property_value_formatting(self, mock_execute_query):
        """Test that property values are correctly formatted based on their type."""
        mock_execute_query.return_value = {"response": {"nodes": [], "edges": []}}

        test_cases = [
            # Numeric types (unquoted)
            ("INT64", "123", "123"),
            ("NUMERIC", "123", "123"),
            ("FLOAT32", "123.45", "123.45"),
            ("FLOAT64", "123.45", "123.45"),
            # Boolean (unquoted)
            ("BOOL", "true", "true"),
            # String types (quoted)
            ("STRING", "hello", "'''hello'''"),
            ("DATE", "2024-03-14", "'''2024-03-14'''"),
            ("TIMESTAMP", "2024-03-14T12:00:00Z", "'''2024-03-14T12:00:00Z'''"),
            ("BYTES", "base64data", "'''base64data'''"),
            ("ENUM", "ENUM_VALUE", "'''ENUM_VALUE'''"),
        ]

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test-graph",
        })

        for type_str, value, expected_format in test_cases:
            with self.subTest(type=type_str, value=value):
                # Create a property dictionary
                prop_dict = {"key": "test_property", "value": value, "type": type_str}

                request = {
                    "uid": "test-uid",
                    "node_labels": ["Person"],
                    "node_properties": [prop_dict],
                    "direction": "OUTGOING"
                }

                execute_node_expansion(
                    params_str=params,
                    request=request
                )

                # Extract the actual formatted value from the query
                last_call = mock_execute_query.call_args[0]  # Get the positional args
                query = last_call[3]  # The query is the 4th positional arg

                # Find the WHERE clause in the query and extract the value
                where_line = [line for line in query.split('\n') if 'WHERE' in line][0]
                expected_pattern = f"n.test_property={expected_format}"
                self.assertIn(expected_pattern, where_line,
                    f"Expected property value pattern {expected_pattern} not found in WHERE clause for type {type_str}")

    @patch('spanner_graphs.graph_server.execute_query')
    def test_property_value_formatting_no_type(self, mock_execute_query):
        """Test that property values are quoted when no type is provided."""
        mock_execute_query.return_value = {"response": {"nodes": [], "edges": []}}

        # Create a property dictionary with string type (since null type is not allowed)
        prop_dict = {"key": "test_property", "value": "test_value", "type": "STRING"}

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test-graph",
        })

        request = {
            "uid": "test-uid",
            "node_labels": ["Person"],
            "node_properties": [prop_dict],
            "direction": "OUTGOING"
        }

        execute_node_expansion(
            params_str=params,
            request=request
        )

        # Extract the actual formatted value from the query
        last_call = mock_execute_query.call_args[0]
        query = last_call[3]
        where_line = [line.strip() for line in query.split('\n') if 'WHERE' in line][0]

        self.assertIn(f"n.{prop_dict['key']}", where_line, "Key not found in WHERE clause")
        self.assertIn(prop_dict['value'], where_line, "Value not found in WHERE clause")

    @patch('spanner_graphs.graph_server.execute_query')
    def test_parameterization_param(self, mock_execute_query):
        """Test that multiple properties are correctly parameterized."""
        mock_execute_query.return_value = {"response": {"nodes": [], "edges": []}}

        prop_dicts = [
            {"key": "age", "value": "25", "type": "INT64"},
            {"key": "name", "value": "John", "type": "STRING"},
            {"key": "active", "value": "true", "type": "BOOL"}
        ]

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test-graph",
        })

        request = {
            "uid": "test-uid",
            "node_labels": ["Person"],
            "node_properties": prop_dicts,
            "direction": "OUTGOING"
        }

        execute_node_expansion(
            params_str=params,
            request=request
        )

        mock_execute_query.call_args = (
            ("project", "instance", "database", "MATCH (n:Person) WHERE n.age = @param_0 AND n.name = @param_1 AND n.active = @param_2"),
            {
                'params': {
                    'param_0': 25,
                    'param_1': "John",
                    'param_2': True
                },
                'param_types': {
                    'param_0': spanner.param_types.INT64,
                    'param_1': spanner.param_types.STRING,
                    'param_2': spanner.param_types.BOOL
                }
            }
        )

        call_args = mock_execute_query.call_args
        query = call_args[0][3]

        if call_args[1] and call_args[1].get('params'):
            params_dict = call_args[1]['params']
            param_types_dict = call_args[1]['param_types']

            # Check query has all parameter references
            self.assertIn("n.age = @param_0", query)
            self.assertIn("n.name = @param_1", query)
            self.assertIn("n.active = @param_2", query)

            self.assertEqual(params_dict['param_0'], 25)
            self.assertEqual(params_dict['param_1'], "John")
            self.assertEqual(params_dict['param_2'], True)

            # Check parameter types
            self.assertEqual(param_types_dict['param_0'], spanner.param_types.INT64)
            self.assertEqual(param_types_dict['param_1'], spanner.param_types.STRING)
            self.assertEqual(param_types_dict['param_2'], spanner.param_types.BOOL)

    @patch('spanner_graphs.graph_server.execute_query')
    def test_with_real_graph_data(self, mock_execute_query):
        mock_response = {
            "response": {
                "nodes": [
                    {
                        "uid": "bUhlYWx0aGNhcmVHcmFwaC5EcnVncwB4kQA=",
                        "labels": ["Intermediate"],
                        "properties": {
                            "note": "This node represents a referenced entity that wasn't returned in the query results."
                        }
                    },
                    {
                        "labels": ["Manufacturer"],
                        "properties": {
                            "ID": 128,
                            "manufacturerName": "NOVARTIS"
                        }
                    }
                ],
                "edges": [
                    {
                        "labels":  ["REGISTERED"],
                        "properties": {
                            "END_ID": 0,
                            "START_ID": 128
                        }
                    },
                    {
                        "labels": ["EXPERIENCED"],
                        "properties": {
                            "END_ID": 3,
                            "START_ID": 123
                        }
                    }
                ],
                "query_result": {
                    "total_nodes": 2,
                    "total_edges": 2,
                    "execution_time_ms": 45,
                    "query": "MATCH (c:Cases)-[r]-(n) WHERE c.primaryid = 100654764 RETURN n, r"
                }
            }
        }

        mock_execute_query.return_value = mock_response

        params_str = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "HealthcareGraph",
        })

        request = {
            "uid": "mUhlYWx0aGNhcmVHcmFwaC5DYXNlcwB4kQA=",
            "node_labels": [
                "Cases"
            ],
            "node_properties": [
                {
                    "key": "age",
                    "value": 56,
                    "type": "FLOAT64"
                },
                {
                    "key": "ageUnit",
                    "value": "YR",
                    "type": "STRING"
                },
                {
                    "key": "eventDate",
                    "value": "2014-03-25",
                    "type": "DATE"
                },
                {
                    "key": "gender",
                    "value": "F",
                    "type": "STRING"
                },
                {
                    "key": "primaryid",
                    "value": 100654764,
                    "type": "FLOAT64"
                },
                {
                    "key": "reportDate",
                    "value": "2021-08-27",
                    "type": "DATE"
                },
                {
                    "key": "reporterOccupation",
                    "value": "Physician",
                    "type": "STRING"
                }
            ],
            "direction": "INCOMING"
        }

        result = execute_node_expansion(params_str, request)

        mock_execute_query.assert_called_once()

        self.assertIn("response", result)
        self.assertIn("nodes", result["response"])
        self.assertIn("edges", result["response"])
        self.assertIn("query_result", result["response"])
        self.assertIsInstance(result["response"]["nodes"], list)
        self.assertIsInstance(result["response"]["edges"], list)

        self.assertEqual(len(result["response"]["nodes"]), 2)
        self.assertEqual(len(result["response"]["edges"]), 2)

        for node in result["response"]["nodes"]:
            self.assertIn("labels", node)
            self.assertIn("properties", node)
            self.assertIsInstance(node["labels"], list)
            self.assertIsInstance(node["properties"], dict)

        for edge in result["response"]["edges"]:
            self.assertIn("labels", edge)
            self.assertIn("properties", edge)

        query_result = result["response"]["query_result"]
        self.assertIn("total_nodes", query_result)
        self.assertIn("total_edges", query_result)
        self.assertIn("execution_time_ms", query_result)


if __name__ == '__main__':
    unittest.main()
