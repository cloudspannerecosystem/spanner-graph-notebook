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
This module defines the Node and Edge classes used to represent graph entities.
"""

from __future__ import annotations

import datetime
import json
from typing import Any, Dict, List
import networkx as nx
from numpy import number

reserved_colors: dict[str, str] = {}

palette = ['#cc7722', '#ffe5b4', '#dda0dd', '#fffacd', '#e6e6fa',
           '#d2b48c', '#6a5acd', '#ffe4e1', '#6495ed', '#4b4b4b',
           '#ace1af', '#808000', '#e6e6e6', '#9671e8', '#6b8e23',
           '#654321', '#b0e0e6', '#1e1e1e', '#c8c8c8', '#cd853f']

def format_value(key: str, value: Any) -> str:
    if value is None:
        return '<span style="color: #9CA3AF;">None</span>'

    if isinstance(value, bool):
        return '✅ <span style="font-family: monospace">true</span>' if value else '❌ <span style="font-family: monospace">false</span>'

    if isinstance(value, (int, float)):
        return f'<span style="font-family: monospace;">{value}</span>'

    if isinstance(value, list):
        return f'<span style="color: #4B5563;">[{", ".join(map(str, value))}]</span>'

    if isinstance(value, dict):
        json_str = json.dumps(value)
        preview = json_str[:20] + ('...' if len(json_str) > 20 else '')
        full_json = json.dumps(value, indent=2)
        return f'''
            <div onclick="toggleJson_{key}()" style="cursor: pointer;">
                <span id="jsonPreview_{key}" style="color: #4B5563;">{preview}</span>
                <span id="expandCollapseText_{key}" style="color: #3B82F6;"> (Click to expand)</span>
            </div>
            <div id="jsonContent_{key}" style="display: none; padding: 10px; background-color: #F3F4F6; border-radius: 4px; margin-top: 5px;">
                <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">{full_json}</pre>
            </div>
            <script>
            function toggleJson_{key}() {{
                var content = document.getElementById('jsonContent_{key}');
                var preview = document.getElementById('jsonPreview_{key}');
                var text = document.getElementById('expandCollapseText_{key}');
                if (content.style.display === 'none') {{
                    content.style.display = 'block';
                    preview.style.display = 'none';
                    text.innerHTML = ' (Click to collapse)';
                }} else {{
                    content.style.display = 'none';
                    preview.style.display = 'inline';
                    text.innerHTML = ' (Click to expand)';
                }}
            }}
            </script>
        '''

    if isinstance(value, str):
        if key.lower().endswith('id') or key.lower().startswith('id'):
            return f'<span style="font-family: monospace; background-color: #E5E7EB; padding: 2px 4px; border-radius: 4px;">{value}</span>'

        if '@' in value and '.' in value.split('@')[1]:
            return f'✉️ <a href="mailto:{value}" style="color: #3B82F6;">{value}</a>'

        if value.startswith(('http://', 'https://', 'www.')):
            return f'🔗 <a href="{value}" target="_blank" style="color: #3B82F6;">{value}</a>'

        try:
            date = datetime.datetime.fromisoformat(value)
            return f'🗓 {date.strftime("%Y-%m-%d %H:%M:%S")}'
        except ValueError:
            pass

    return str(value)

def generate_tooltip_html(title: str, properties: dict[str, any]) -> str:
    tooltip_html = f'''
    <div style="margin: -5px; font-family: Arial, sans-serif; width: 300px; background-color: #FFFFFF;">
        <div style="background-color: #3B82F6; color: #FFFFFF; padding: 10px;">
            <h3 style="margin: 0; font-size: 16px;">{title} Properties</h3>
        </div>
        <div style="padding: 10px;">
            <table style="width: 100%; border-collapse: collapse;">
    '''

    property_items = properties.items()
    if len(property_items) == 0:
        tooltip_html += f'''
                <tr>
                    <td style="padding: 8px; font-size: 12px; color: #374151; font-weight: 500;">No properties found</td>
                </tr>
        '''
    else:
        tooltip_html += f'''
                <tr style="background-color: #F3F4F6;">
                    <th style="text-align: left; padding: 8px; font-size: 12px; color: #4B5563;">Property</th>
                    <th style="text-align: left; padding: 8px; font-size: 12px; color: #4B5563;">Value</th>
                </tr>
        '''

    counter = 0
    for key, value in property_items:
        formatted_value = format_value(key, value)
        bg_color = '#FFFFFF' if counter % 2 == 0 else '#F9FAFB'
        tooltip_html += f'''
                <tr style="background-color: {bg_color}">
                    <td style="padding: 8px; font-size: 12px; color: #374151; font-weight: 500;">{key}</td>
                    <td style="padding: 8px; font-size: 12px; color: #374151; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">{formatted_value}</td>
                </tr>
        '''
        counter += 1

    tooltip_html += '''
            </table>
        </div>
    </div>
    '''

    return tooltip_html


class Node:
    """
    Represents a node in a graph.

    Attributes:
        identifier (str): The unique identifier for the node.
        labels (List[str]): The labels associated with the node.
        properties (Dict[str, Any]): The properties of the node.
    """

    def __init__(self, identifier: str, labels: List[str],
                 properties: Dict[str, Any]):
        self.identifier = identifier
        self.labels = labels
        self.key_property_names = []
        self.label_str = ""
        self.properties = properties

    def __repr__(self):
        return (f"Node(identifier={self.identifier}, "
                f"labels={self.labels}, properties={self.properties})")

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> Node:
        """Create a Node instance from a JSON object."""
        return cls(
            identifier=data["identifier"],
            labels=data.get("labels", []),
            properties=data.get("properties", {}),
        )

    def decide_label_string(self, node_display_props: dict[str, str]) -> None:
        """Returns the label string for the node."""
        if not node_display_props:
            self.label_str = "|".join(self.labels)
        else:
            for label in self.labels:
                label_case_incens = label.lower()
                if label_case_incens in node_display_props:
                    prop = node_display_props[label_case_incens]
                    if prop in self.properties:
                        val = self.properties[prop]
                        self.label_str = f"{label} ({val})"
                        break
            if not self.label_str:
                self.label_str = "|".join(self.labels)

    def add_to_graph(self, graph: nx.MultiDiGraph,
                     node_mapper: Dict[str, int]) -> None:
        """Add the node to a NetworkX graph using the `node_mapping`
            for retrieving the node_id for use in the graph.
            The node_id retrieved from the node_mapper helps hide
            the opaque identifier with a long unreadable string.

        Args:
            graph: The networkx graph to add this node onto.
            node_id_mapping: A mapping to replace the opaque node identifer
                          with a number for ease of use.
        """

        node_id = node_mapper[self.identifier]

        graph.add_node(
            node_id,
            id=node_id,
            uid=self.identifier,
            label=self.label_str,
            properties=self.properties,
            key_property_names=self.key_property_names,
        )

    @staticmethod
    def hash_to_rgb(hash_value: int) -> str:
        """Computes an rgb color from `hash_value`"""
        red = (hash_value >> 16) & 0xFF
        green = (hash_value >> 8) & 0xFF
        blue = hash_value & 0xFF
        return f"rgb({red}, {green}, {blue})"

    @staticmethod
    def get_unique_color_from_palette(label: str,
                                      color_palette: list[str]) -> str:
        if not label:
            return "lightgray"

        # Check if label already has an assigned color
        if (label in reserved_colors):
            return reserved_colors[label]

        # Fallback to hash if all colors have been reserved
        if len(color_palette) == 0:
            return Node.hash_to_rgb(sum(ord(char) for char in label))

        # Assign a color to the label
        color = color_palette[0]
        reserved_colors[label] = color
        color_palette.pop(0)

        return color

    @staticmethod
    def is_valid_node_json(node_data: Dict[str, Any]) -> bool:
        """
        Check that the provided `node_data` is a valid node structure
        """
        required_keys = [
            "identifier",
            "labels",
            "properties",
        ]

        type_checks = {
            "identifier": str,
            "labels": list,
            "properties": dict,
        }

        try:
            # Check if all required keys are present
            if not all(key in node_data for key in required_keys):
                return False

            # Check types
            if not all(
                    isinstance(node_data[key], type_)
                    for key, type_ in type_checks.items()):
                return False

            # Check if all labels are strings
            if not all(
                    isinstance(label, str) for label in node_data["labels"]):
                return False

            return True

        except KeyError:
            return False


class Edge:
    """
    Represents an edge or connection in the graph.

    Attributes:
        identifer(str): The identifer of the edge itself.
        source (str): The identifier of the source node.
        destination (str): The identifier of the destination node.
        labels (List[str]): The labels associated with the edge.
        properties (Dict[str, Any]): The properties of the edge.
    """

    def __init__(
        self,
        identifier: str,
        source: str,
        destination: str,
        labels: List[str],
        properties: Dict[str, Any],
    ):
        self.identifier = identifier
        self.source = source
        self.destination = destination
        self.labels = labels
        self.label_str = ""
        self.properties = properties

    def __repr__(self):
        return (f"Edge(source={self.source}, destination={self.destination}, "
                f"labels={self.labels}, properties={self.properties})")

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> Edge:
        """Create an Edge instance from a JSON object"""
        return cls(
            identifier=data["identifier"],
            source=data["source_node_identifier"],
            destination=data["destination_node_identifier"],
            labels=data.get("labels", []),
            properties=data.get("properties", {}),
        )

    @staticmethod
    def is_valid_edge_json(edge_data: Dict[str, Any]) -> bool:
        """
        Check that the provided `edge_data` is a valid edge structure
        """
        required_keys = [
            "identifier",
            "source_node_identifier",
            "destination_node_identifier",
            "labels",
            "properties",
        ]

        type_checks = {
            "identifier": str,
            "source_node_identifier": str,
            "destination_node_identifier": str,
            "labels": list,
            "properties": dict,
        }

        try:
            # Check if all required keys are present
            if not all(key in edge_data for key in required_keys):
                return False

            # Check types
            if not all(
                    isinstance(edge_data[key], type_)
                    for key, type_ in type_checks.items()):
                return False

            # Check if all labels are strings
            if not all(
                    isinstance(label, str) for label in edge_data["labels"]):
                return False

            return True

        except KeyError:
            return False

    def decide_label_string(self, edge_display_props: dict[str, str]) -> None:
        """Returns the label string for the edge."""
        if not edge_display_props:
            self.label_str = "|".join(self.labels)
        else:
            for label in self.labels:
                label_case_incens = label.lower()
                if label_case_incens in edge_display_props:
                    prop = edge_display_props[label_case_incens]
                    if prop in self.properties:
                        val = self.properties[prop]
                        self.label_str = f"{label} ({val})"
                        break
            if not self.label_str:
                self.label_str = "|".join(self.labels)

    def add_to_graph(self, graph: nx.MultiDiGraph,
                     node_mapping: Dict[str, int], numerical_id: number) -> None:
        """Add this edge to a NetworkX graph using the `node_mapping` to find
            the source and destination numeric identifer.
            All nodes must have been added to the graph before adding edges.

        Args:
            graph: The networkx graph to add this edge onto.
            node_mapping: A mapping containing all the nodes and their
                            numeric node identifier.

        Returns: None
        """
        if self.source in node_mapping and self.destination in node_mapping:
            source = node_mapping[self.source]
            destination = node_mapping[self.destination]

            graph.add_edge(
                source,
                destination,
                key=self.identifier,
                id=numerical_id,
                source=source,
                target=destination,
                label=self.label_str,
                properties=self.properties,
            )
