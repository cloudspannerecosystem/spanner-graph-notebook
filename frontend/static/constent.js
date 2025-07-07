const API_BASE = {
    RESOURCE_MANAGER: "https://cloudresourcemanager.googleapis.com/v1",
    SPANNER: "https://spanner.googleapis.com/v1"
};

const API_ENDPOINTS = {
    getProjects: `${API_BASE.RESOURCE_MANAGER}/projects`,
    getInstances: (projectId) => `${API_BASE.SPANNER}/projects/${projectId}/instances`,
    getDatabases: (projectId, instanceId) =>
        `${API_BASE.SPANNER}/projects/${projectId}/instances/${instanceId}/databases`
};

window.API_ENDPOINTS = API_ENDPOINTS;
window.API_BASE = API_BASE;
