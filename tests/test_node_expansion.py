import unittest
from unittest.mock import patch, MagicMock
import json

from spanner_graphs.magics import receive_node_expansion_request
from spanner_graphs.graph_server import EdgeDirection, TypeCode

class TestNodeExpansion(unittest.TestCase):
    def setUp(self):
        self.sample_request = {
            "uid": "node-123",
            "node_key_property_name": "id",
            "node_key_property_value": "123",
            "node_key_property_type": "INT64",
            "direction": "OUTGOING",
            "edge_label": "CONNECTS_TO"
        }
        self.sample_params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test_graph",
            "mock": False
        })

    @patch('spanner_graphs.magics.execute_node_expansion')
    def test_receive_node_expansion_request(self, mock_execute):
        # Setup mock return value
        mock_execute.return_value = {
            "response": {
                "nodes": [],
                "edges": []
            }
        }

        # Call the function
        result = receive_node_expansion_request(self.sample_request, self.sample_params)

        # Verify execute_node_expansion was called with correct parameters
        mock_execute.assert_called_once_with(
            project="test-project",
            instance="test-instance",
            database="test-database",
            graph="test_graph",
            uid="node-123",
            node_key_property_name="id",
            node_key_property_value="123",
            direction=EdgeDirection.OUTGOING,
            edge_label="CONNECTS_TO",
            property_type=TypeCode.INT64
        )

        # Verify the result is wrapped in JSON
        self.assertEqual(result.data, mock_execute.return_value)

    @patch('spanner_graphs.magics.execute_node_expansion')
    def test_receive_node_expansion_request_without_edge_label(self, mock_execute):
        # Remove edge_label from request
        request = dict(self.sample_request)
        del request["edge_label"]

        # Setup mock return value
        mock_execute.return_value = {
            "response": {
                "nodes": [],
                "edges": []
            }
        }

        # Call the function
        result = receive_node_expansion_request(request, self.sample_params)

        # Verify execute_node_expansion was called with correct parameters
        mock_execute.assert_called_once_with(
            project="test-project",
            instance="test-instance",
            database="test-database",
            graph="test_graph",
            uid="node-123",
            node_key_property_name="id",
            node_key_property_value="123",
            direction=EdgeDirection.OUTGOING,
            edge_label=None,
            property_type=TypeCode.INT64
        )

    def test_invalid_property_type(self):
        # Modify request to have invalid property type
        request = dict(self.sample_request)
        request["node_key_property_type"] = "INVALID_TYPE"

        # Verify it raises ValueError
        with self.assertRaises(ValueError):
            receive_node_expansion_request(request, self.sample_params)

    def test_invalid_direction(self):
        # Modify request to have invalid direction
        request = dict(self.sample_request)
        request["direction"] = "INVALID_DIRECTION"

        # Verify it raises ValueError
        with self.assertRaises(ValueError):
            receive_node_expansion_request(request, self.sample_params)

if __name__ == '__main__':
    unittest.main() 