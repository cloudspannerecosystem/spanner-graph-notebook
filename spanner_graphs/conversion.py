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

"""
This module contains implementation to convert columns from
a database column into usable data for building a graph
"""

from __future__ import annotations
from typing import Any, List, Dict, Tuple
import json

from google.cloud.spanner_v1.types import TypeCode, StructType

from spanner_graphs.graph_entities import Node, Edge
from spanner_graphs.schema_manager import SchemaManager

def get_nodes_edges(data: Dict[str, List[Any]], fields: List[StructType.Field], schema_json: dict = None) -> Tuple[List[Node], List[Edge]]:
    schema_manager = SchemaManager(schema_json)
    nodes: List[Node] = []
    edges: List[Edge] = []
    node_identifiers = set()  # Track unique node identifiers

    # Process each column in the data
    for field in fields:
        column_name = field.name
        column_data = data[column_name]
        
        # Only process JSON and Array of JSON types
        if field.type_.code not in [TypeCode.JSON, TypeCode.ARRAY]:
            continue

        # Process each value in the column
        for value in column_data:
            items_to_process = []
            
            # Handle both single JSON and arrays of JSON
            if isinstance(value, list):
                items_to_process.extend(value)
            elif hasattr(value, '_array_value'):
                items_to_process.extend(value._array_value)
            else:
                # Single JSON value
                if isinstance(value, dict):
                    items_to_process.append(value)
                elif isinstance(value, str):
                    try:
                        items_to_process.append(json.loads(value))
                    except json.JSONDecodeError:
                        continue

            # Process each item
            for item in items_to_process:
                if not isinstance(item, dict) or "kind" not in item:
                    continue

                if item["kind"] == "node" and Node.is_valid_node_json(item):
                    node = Node.from_json(item)
                    if node.identifier not in node_identifiers:
                        node.key_property_names = schema_manager.get_key_property_names(node)
                        nodes.append(node)
                        node_identifiers.add(node.identifier)

                elif item["kind"] == "edge" and Edge.is_valid_edge_json(item):
                    edge = Edge.from_json(item)
                    edges.append(edge)

    return nodes, edges