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

        template_content = _load_file([search_dir, 'frontend', 'static', 'jupyter.html'])
        
        # Load the JavaScript bundle directly
        js_file_path = os.path.join(search_dir, 'third_party', 'index.js')
        try:
            with open(js_file_path, 'r', encoding='utf-8') as js_file:
                bundled_js_code = f'<script>{js_file.read()}</script>'
        except FileNotFoundError:
            # If the bundle doesn't exist, provide a helpful error message
            bundled_js_code = '<script>console.error("JavaScript bundle not found. Please run `cd frontend && npm run build` to generate it.");</script>'

        # Retrieve image content
        graph_background_image = _load_image([search_dir, "frontend", "static", "graph-bg.svg"])

        # Create a Jinja2 template
        template = Template(template_content)

        # Render the template with the graph data and JavaScript content
        html_content = template.render(
            graph_background_image=graph_background_image,
            bundled_js_code=bundled_js_code,  # Pass the actual JS code instead of the path
            query=query,
            params=params,
            port=port,
            id=uuid.uuid4().hex # Prevent html/js selector collisions between cells
        )

        return html_content
