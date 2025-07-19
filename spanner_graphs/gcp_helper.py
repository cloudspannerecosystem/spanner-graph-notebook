from google.cloud import spanner_admin_instance_v1, spanner_admin_database_v1
from googleapiclient.discovery import build
from google.api_core.client_options import ClientOptions
import pydata_google_auth

class GcpHelper:
    @staticmethod
    def get_default_credentials_with_project():
        credentials, _ = pydata_google_auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"], 
            use_local_webserver=False
        )
        return credentials
    
    @staticmethod
    def fetch_gcp_projects(credentials):
        """Fetch only GCP projects (no instances or databases)."""
        try:
            crm_service = build("cloudresourcemanager", "v1", credentials=credentials)
            projects_resp = crm_service.projects().list().execute()
            projects = projects_resp.get("projects", [])
            return [{"projectId": p["projectId"], "name": p.get("name", "")} for p in projects]
        except Exception as e:
            print(f"[!] Error fetching GCP projects: {e}")
            return []
    
    @staticmethod
    def fetch_project_instances(project_id: str, credentials):
        try:
            client_options = ClientOptions(quota_project_id=project_id)
            instance_client = spanner_admin_instance_v1.InstanceAdminClient(
                credentials=credentials,
                client_options=client_options
            )
            instances = instance_client.list_instances(parent=f"projects/{project_id}")
            return [inst.name.split("/")[-1] for inst in instances]
        except Exception as e:
            print(f"[!] Error fetching instances: {e}")
            return []
    
    @staticmethod
    def fetch_instance_databases(project_id: str, instance_id: str, credentials):
        try:
            client_options = ClientOptions(quota_project_id=project_id)
            db_client = spanner_admin_database_v1.DatabaseAdminClient(
                credentials=credentials,
                client_options=client_options
            )
            dbs = db_client.list_databases(parent=f"projects/{project_id}/instances/{instance_id}")
            return [db.name.split("/")[-1] for db in dbs]
        except Exception as e:
            print(f"[!] Error fetching databases: {e}")
            return []


    @staticmethod
    def fetch_all_gcp_resources(credentials):
        result = {}
        try:
            crm_service = build("cloudresourcemanager", "v1", credentials=credentials)
            projects_resp = crm_service.projects().list().execute()
            projects = projects_resp.get("projects", [])

            for project in projects:
                project_id = project["projectId"]
                result[project_id] = {"instances": {}}

                client_options = ClientOptions(quota_project_id=project_id)
                instance_client = spanner_admin_instance_v1.InstanceAdminClient(
                    credentials=credentials,
                    client_options=client_options
                )

                try:
                    instances = instance_client.list_instances(parent=f"projects/{project_id}")
                except Exception as e:
                    print(f"[!] Skipping project {project_id} due to instance error: {e}")
                    continue

                for instance in instances:
                    instance_id = instance.name.split("/")[-1]
                    result[project_id]["instances"][instance_id] = []

                    db_client = spanner_admin_database_v1.DatabaseAdminClient(
                        credentials=credentials,
                        client_options=client_options
                    )

                    try:
                        dbs = db_client.list_databases(
                            parent=f"projects/{project_id}/instances/{instance_id}"
                        )
                        for db in dbs:
                            db_id = db.name.split("/")[-1]
                            result[project_id]["instances"][instance_id].append(db_id)
                    except Exception as e:
                        print(f"[!] Skipping databases for {project_id}/{instance_id}: {e}")
                        continue
        except Exception as e:
            print(f"[!] Error fetching GCP resources: {e}")
            # Return an empty result if there's a broader error during fetching
            return {} 
        return result