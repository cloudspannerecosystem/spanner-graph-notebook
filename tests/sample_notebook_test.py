import unittest
import json
from unittest.mock import MagicMock, patch
from IPython.core.interactiveshell import InteractiveShell
from spanner_graphs.graph_server import GraphServer
from spanner_graphs.magics import NetworkVisualizationMagics, load_ipython_extension
from spanner_graphs.database import DatabaseSelector

class TestSampleNotebook(unittest.TestCase):
    def setUp(self):
        # Create a proper IPython shell instance for testing
        self.ip = InteractiveShell()

        # Initialize our magic class
        self.magics = NetworkVisualizationMagics(self.ip)
        self.magics.selector = None

        # Load the notebook content
        with open('sample.ipynb', 'r') as f:
            self.notebook = json.load(f)

        # Extract all code cells
        self.code_cells = [cell for cell in self.notebook['cells']
                          if cell['cell_type'] == 'code']

    @classmethod
    def tearDownClass(cls):
        """
        This method is called once after all tests in this class have run.
        We explicitly call the server's stop method to ensure a clean shutdown,
        as the atexit hook is not reliable in a unittest context.
        """
        print("\nShutting down the graph server for unittest...")
        GraphServer.stop_server()

    def test_notebook_cells(self):
        """Test all code cells from sample.ipynb"""
        # First cell should be pip install (optional)
        self.assertEqual(
            self.code_cells[0]['source'],
            ['!pip install spanner-graph-notebook']
        )

        # Second cell should be loading the extension
        self.assertEqual(
            self.code_cells[1]['source'],
            ['%load_ext spanner_graphs']
        )

        # Test loading the extension
        with patch.object(self.ip, 'register_magics') as mock_register:
            self.ip.run_line_magic('load_ext', 'spanner_graphs')
            mock_register.assert_called_with(NetworkVisualizationMagics)

        # Third cell should be mock visualization
        mock_cell = self.code_cells[2]
        self.assertEqual(
            mock_cell['source'],
            ['%%spanner_graph --mock\n', '\n']
        )

        # Test the mock visualization with mocked dependencies
        with patch('spanner_graphs.magics.get_database_instance') as mock_db, \
             patch('spanner_graphs.magics.generate_visualization_html') as mock_generate_html:

            mock_db.return_value = MagicMock()
            mock_generate_html.return_value = "<html></html>"

            # Test with a valid query since empty cell is handled by IPython
            line = '--mock'
            cell = 'GRAPH FinGraph\nMATCH p = (a)-[e]->(b)\nRETURN TO_JSON(p) AS path\nLIMIT 100'

            # Execute the magic with a valid query
            self.magics.spanner_graph(line, cell)

            # Verify database was initialized with mock=True
            expected_selector = DatabaseSelector.mock()
            mock_db.assert_called_once_with(expected_selector)

            # Verify display was called
            mock_generate_html.assert_called_once()

        # Fourth cell should be the Spanner Graph query
        query_cell = self.code_cells[3]
        expected_source = [
            '%%spanner_graph --project {project_id} --instance {instance_name} --database {database_name}\n',
            '\n',
            'GRAPH FinGraph\n',
            'MATCH p = (a)-[e]->(b)\n',
            'RETURN TO_JSON(p) AS path\n',
            'LIMIT 100'
        ]
        self.assertEqual(query_cell['source'], expected_source)

        # Test the query with mocked dependencies
        with patch('spanner_graphs.magics.get_database_instance') as mock_db, \
             patch('spanner_graphs.magics.generate_visualization_html') as mock_generate_html:

            mock_db.return_value = MagicMock()
            mock_generate_html.return_value = "<html></html>"

            # Extract the actual line and cell content from the notebook
            line = next(line for line in query_cell['source'] if line.startswith('%%spanner_graph')).replace('%%spanner_graph ', '')
            cell = ''.join(line for line in query_cell['source'] if not line.startswith('%%spanner_graph'))

            # Execute the magic with the actual notebook content
            self.magics.spanner_graph(line, cell)

            # Verify database was initialized with placeholder values
            expected_selector = DatabaseSelector.cloud(
                "{project_id}",
                "{instance_name}",
                "{database_name}"
            )
            mock_db.assert_called_once_with(expected_selector)

            # Verify display was called
            mock_generate_html.assert_called_once()

if __name__ == '__main__':
    unittest.main()
