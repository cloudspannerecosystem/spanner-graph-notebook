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

"""Setup tools"""

import os
from setuptools import setup, find_packages

def package_files(directory):
    paths = []
    for (path, directories, filenames) in os.walk(directory):
        for filename in filenames:
            paths.append(os.path.join('..', path, filename))
    return paths

extra_files_assets = package_files('assets')
extra_files_frontend = package_files('frontend')
extra_files_third_party = package_files('third_party')

with open("README.md", "r") as fh:
    long_description = fh.read()

setup(
    name="spanner-graph-notebook",
    version="v1.1.8",
    packages=find_packages(),
    install_requires=[
        "networkx", "numpy", "google-cloud-spanner", "ipython",
        "ipywidgets", "notebook", "requests", "portpicker",
        "pydata-google-auth"
    ],
    include_package_data=True,
    description='Visually query Spanner Graph data in notebooks.',
    long_description=long_description,
    long_description_content_type="text/markdown",
    package_data={
        "": extra_files_frontend + extra_files_assets + extra_files_third_party,
        "spanner_graphs": [
            "graph_mock_data.csv",
            "graph_mock_schema.json",
        ],
        "tests": [
            "test_notebook.json",
        ],
    },
    entry_points={
        "console_scripts": [],
    },
)
