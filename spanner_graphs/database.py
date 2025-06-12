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
This module contains implementation for talking to spanner database
via snapshot queries.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple, NamedTuple
import json
import os
import csv

from dataclasses import dataclass

class SpannerQueryResult(NamedTuple):
    # A dict where each key is a field name returned in the query and the list
    # contains all items of the same type found for the given field
    data: Dict[str, List[Any]]
    # A list representing the fields in the result set.
    fields: List[SpannerFieldInfo]
    # A list of rows as returned by the query execution.
    rows: List[Any]
    # An optional field to return the schema as JSON
    schema_json: Any | None
    # The error message if any
    err: Exception | None

class SpannerDatabase(ABC):
    """The spanner class holding the database connection"""

    @abstractmethod
    def _extract_graph_name(self, query: str) -> str:
        pass

    @abstractmethod
    def _get_schema_for_graph(self, graph_query: str):
        pass

    @abstractmethod
    def execute_query(
        self,
        query: str,
        limit: int = None,
        is_test_query: bool = False,
    ) -> SpannerQueryResult:
        pass

# Represents the name and type of a field in a Spanner query result. (Implementation-agnostic)
@dataclass
class SpannerFieldInfo:
    name: str
    typename: str


class MockSpannerResult:

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.fields: List[SpannerFieldInfo] = []
        self._rows: List[List[Any]] = []
        self._load_data()

    def _load_data(self):
        with open(self.file_path, "r", encoding="utf-8") as csvfile:
            csv_reader = csv.reader(csvfile)
            headers = next(csv_reader)
            self.fields = [
                SpannerFieldInfo(name=header, typename="JSON")
                for header in headers
            ]

            for row in csv_reader:
                parsed_row = []
                for value in row:
                    try:
                        js = bytes(value, "utf-8").decode("unicode_escape")
                        parsed_row.append(json.loads(js))
                    except json.JSONDecodeError:
                        pass
                self._rows.append(parsed_row)

    def __iter__(self):
        return iter(self._rows)

class MockSpannerDatabase():
    """Mock database class"""

    def __init__(self):
        dirname = os.path.dirname(__file__)
        self.graph_csv_path = os.path.join(
                            dirname, "graph_mock_data.csv")
        self.schema_json_path = os.path.join(
                            dirname, "graph_mock_schema.json")
        self.schema_json: dict = {}

    def execute_query(
        self,
        _: str,
        limit: int = 5
    ) -> SpannerQueryResult:
        """Mock execution of query"""

        # Fetch the schema
        with open(self.schema_json_path, "r", encoding="utf-8") as js:
            self.schema_json = json.load(js)

        results = MockSpannerResult(self.graph_csv_path)
        fields: List[SpannerFieldInfo] = results.fields
        rows = list(results)
        data = {field.name: [] for field in fields}

        if len(fields) == 0:
            return SpannerQueryResult(
                    data=data,
                    fields=fields,
                    rows=rows,
                    schema_json=self.schema_json,
                    err=None
                )

        for i, row in enumerate(results):
            if limit is not None and i >= limit:
                break
            for field, value in zip(fields, row):
                data[field.name].append(value)

        return SpannerQueryResult(
                data=data,
                fields=fields,
                rows=rows,
                schema_json=self.schema_json,
                err=None
            )
