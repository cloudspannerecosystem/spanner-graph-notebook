import unittest
from unittest.mock import MagicMock, patch
from IPython.core.interactiveshell import InteractiveShell
from spanner_graphs.graph_server import GraphServer
from spanner_graphs.magics import NetworkVisualizationMagics, load_ipython_extension
from spanner_graphs.database import DatabaseSelector

class TestNetworkVisualizationMagics(unittest.TestCase):
    def setUp(self):
        # Create a proper IPython shell instance for testing
        self.ip = InteractiveShell()

        # Initialize our magic class
        self.magics = NetworkVisualizationMagics(self.ip)
        self.magics.selector = None # Initialize selector

    @classmethod
    def tearDownClass(cls):
        """
        This method is called once after all tests in this class have run.
        We explicitly call the server's stop method to ensure a clean shutdown,
        as the atexit hook is not reliable in a unittest context.
        """
        print("\nShutting down the graph server for unittest...")
        GraphServer.stop_server()

    def test_magic_registration(self):
        """Test that the magic gets properly registered with IPython"""
        # Mock the IPython shell's register_magics method
        self.ip.register_magics = MagicMock()

        # Call the extension loader
        load_ipython_extension(self.ip)

        # Verify the magic was registered
        self.ip.register_magics.assert_called_once_with(NetworkVisualizationMagics)

    @patch('spanner_graphs.magics.get_database_instance')
    @patch('spanner_graphs.magics.generate_visualization_html')
    def test_spanner_graph_magic_with_cloud_args(self, mock_generate_html, mock_db):
        """Test the %%spanner_graph magic with valid cloud arguments"""
        # Setup mock database
        mock_db.return_value = MagicMock()
        mock_generate_html.return_value = "<html></html>"

        # Test line with valid arguments
        line = "--project test_project --instance test_instance --database test_db"
        cell = "SELECT * FROM test_table"

        # Execute the magic
        self.magics.spanner_graph(line, cell)

        # Verify database was initialized with correct parameters
        expected_selector = DatabaseSelector.cloud("test_project", "test_instance", "test_db")
        mock_db.assert_called_once_with(expected_selector)
        self.assertEqual(self.magics.selector, expected_selector)

        # Verify display was called (exact HTML content verification would be complex)
        mock_generate_html.assert_called_once()

    @patch('spanner_graphs.magics.get_database_instance')
    @patch('spanner_graphs.magics.generate_visualization_html')
    def test_spanner_graph_magic_with_mock_args(self, mock_generate_html, mock_db):
        """Test the %%spanner_graph magic with mock arguments"""
        # Setup mock database
        mock_db.return_value = MagicMock()
        mock_generate_html.return_value = "<html></html>"

        # Test line with valid arguments
        line = "--mock"
        cell = "SELECT * FROM test_table"

        # Execute the magic
        self.magics.spanner_graph(line, cell)

        # Verify database was initialized with correct parameters
        expected_selector = DatabaseSelector.mock()
        mock_db.assert_called_once_with(expected_selector)
        self.assertEqual(self.magics.selector, expected_selector)

        # Verify display was called (exact HTML content verification would be complex)
        mock_generate_html.assert_called_once()

    def test_spanner_graph_magic_with_invalid_args(self):
        """Test the %%spanner_graph magic with invalid arguments"""
        # Test with missing required arguments for cloud
        line = "--project test_project --database test_db"  # Missing instance
        cell = "SELECT * FROM test_table"

        # Execute the magic and capture output
        with patch('builtins.print') as mock_print:
            self.magics.spanner_graph(line, cell)

            # Verify error message was printed
            mock_print.assert_any_call(
                "Error: Please provide `--project` and `--instance` for Cloud Spanner."
            )

    def test_spanner_graph_magic_with_empty_cell(self):
        """Test the %%spanner_graph magic with empty cell content"""
        line = "--project test_project --instance test_instance --database test_db"
        cell = ""  # Empty cell content

        # Execute the magic and capture output
        with patch('builtins.print') as mock_print:
            self.magics.spanner_graph(line, cell)

            # Verify error message was printed
            mock_print.assert_any_call(
                "Error: Query is required."
            )

    @patch('spanner_graphs.magics.get_database_instance')
    @patch('spanner_graphs.magics.generate_visualization_html')
    def test_spanner_graph_magic_with_omni_args(self, mock_generate_html, mock_db):
        """Test the %%spanner_graph magic with Spanner Omni arguments"""
        mock_db.return_value = MagicMock()
        mock_generate_html.return_value = "<html></html>"

        line = "--instance_type omni --endpoint localhost:9010 --database test_db --use_plain_text"
        cell = "GRAPH FinGraph MATCH (n) RETURN n"

        self.magics.spanner_graph(line, cell)

        expected_selector = DatabaseSelector.omni(
            endpoint="localhost:9010",
            database="test_db",
            use_plain_text=True,
            instance_type="omni",
        )
        mock_db.assert_called_once_with(expected_selector)
        self.assertEqual(self.magics.selector, expected_selector)
        mock_generate_html.assert_called_once()

    @patch('spanner_graphs.magics.get_database_instance')
    @patch('spanner_graphs.magics.generate_visualization_html')
    def test_spanner_graph_magic_with_deprecated_experimental_host(self, mock_generate_html, mock_db):
        """Test the %%spanner_graph magic with deprecated experimental_host argument"""
        mock_db.return_value = MagicMock()
        mock_generate_html.return_value = "<html></html>"

        line = "--experimental_host localhost:9010 --database test_db --use_plain_text"
        cell = "GRAPH FinGraph MATCH (n) RETURN n"

        with self.assertWarns(DeprecationWarning):
            self.magics.spanner_graph(line, cell)

        expected_selector = DatabaseSelector.omni(
            endpoint="localhost:9010",
            database="test_db",
            use_plain_text=True,
        )
        mock_db.assert_called_once_with(expected_selector)
        self.assertEqual(self.magics.selector, expected_selector)
        mock_generate_html.assert_called_once()

    @patch('spanner_graphs.magics.get_database_instance')
    @patch('spanner_graphs.magics.generate_visualization_html')
    def test_spanner_graph_magic_with_cloud_endpoint_args(self, mock_generate_html, mock_db):
        """Test the %%spanner_graph magic with cloud and custom endpoint"""
        mock_db.return_value = MagicMock()
        mock_generate_html.return_value = "<html></html>"

        line = "--project test_proj --instance test_inst --database test_db --endpoint custom.spanner.endpoint:443"
        cell = "SELECT * FROM test_table"

        self.magics.spanner_graph(line, cell)

        expected_selector = DatabaseSelector.cloud("test_proj", "test_inst", "test_db", endpoint="custom.spanner.endpoint:443")
        mock_db.assert_called_once_with(expected_selector)
        self.assertEqual(self.magics.selector, expected_selector)
        mock_generate_html.assert_called_once()

    def test_spanner_graph_magic_with_security_flags_without_omni(self):
        """Test error when security flags are provided without Omni instance_type"""
        line = "--project test_proj --instance test_inst --database test_db --use_plain_text"
        cell = "SELECT * FROM test_table"

        with patch('builtins.print') as mock_print:
            self.magics.spanner_graph(line, cell)
            mock_print.assert_any_call(
                "Error: use_plain_text, ca_certificate, client_certificate and client_key are only supported for Spanner Omni"
            )


if __name__ == '__main__':
    unittest.main()
