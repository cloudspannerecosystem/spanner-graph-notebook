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

from __future__ import annotations

from typing import Dict, List, Set
from .graph_entities import Node

class SchemaManager:
    def __init__(self, schema_json: dict = None):
        self.schema_dict = schema_json or {}
        self.node_label_to_property_names = self._build_node_mappings()
        self.unique_node_labels = self._find_unique_node_labels()

    def _find_unique_node_labels(self) -> Set[str]:
        label_count = {}
        for node_table in self.schema_dict.get('nodeTables', []):
            labelNames = node_table.get('labelNames', [])
            if len(labelNames) == 1:
                label = labelNames[0]
                label_count[label] = label_count.get(label, 0) + 1
        return { label for label, count in label_count.items() if count == 1}

    def _build_node_mappings(self) -> Dict[str, List[str]]:
        node_label_to_property_names = {}
        for node_table in self.schema_dict.get('nodeTables', []):
            labelNames = node_table.get('labelNames', [])
            if len(labelNames) != 1:
                continue

            keyColumns = node_table.get('keyColumns', [])
            propertyDefinitions = node_table.get('propertyDefinitions', [])
            label = labelNames[0]
            key_property_names = []
            for keyColumn in keyColumns:
                for prop in propertyDefinitions:
                    if prop.get('valueExpressionSql', '') == keyColumn:
                        key_property_names.append(prop.get('propertyDeclarationName'))
                        break
            node_label_to_property_names[label] = key_property_names

        return node_label_to_property_names

    def get_key_property_names(self, node: Node) -> List[str]:
        if not isinstance(node, Node):
            raise TypeError("node expected")

        if not isinstance(node.properties, dict) or len(node.properties) == 0:
            return []
            
        if not isinstance(node.labels, list) or not node.labels or len(node.labels) == 0:
            return []

        sorted_node_labels = sorted(node.labels)
        
        for node_table in self.schema_dict.get('nodeTables', []):
            label_names = node_table.get('labelNames', [])
            key_columns = node_table.get('keyColumns', [])
            
            if (len(label_names) == len(sorted_node_labels) and 
                sorted(label_names) == sorted_node_labels and
                all(key in node.properties.keys() for key in key_columns)):
                return key_columns
                
        return []
