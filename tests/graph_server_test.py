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
            ("INT64", "123"),
            ("NUMERIC", "123"),
            ("FLOAT32", "123.45"),
            ("FLOAT64", "123.45"),
            ("BOOL", "true"),
            ("STRING", "hello"),
            ("DATE", "2024-03-14"),
            ("TIMESTAMP", "2024-03-14T12:00:00Z"),
            ("BYTES", "base64data"),
        ]

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test-graph",
        })

        for type_str, value in test_cases:
            with self.subTest(type=type_str, value=value):
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

                last_call = mock_execute_query.call_args
                query_params = last_call[1]['params']
                param_types = last_call[1]['param_types']

                self.assertIn('@p0', last_call[0][3])
                self.assertEqual(query_params['p0'], value)
                self.assertIsNotNone(param_types['p0'])


    @patch('spanner_graphs.graph_server.execute_query')
    def test_property_value_formatting_no_type(self, mock_execute_query):
        """Test that property values are quoted when no type is provided."""
        mock_execute_query.return_value = {"response": {"nodes": [], "edges": []}}

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

        last_call = mock_execute_query.call_args
        query_params = last_call[1]['params']
        param_types = last_call[1]['param_types']

        self.assertIn('@p0', last_call[0][3])
        self.assertEqual(query_params['p0'], "test_value")
        self.assertIsNotNone(param_types['p0'])

if __name__ == '__main__':
    unittest.main()
