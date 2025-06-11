
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
from typing import Dict, Union

from spanner_graphs.database import SpannerDatabase, MockSpannerDatabase
from spanner_graphs.cloud_database import CloudSpannerDatabase

# Global dict of database instances created in a single session
database_instances: Dict[str, Union[SpannerDatabase, MockSpannerDatabase]] = {}

def get_database_instance(project: str, instance: str, database: str, mock = False):
    if mock:
        return MockSpannerDatabase()

    key = f"{project}_{instance}_{database}"
    db = database_instances.get(key)

    # Currently, we only create and return CloudSpannerDatabase instances. In the future, different
    # implementations could be introduced.
    if not db:
        db = CloudSpannerDatabase(project, instance, database)
        database_instances[key] = db

    return db

