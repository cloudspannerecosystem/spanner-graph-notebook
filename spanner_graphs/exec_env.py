
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
This module maintains state for the execution environment of a session
"""

import importlib
from typing import Dict, Union
from spanner_graphs.database import (
    SpannerDatabase,
    MockSpannerDatabase,
    DatabaseSelector,
    SpannerEnv,
)

# Global dict of database instances created in a single session
database_instances: Dict[str, Union[SpannerDatabase, MockSpannerDatabase]] = {}

def get_database_instance(
    selector: DatabaseSelector,
) -> Union[SpannerDatabase, MockSpannerDatabase]:
    """Gets a cached or new database instance based on the selector.

    Args:
        selector: A `DatabaseSelector` object that specifies which database to
            connect to.

    Returns:
        An initialized `SpannerDatabase` or `MockSpannerDatabase` instance.
        A CloudSpannerDatabase will only be available in public environments.
        An InfraSpannerDatabase will only be available in internal environments.

    Raises:
        RuntimeError: If the required Spanner client library (for Cloud or Infra)
            is not installed in the environment.
        ValueError: If the selector specifies an unknown or unsupported
            environment.
    """
    if selector.env == SpannerEnv.MOCK:
        return MockSpannerDatabase()

    key = selector.get_key()
    db = database_instances.get(key)
    if db:
        return db

    elif selector.env == SpannerEnv.CLOUD:
        try:
            cloud_db_module = importlib.import_module(
                "spanner_graphs.cloud_database"
            )
            CloudSpannerDatabase = getattr(cloud_db_module, "CloudSpannerDatabase")
            db = CloudSpannerDatabase(
                selector.project, selector.instance, selector.database
            )
        except ImportError:
            raise RuntimeError(
                "Cloud Spanner support is not available in this environment."
            )
    elif selector.env == SpannerEnv.INFRA:
        try:
            infra_db_module = importlib.import_module(
                "spanner_graphs.infra_database"
            )
            InfraSpannerDatabase = getattr(infra_db_module, "InfraSpannerDatabase")
            db = InfraSpannerDatabase(selector.infra_db_path)
        except ImportError:
            raise RuntimeError(
                "Infra Spanner support is not available in this environment."
            )
    else:
        raise ValueError(f"Unsupported Spanner environment: {selector.env}")

    database_instances[key] = db
    return db
