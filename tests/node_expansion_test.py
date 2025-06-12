import unittest
from unittest.mock import patch, MagicMock
import json

from spanner_graphs.magics import receive_node_expansion_request
from spanner_graphs.graph_server import EdgeDirection

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

    @patch('spanner_graphs.magics.validate_node_expansion_request')
    @patch('spanner_graphs.magics.execute_node_expansion')
    def test_receive_node_expansion_request(self, mock_execute, mock_validate):
        """Test that the receive_node_expansion_request function correctly processes requests."""
        # Setup mock return values
        mock_validate.return_value = ([], EdgeDirection.OUTGOING)
        mock_execute.return_value = {
            "response": {
                "nodes": [],
                "edges": []
            }
        }

        # Create request and params objects
        request = {
            "uid": "node-123",
            "node_labels": ["Person"],
            "node_properties": [
                {"key": "id", "value": "123", "type": "INT64"}
            ],
            "direction": "OUTGOING",
            "edge_label": "CONNECTS_TO"
        }

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test_graph",
            "mock": False
        })

        # Call the function
        result = receive_node_expansion_request(request, params)

        # Verify execute_node_expansion was called with correct parameters
        mock_execute.assert_called_once_with(params, request)

        # Verify the result is wrapped in JSON
        self.assertEqual(result.data, mock_execute.return_value)

    @patch('spanner_graphs.magics.validate_node_expansion_request')
    @patch('spanner_graphs.magics.execute_node_expansion')
    def test_receive_node_expansion_request_without_edge_label(self, mock_execute, mock_validate):
        """Test that the receive_node_expansion_request function correctly handles missing edge_label."""
        # Setup mock return values
        mock_validate.return_value = ([], EdgeDirection.OUTGOING)
        mock_execute.return_value = {
            "response": {
                "nodes": [],
                "edges": []
            }
        }

        # Create request without edge_label and params objects
        request = {
            "uid": "node-123",
            "node_labels": ["Person"],
            "node_properties": [
                {"key": "id", "value": "123", "type": "INT64"}
            ],
            "direction": "OUTGOING"
            # No edge_label
        }

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test_graph",
            "mock": False
        })

        # Call the function
        result = receive_node_expansion_request(request, params)

        # Verify execute_node_expansion was called with correct parameters
        mock_execute.assert_called_once_with(params, request)

        # Verify the result is wrapped in JSON
        self.assertEqual(result.data, mock_execute.return_value)

    @patch('spanner_graphs.magics.validate_node_expansion_request')
    def test_invalid_property_type(self, mock_validate):
        """Test that invalid property types are correctly caught."""
        # Set up the mock to raise a ValueError when called with invalid data
        mock_validate.side_effect = ValueError("Invalid property type")

        # Create a request with invalid property type
        request = {
            "uid": "node-123",
            "node_labels": ["Person"],
            "node_properties": [
                {"key": "id", "value": "123", "type": "INVALID_TYPE"}
            ],
            "direction": "OUTGOING"
        }

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test_graph",
            "mock": False
        })

        # Call the function and verify it returns an error response
        result = receive_node_expansion_request(request, params)
        self.assertIn("error", result.data)

    @patch('spanner_graphs.magics.validate_node_expansion_request')
    def test_invalid_direction(self, mock_validate):
        """Test that invalid directions are correctly caught."""
        # Set up the mock to raise a ValueError when called with invalid data
        mock_validate.side_effect = ValueError("Invalid direction")

        # Create a request with invalid direction
        request = {
            "uid": "node-123",
            "node_labels": ["Person"],
            "node_properties": [
                {"key": "id", "value": "123", "type": "INT64"}
            ],
            "direction": "INVALID_DIRECTION"
        }

        params = json.dumps({
            "project": "test-project",
            "instance": "test-instance",
            "database": "test-database",
            "graph": "test_graph",
            "mock": False
        })

        # Call the function and verify it returns an error response
        result = receive_node_expansion_request(request, params)
        self.assertIn("error", result.data)

if __name__ == '__main__':
    unittest.main()
