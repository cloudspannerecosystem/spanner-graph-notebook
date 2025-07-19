import unittest
from unittest.mock import MagicMock, patch, ANY
from IPython.core.interactiveshell import InteractiveShell
from spanner_graphs.graph_server import GraphServer
from spanner_graphs.magics import NetworkVisualizationMagics, load_ipython_extension
from IPython.core.display import HTML

class TestNetworkVisualizationMagics(unittest.TestCase):
    def setUp(self):
        # Create a proper IPython shell instance for testing
        self.ip = InteractiveShell()

        # Initialize our magic class
        self.magics = NetworkVisualizationMagics(self.ip)

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
    @patch('spanner_graphs.magics.GraphServer')
    @patch('spanner_graphs.magics.display')
    def test_spanner_graph_magic_with_valid_args(self, mock_display, mock_server, mock_db):
        """Test the %%spanner_graph magic with valid arguments"""
        # Setup mock database
        mock_db.return_value = MagicMock()

        # Setup mock server
        mock_server.port = 8080

        # Test line with valid arguments
        line = "--project test_project --instance test_instance --database test_db"
        cell = "SELECT * FROM test_table"

        # Execute the magic
        result = self.magics.spanner_graph(line, cell)

        # Verify database was initialized with correct parameters
        mock_db.assert_called_once_with(
            "test_project",
            "test_instance",
            "test_db",
            mock=False
        )

        # Verify display was called (exact HTML content verification would be complex)
        mock_display.assert_called_once()

    def test_spanner_graph_magic_with_invalid_args(self):
        """Test the %%spanner_graph magic with invalid arguments"""
        # Test with missing required arguments
        line = "--project test_project"  # Missing instance and database
        cell = "SELECT * FROM test_table"

        # Execute the magic and capture output
        with patch('builtins.print') as mock_print:
            self.magics.spanner_graph(line, cell)

            # Verify error message was printed
            mock_print.assert_any_call(
                "Error: Please provide `--project`, `--instance`, "
                "and `--database` values for your query."
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
    @patch('spanner_graphs.magics.GraphServer')
    @patch('spanner_graphs.magics.display')
    def test_spanner_graph_with_cell_magic(self, mock_display, mock_server, mock_db):
        cell_content = "SELECT * FROM some_table"

        self.magics.spanner_graph("", cell_content)

        self.assertTrue(any(isinstance(call.args[0], HTML) for call in mock_display.call_args_list),
                        "Expected display to be called with an HTML object")

        self.assertEqual(self.magics.args.project, "")
        self.assertEqual(self.magics.args.instance, "")
        self.assertEqual(self.magics.args.database, "")

    @patch('spanner_graphs.magics.display')
    @patch('spanner_graphs.magics.FileHandler')
    @patch('spanner_graphs.magics.GcpHelper')
    def test_spanner_graph_with_line_magic(self, mock_gcp, mock_filehandler, mock_display):
        mock_gcp.get_default_credentials_with_project.return_value = "fake_credentials"
        mock_gcp.fetch_gcp_projects.return_value = {"proj1": "Project 1"}

        self.magics.spanner_graph("", None)

        mock_filehandler.show_loader.assert_called_once()
        mock_filehandler.hide_loader.assert_called_once()

if __name__ == '__main__':
    unittest.main()
