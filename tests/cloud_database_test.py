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
This module tests the database class and its functionalities
"""

from __future__ import annotations
import unittest
from unittest.mock import patch, MagicMock

from google.cloud.spanner_v1.types import Type, TypeCode, StructType

from spanner_graphs.cloud_database import CloudSpannerDatabase
from spanner_graphs.database import SpannerFieldInfo

class TestDatabase(unittest.TestCase):
    """Test cases for the CloudSpannerDatabase class"""

    @patch("spanner_graphs.cloud_database.spanner.Client")
    def test_execute_query(self, mock_client: MagicMock) -> None:
        """Test that a query is executed correctly"""
        mock_instance = MagicMock()
        mock_database = MagicMock()
        mock_snapshot = MagicMock()
        mock_result = MagicMock()

        mock_client.return_value.instance.return_value = mock_instance
        mock_instance.database.return_value = mock_database
        mock_database.snapshot.return_value.__enter__.return_value = mock_snapshot
        mock_snapshot.execute_sql.return_value = mock_result

        mock_result.__iter__.return_value = [[
            '{"key": "value1"}', '{"key": "value2"}', '{"key": "value3"}'
        ]]

        mock_result.fields = [
            StructType.Field(name="field1", type_=Type(code=TypeCode.JSON)),
            StructType.Field(name="field2", type_=Type(code=TypeCode.JSON)),
            StructType.Field(name="field3", type_=Type(code=TypeCode.JSON)),
        ]

        db = CloudSpannerDatabase("test_project", "test_instance", "test_database")
        result = db.execute_query("SELECT * FROM test", is_test_query=True)

        self.assertEqual(result.data["field1"], ['{"key": "value1"}'])
        self.assertEqual(result.fields[0].name, "field1")

    @patch("spanner_graphs.cloud_database.spanner.Client")
    def test_init_with_endpoint(self, mock_client: MagicMock) -> None:
        """Test initialization with Omni endpoint and security options"""
        db = CloudSpannerDatabase(
            project_id="default",
            instance_id="default",
            database_id="test_db",
            endpoint="localhost:9010",
            instance_type="omni",
            use_plain_text=True,
        )
        mock_client.assert_called_once_with(
            project="default",
            use_plain_text=True,
            experimental_host="localhost:9010",
            ca_certificate=None,
            client_certificate=None,
            client_key=None,
        )

    @patch("spanner_graphs.cloud_database.spanner.Client")
    @patch("spanner_graphs.cloud_database._get_default_credentials_with_project", return_value=(MagicMock(), "test_project"))
    def test_init_cloud_with_endpoint(self, mock_creds: MagicMock, mock_client: MagicMock) -> None:
        """Test initialization of Cloud Spanner with custom endpoint"""
        db = CloudSpannerDatabase(
            project_id="test_project",
            instance_id="test_instance",
            database_id="test_db",
            endpoint="custom.spanner.endpoint:443",
        )
        mock_client.assert_called_once()
        _, kwargs = mock_client.call_args
        self.assertEqual(kwargs["project"], "test_project")
        self.assertEqual(kwargs["client_options"].api_endpoint, "custom.spanner.endpoint:443")
        self.assertEqual(kwargs["client_options"].quota_project_id, "test_project")

    @patch("spanner_graphs.cloud_database.spanner.Client")
    @patch("inspect.signature")
    def test_init_omni_with_instance_type_support(self, mock_sig: MagicMock, mock_client: MagicMock) -> None:
        """Test Omni initialization when spanner.Client supports instance_type parameter"""
        mock_sig.return_value.parameters = {"project": None, "instance_type": None, "client_options": None}
        db = CloudSpannerDatabase(
            project_id="default",
            instance_id="default",
            database_id="test_db",
            endpoint="localhost:9010",
            instance_type="omni",
            use_plain_text=True,
        )
        mock_client.assert_called_once()
        _, kwargs = mock_client.call_args
        self.assertEqual(kwargs["project"], "default")
        self.assertEqual(kwargs["instance_type"], "omni")
        self.assertEqual(kwargs["client_options"].api_endpoint, "localhost:9010")
        self.assertTrue(kwargs["use_plain_text"])


if __name__ == "__main__":
    unittest.main()
