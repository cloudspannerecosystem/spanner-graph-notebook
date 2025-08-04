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

from spanner_graphs.database import SpannerFieldInfo
from spanner_graphs.graph_entities import Node, Edge
from spanner_graphs.schema_manager import SchemaManager

def get_nodes_edges(data: Dict[str, List[Any]], fields: List[SpannerFieldInfo],
                    schema_json: dict = None) -> Tuple[List[Node], List[Edge]]:
    """Retrieves the nodes and edges for query results, in the form expected by the Javascript code.

    WARNING: This function is not only used for graph visualization in Spanner, but also BigQuery.
    Currently, infrastructure is set up to only run the Spanner tests, so, when changing this function,
    you will need to test bigquery manually.

    Instructions:
      $ TODO

    Args:
        data: A dictionary associating the name of each column with a list of values for that
            column at each row. The representation of row values depends on the column type. See
            the `fields` argument for details.
        fields: A list of database.SpannerFieldInfo objects specifying the name and type
            of each in the query result. This list must contain exactly one item per dictionary
            entry in `data`, with each list item set as follow:
            - `name` is the name of the column. This must match exactly a dictionary key in `data`.
            - `typename` specifies the type of the column, which determines how row values for this
                column are represented in `data[name]`. Possible `typename` values are as follows:
                - "JSON":
                    Indicates that the column is SQL type `JSON`. Each row value in `data` is a
                    dictionary associating JSON field names with their corresponding field values,
                    normally the result of `json.loads()`. To be supported for visualization, the JSON
                    schema must result in the following fields being present in the dictionary:
                        - "kind": 'node' or 'edge', depending on whether the object represents a node or edge.
                        - "identifier": A string representing a unique identifier for the node or edge.
                        - "labels" A list of strings representing labels associated with the node or edge.
                        - "properties": A dictionary specifying additional properties of the node or edge.
                        - "source_node_identifier": (edges only) Specifies `identifier` value for the
                                corresponding source node.
                        - "destination_node_identifier": (edges only) Specifies the `identifier` value for the
                                corresponding destination node.

                    See Node.is_valid_node_json() and Edge.is_valid_edge_json() for details.
                - "ARRAY":
                    Indicates that the column is SQL type `ARRAY<JSON>`. Each row value is a list
                    of JSON objects (see above for the expected content of each JSON object)
                - Anything else means that the column is not supported for visualization. (Passing in
                    unsupported columns is allowed, but such columns are exluded from the results).
        schema_json: An optional dictionary describing the graph schema. This may be None in the graph
            schema is unknown. Used as the constructor argument to be `SchemaManager` class; see SchemaManager
            for details.
            
    Returns:

    """
    schema_manager = SchemaManager(schema_json)
    nodes: List[Node] = []
    edges: List[Edge] = []
    node_identifiers = set()
    edge_identifiers = set()

    # Process each column in the data
    for field in fields:
        column_name = field.name
        column_data = data[column_name]

        # Only process JSON and Array of JSON types
        if field.typename not in ["JSON", "ARRAY"]:
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
                    if edge.identifier not in edge_identifiers:
                        edges.append(edge)
                        edge_identifiers.add(edge.identifier)

    # Create placeholder nodes for nodes that were not returned
    # from the query but are identified in the edges
    missing_node_identifiers = set()
    for edge in edges:
        if edge.source not in node_identifiers:
            missing_node_identifiers.add(edge.source)
        if edge.destination not in node_identifiers:
            missing_node_identifiers.add(edge.destination)

    for identifier in missing_node_identifiers:
        nodes.append(Node.make_intermediate(identifier))
        node_identifiers.add(identifier)

    return nodes, edges
