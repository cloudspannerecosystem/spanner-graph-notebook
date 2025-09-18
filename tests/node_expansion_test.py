import unittest
from unittest.mock import patch, MagicMock
import json

from spanner_graphs.magics import receive_node_expansion_request
from spanner_graphs.graph_server import EdgeDirection
from spanner_graphs.database import DatabaseSelector, SpannerEnv

class TestNodeExpansion(unittest.TestCase):
    def setUp(self):
        self.sample_request = {
            "uid": "node-123",
            "node_labels": ["Person"],
            "node_properties": [
                {"key": "id", "value": "123", "type": "INT64"}
            ],
            "direction": "OUTGOING",
            "edge_label": "CONNECTS_TO"
        }
        # Updated params to use DatabaseSelector structure
        self.sample_params = json.dumps({
            "selector": {
                "env": str(SpannerEnv.CLOUD),
                "project": "test-project",
                "instance": "test-instance",
                "database": "test-database",
                "infra_db_path": None
            },
            "graph": "test_graph",
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

        # Call the function
        result = receive_node_expansion_request(self.sample_request, self.sample_params)

        # Verify execute_node_expansion was called with correct parameters
        params_dict = json.loads(self.sample_params)
        mock_execute.assert_called_once_with(
            selector_dict=params_dict["selector"],
            graph=params_dict["graph"],
            request=self.sample_request
        )

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

        # Create request without edge_label
        request = self.sample_request.copy()
        del request["edge_label"]

        # Call the function
        result = receive_node_expansion_request(request, self.sample_params)

        # Verify execute_node_expansion was called with correct parameters
        params_dict = json.loads(self.sample_params)
        mock_execute.assert_called_once_with(
            selector_dict=params_dict["selector"],
            graph=params_dict["graph"],
            request=request
        )

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

        # Call the function and verify it returns an error response
        result = receive_node_expansion_request(request, self.sample_params)
        self.assertIn("error", result.data)
        self.assertIn("Invalid property type", result.data["error"])

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

        # Call the function and verify it returns an error response
        result = receive_node_expansion_request(request, self.sample_params)
        self.assertIn("error", result.data)
        self.assertIn("Invalid direction", result.data["error"])

if __name__ == '__main__':
    unittest.main()
