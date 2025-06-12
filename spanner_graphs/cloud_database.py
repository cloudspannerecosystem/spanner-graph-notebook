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
This module contains the cloud-specific implementation for talking to a Spanner database.
"""

from __future__ import annotations
import json
from typing import Any, Dict, List, Tuple

from google.cloud import spanner
from google.cloud.spanner_v1 import JsonObject
from google.api_core.client_options import ClientOptions
from google.cloud.spanner_v1.types import StructType, Type, TypeCode
import pydata_google_auth

from spanner_graphs.database import SpannerDatabase, MockSpannerDatabase, SpannerQueryResult, SpannerFieldInfo

def _get_default_credentials_with_project():
    return pydata_google_auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"], use_local_webserver=False)

def get_as_field_info_list(fields: List[StructType.Field]) -> List[SpannerFieldInfo]:
  """Converts a list of StructType.Field to a list of SpannerFieldInfo."""
  return [SpannerFieldInfo(name=field.name, typename=TypeCode(field.type_.code).name) for field in fields]

class CloudSpannerDatabase(SpannerDatabase):
    """Concrete implementation for Spanner database on the cloud."""
    def __init__(self, project_id: str, instance_id: str,
                 database_id: str) -> None:
        credentials, _ = _get_default_credentials_with_project()
        self.client = spanner.Client(
            project=project_id, credentials=credentials, client_options=ClientOptions(quota_project_id=project_id))
        self.instance = self.client.instance(instance_id)
        self.database = self.instance.database(database_id)
        self.schema_json: Any | None = None

    def __repr__(self) -> str:
        return (f"<CloudSpannerDatabase["
                f"project:{self.client.project_name},"
                f"instance:{self.instance.name},"
                f"db:{self.database.name}]>")

    def _extract_graph_name(self, query: str) -> str:
        words = query.strip().split()
        if len(words) < 3:
            raise ValueError("invalid query: must contain at least (GRAPH, graph_name and query)")

        if words[0].upper() != "GRAPH":
            raise ValueError("invalid query: GRAPH must be the first word")

        return words[1]

    def _get_schema_for_graph(self, graph_query: str) -> Any | None:
        try:
            graph_name = self._extract_graph_name(graph_query)
        except ValueError:
            return None

        with self.database.snapshot() as snapshot:
            schema_query = """
            SELECT property_graph_name, property_graph_metadata_json
            FROM information_schema.property_graphs
            WHERE property_graph_name = @graph_name
            """
            params = {"graph_name": graph_name}
            param_type = {"graph_name": spanner.param_types.STRING}

            result = snapshot.execute_sql(schema_query, params=params, param_types=param_type)
            schema_rows = list(result)

            if schema_rows:
                return schema_rows[0][1]
            else:
                return None

    def execute_query(
        self,
        query: str,
        limit: int = None,
        is_test_query: bool = False,
    ) -> SpannerQueryResult:
        """
        This method executes the provided `query`

        Args:
            query: The SQL query to execute against the database
            limit: An optional limit for the number of rows to return
            is_test_query: If true, skips schema fetching for graph queries.

        Returns:
            A `SpannerQueryResult`
        """
        self.schema_json = None
        if not is_test_query:
            self.schema_json = self._get_schema_for_graph(query)

        with self.database.snapshot() as snapshot:
            params = None
            param_types = None
            if limit and limit > 0:
                params = dict(limit=limit)

            try:
                results = snapshot.execute_sql(query, params=params, param_types=param_types)
                rows = list(results)
            except Exception as e:
                return SpannerQueryResult(
                    data={},
                    fields=[],
                    rows=[],
                    schema_json=self.schema_json,
                    err=e
                )

            fields: List[SpannerFieldInfo] = get_as_field_info_list(results.fields)
            data = {field.name: [] for field in fields}

            if len(fields) == 0:
                return SpannerQueryResult(
                    data=data,
                    fields=fields,
                    rows=rows,
                    schema_json=self.schema_json,
                    err=None
                )

            for row_data in rows:
                for field, value in zip(fields, row_data):
                    if isinstance(value, JsonObject):
                        data[field.name].append(json.loads(value.serialize()))
                    else:
                        data[field.name].append(value)

            return SpannerQueryResult(
                data=data,
                fields=fields,
                rows=rows,
                schema_json=self.schema_json,
                err=None
            )
