# Copyright 2025 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Magic class for our visualization"""

import base64
import uuid
import os

from jinja2 import Template

def _load_file(path: list[str]) -> str:
        file_path = os.path.sep.join(path)
        if not os.path.exists(file_path):
                raise FileNotFoundError(f"Template file not found: {file_path}")

        with open(file_path, 'r') as file:
                content = file.read()

        return content

def _load_image(path: list[str]) -> str:
    file_path = os.path.sep.join(path)
    if not os.path.exists(file_path):
        print("image does not exist")
        return ''

    if file_path.lower().endswith('.svg'):
        with open(file_path, 'r') as file:
            svg = file.read()
            return base64.b64encode(svg.encode('utf-8')).decode('utf-8')
    else:
        with open(file_path, 'rb') as file:
            return base64.b64decode(file.read()).decode('utf-8')

def generate_visualization_html(query: str, port: int, params: str):
        # Get the directory of the current file (magics.py)
        current_dir = os.path.dirname(os.path.abspath(__file__))

        # Go up directories until we find the 'templates' folder
        search_dir = current_dir
        while 'frontend' not in os.listdir(search_dir):
            parent = os.path.dirname(search_dir)
            if parent == search_dir:  # We've reached the root directory after I updated
                raise FileNotFoundError("Could not find 'frontend' directory")
            search_dir = parent

        # Retrieve the javascript content
        template_content = _load_file([search_dir, 'frontend', 'static', 'index.html'])
        schema_content = _load_file([search_dir, 'frontend', 'src', 'models', 'schema.js'])
        graph_object_content = _load_file([search_dir, 'frontend', 'src', 'models', 'graph-object.js'])
        node_content = _load_file([search_dir, 'frontend', 'src', 'models', 'node.js'])
        edge_content = _load_file([search_dir, 'frontend', 'src', 'models', 'edge.js'])
        config_content = _load_file([search_dir, 'frontend', 'src', 'spanner-config.js'])
        store_content = _load_file([search_dir, 'frontend', 'src', 'spanner-store.js'])
        menu_content = _load_file([search_dir, 'frontend', 'src', 'visualization', 'spanner-menu.js'])
        graph_content = _load_file([search_dir, 'frontend', 'src', 'visualization', 'spanner-forcegraph.js'])
        sidebar_content = _load_file([search_dir, 'frontend', 'src', 'visualization', 'spanner-sidebar.js'])
        table_content = _load_file([search_dir, 'frontend', 'src', 'visualization', 'spanner-table.js'])
        server_content = _load_file([search_dir, 'frontend', 'src', 'graph-server.js'])
        app_content = _load_file([search_dir, 'frontend', 'src', 'app.js'])

        # Retrieve image content
        graph_background_image = _load_image([search_dir, "frontend", "static", "graph-bg.svg"])

        # Create a Jinja2 template
        template = Template(template_content)

        # Render the template with the graph data and JavaScript content
        html_content = template.render(
            graph_background_image=graph_background_image,
            template_content=template_content,
            schema_content=schema_content,
            graph_object_content=graph_object_content,
            node_content=node_content,
            edge_content=edge_content,
            config_content=config_content,
            menu_content=menu_content,
            graph_content=graph_content,
            store_content=store_content,
            sidebar_content=sidebar_content,
            table_content=table_content,
            server_content=server_content,
            app_content=app_content,
            query=query,
            params=params,
            port=port,
            id=uuid.uuid4().hex # Prevent html/js selector collisions between cells
        )

        return html_content
