# Copyright 2024 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from IPython.display import display
from IPython.core.display import HTML
import os

class FileHandler:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    @staticmethod
    def show_loader(message="Loading..."):
        try:
            path = os.path.join(FileHandler.BASE_DIR, "..", "frontend", "static", "loader.html")
            with open(path, "r") as file:
                html_template = file.read()

            loader_text = html_template.replace("{{message}}", message)

            display(HTML(loader_text))
        except Exception as e:
            print(f"Error loading loader HTML: {e}")

    @staticmethod
    def load_js(path: list[str]) -> str:
        file_path = os.path.join(FileHandler.BASE_DIR, "..", *path)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"JS file not found: {file_path}")

        with open(file_path, 'r') as file:
            return file.read()

    @staticmethod
    def hide_loader() -> str:
        return FileHandler.load_js(["frontend", "src", "loader.js"])
