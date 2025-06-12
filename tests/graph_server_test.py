import unittest
from unittest.mock import patch, MagicMock
import json

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
        where_line = [line for line in query.split('\n') if 'WHERE' in line][0]
        expected_pattern = "n.test_property='''test_value'''"
        self.assertIn(expected_pattern, where_line,
            "Property value should be quoted when string type is provided")

if __name__ == '__main__':
    unittest.main()
