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

"""
This module contains implementation to convert columns from
a database column into usable data for building a graph
"""

from __future__ import annotations
from typing import Any, List, Dict, Set, Tuple
import json
from enum import Enum, auto

from google.cloud.spanner_v1.types import TypeCode, StructType
import numpy as np
import networkx as nx

from spanner_graphs.graph_entities import Node, Edge
from spanner_graphs.schema_manager import SchemaManager


# Sizing rule for the nodes
class SizeMode(Enum):
    STATIC = auto()
    CARDINALITY = auto()
    PROPERTY = auto()

    def __str__(self):
        return self.name.lower()

    @classmethod
    def from_string(cls, s: str):
        try:
            return cls[s.upper()]
        except KeyError:
            raise ValueError(f"'{s}' is not a valid {cls.__name__}")


#  Map spanner TypeCode to numpy types
_TYPE_CODE_MAP = {
    TypeCode.JSON: np.object_,
    TypeCode.ARRAY: np.object_,
}

NODE_DEGREE = "value"


def _column_to_native_numpy(column: List[Any],
                            datatype: TypeCode,
                            array_type: TypeCode = None) -> np.ndarray:
    """Convert Spanner column (list) to a numpy array, with appropriate dtype.

    Args:
        column: List of Spanner column values
        datatype: TypeCode representing the type of all values in `column`
        array_type: If `datatype == Typecode.ARRAY`, the type of the values
                    store inside each array.

    Returns:
        np.ndarray of the values in `column`

    Raises:
        ValueError: If any of the fields contain unsupported types.
    """
    if datatype == TypeCode.JSON:
        flattenned_data = []

        for x in column:
            if isinstance(x, list):
                flattenned_data.extend(x)
            elif isinstance(x, dict):
                array_value = getattr(x, '_array_value', None)
                if array_value is not None:
                    flattenned_data.extend(array_value)
                else:
                    flattenned_data.append(x)
            else:
                flattenned_data.append(json.loads(x))

        return np.array(
            flattenned_data,
            dtype=_TYPE_CODE_MAP[datatype],
        )

    if datatype == TypeCode.ARRAY:
        if array_type == TypeCode.JSON:
            return np.array(
                [
                    np.array(
                        [
                            y if isinstance(y, dict) else json.loads(y)
                            for y in x
                        ],
                        dtype=_TYPE_CODE_MAP[array_type],
                    ) for x in column
                ],
                dtype=_TYPE_CODE_MAP[datatype],
            )

    raise ValueError(
        f"Only JSON and array of JSON are allowed, got type: {datatype.name}")


def columns_to_native_numpy(
        data: Dict[str, List[Any]], fields: List[StructType.Field]
) -> Tuple[Dict[str, np.ndarray], List[str]]:
    """Cast values in all columns to corresponding typed Numpy arrays.

    Args:
        data: dict whose values are all lists of the same length
        fields: One entry per column `data`, column name should
                match the key in `data` and column type should match
                the desired type of values in the corresponding list in `data`

    Returns:
        Tuple[Dict[str, np.ndarray], List[str]]: A tuple containing a dict with
        the same shape and keys as `data`, but with columns converted to
        `np.array`s with a `dtype` based on the type in `fields`.
        It also returns the list of ignored_columns that do not match the
        supported json or array of json types.
    """
    output = {}
    ignored_columns = []

    for field in fields:
        try:
            column_name = field.name
            if field.type_.code == TypeCode.JSON or (
                    field.type_.code == TypeCode.ARRAY
                    and field.type_.array_element_type == TypeCode.JSON):
                output[column_name] = _column_to_native_numpy(
                    data[column_name],
                    field.type_.code,
                    (field.type_.array_element_type
                     if field.type_.array_element_type else None),
                )
            else:
                # Log the column name that does not match our expectation
                ignored_columns.append(field.name)
        except ValueError:
            # We simply advance to the next, we return any valid
            # that we need for our purpose.
            # When no data matches our expectation, `len(output) == 0`
            pass

    return output, ignored_columns


def prepare_data_for_graphing(
        incoming: Dict[str, np.ndarray],
        schema_json: dict = None,
        apply_sort=False,
        size_mode: SizeMode = SizeMode.CARDINALITY,
        size_property: str = None,
        node_display_props: dict[str, str] = None,
        edge_display_props: dict[str, str] = None) -> nx.DiGraph:
    """
    Prepare the output from column conversions which may contain duplicates
    by using a `set` and also ensuring both JSON and Array of JSON values
    are flattened, returning a single list of json data.

    Args:
        incoming: A dictionay of str to np.ndarray values, where each np.ndarray
            values may be a nested array.
        schema_json: The property graph metadata JSON schema.
        apply_sort: A boolean that tells if the data should be sorted before
            the output graph is generated for deterministic output.
        size_mode: A SizeMode enum indicating the rule for sizing the nodes
        node_display_props: A dictionary that maps from label type
            to property to display for nodes.
        edge_display_props: A dictionary that maps from label type
            to property to display for edges.
    Returns:
        A networkx graph with all nodes and edges add from the
        deduplicated input
    """

    schema_manager = SchemaManager(schema_json)
    unique_items: Set[str] = set()

    for column in incoming.values():
        for item in column:
            if isinstance(item, np.ndarray):  # Flatten array of JSON
                for sub_item in item:
                    unique_items.add(json.dumps(sub_item))
            else:
                unique_items.add(json.dumps(item))

    unique_json_list = [json.loads(item) for item in unique_items]
    if apply_sort:
        unique_json_list = sorted(
            unique_json_list,
            key=lambda x: (
                x["kind"],
                x.get("identifier", x.get("source_node_identifier", "")),
            ),
        )

    g = nx.MultiDiGraph()

    node_mapping = {}
    edge_counter = 1

    for item in unique_json_list:
        if "kind" not in item:
            continue
        if item["kind"] != "node":
            continue

        if not Node.is_valid_node_json(item):
            continue

        node = Node.from_json(item)
        node.key_property_names = schema_manager.get_key_property_names(node)
        if node.identifier not in node_mapping:
            node_mapping[node.identifier] = len(node_mapping) + 1
        node.add_to_graph(g, node_mapping)

        if size_mode == SizeMode.PROPERTY:
            if size_property is None:
                raise ValueError(
                    "size_property must be specified when using SizeMode.PROPERTY"
                )

            value = node.properties.get(size_property)
            if value is not None:
                try:
                    numeric_value = float(value)
                    g.nodes[node_mapping[
                        node.identifier]][NODE_DEGREE] = numeric_value
                except ValueError:
                    print(
                        f"Warning: Property '{size_property}' for node {node.identifier} is not numeric. Using default size."
                    )
            else:
                print(
                    f"Warning: Property '{size_property}' not found for node {node.identifier}. Using default size."
                )

    # Second pass to find source and destination nodes
    # from edge data. They may not be added to the graph in the
    # first pass node calculation above.
    for item in unique_json_list:
        if "kind" not in item:
            continue
        if item["kind"] != "edge":
            continue

        if not Edge.is_valid_edge_json(item):
            continue
        edge = Edge.from_json(item)
        if edge.source not in node_mapping:
            src_id = len(node_mapping) + 1
            node_mapping[edge.source] = src_id
            src_node = Node(edge.source, [], {"id": src_id})
            src_node.add_to_graph(g, node_mapping)
        if edge.destination not in node_mapping:
            dst_id = len(node_mapping) + 1
            node_mapping[edge.destination] = dst_id
            dst_node = Node(edge.destination, [], {"id": dst_id})
            dst_node.add_to_graph(g, node_mapping)

    for item in unique_json_list:
        if "kind" not in item:
            continue
        if item["kind"] != "edge":
            continue

        if not Edge.is_valid_edge_json(item):
            continue

        edge = Edge.from_json(item)
        numerical_id = (len(node_mapping) + 1) + edge_counter
        edge_counter += 1
        edge.add_to_graph(g, node_mapping, numerical_id)

    if size_mode == SizeMode.CARDINALITY:
        # Calculate the in-degree and out-degree using NetworkX functions
        in_degrees = dict(g.in_degree())
        out_degress = dict(g.out_degree())

        for node_id in g.nodes():
            node_size = in_degrees[node_id] + out_degress[node_id]
            g.nodes[node_id][NODE_DEGREE] = node_size

    return g
