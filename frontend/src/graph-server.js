/**
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function isColab() {
    return typeof google !== 'undefined'
}

class GraphServer {
    isFetching = false;

    /**
     * Port number to connect to graph server. In colab environments, this is always undefined
     * and not used (we use colab callbacks instead).
     */
    port = 8195;

    endpoints = {
        getPing: '/get_ping',
        postQuery: '/post_query',
        postNodeExpansion: '/post_node_expansion',
    };

    /**
     * Contains parameters needed to create the database object; passed to Python when running a query.
     * @type {string}
     */
    params = null;

    /**
     * The allowed property types for node expansion
     * @type {Set<string>}
     */
    static ALLOWED_PROPERTY_TYPES_FOR_NODE_EXPANSION_MATCHING = new Set([
        'BOOL',
        'BYTES',
        'DATE',
        'INT64',
        'NUMERIC',
        'FLOAT32',
        'FLOAT64',
        'STRING',
        'TIMESTAMP'
    ]);

    buildRoute(endpoint) {
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local Jupyter Notebook environment
            return `http://localhost:${this.port}${endpoint}`;
        } else {
            // Assume Vertex AI Workbench JupyterLab environment (or other JupyterLab proxy setup)
            return `/proxy/${this.port}${endpoint}`;
        }
    }

    constructor(port, params) {
        if (isColab()) {
            this.port = undefined;
        } else {
            let numericalPort = port;
            if (typeof numericalPort !== 'number') {
                numericalPort = Number.parseInt(numericalPort);

                if (isNaN(numericalPort)) {
                    console.error('Graph Server was not given a numerical port', {port});
                    return;
                }
            }

            this.port = numericalPort;
        }
        this.params = params
    }

    /**
     * @param {Node} node
     * @param {Edge.Direction} direction
     * @param {string|undefined} edgeLabel
     * @param {{key: string, value: string|number, type: PropertyDeclarationType}[]} properties
     */
    nodeExpansion(node, direction, edgeLabel, properties) {
        if (!node.uid) {
            return Promise.reject(new Error('Node does not have a UID'));
        }

        /** @type {{key: string, value: string|number, type: PropertyDeclarationType}[]} */
        const validProperties = [];
        if (Array.isArray(properties)) {
            for (const property of properties) {
                if (!property.key) {
                    continue;
                }

                if (!property.value) {
                    continue;
                }

                if (!(typeof property.type === 'string'))
                {
                    continue;
                }

                const upperPropertyType = property.type.toUpperCase();
                if (!GraphServer.ALLOWED_PROPERTY_TYPES_FOR_NODE_EXPANSION_MATCHING.has(upperPropertyType)) {
                    continue;
                }

                validProperties.push(property);
            }
        }

        const request = {
            uid: node.uid,
            node_labels: node.labels,
            node_properties: validProperties,
            direction
        };

        if (typeof edgeLabel == 'string' && edgeLabel.length) {
            request.edge_label = edgeLabel;
        }

        this.isFetching = true;

        if (isColab()) {
            return google.colab.kernel.invokeFunction('graph_visualization.NodeExpansion', [request, this.params])
                .then(result => result.data['application/json'])
                .finally(() => this.isFetching = false);
        }

        return fetch(this.buildRoute(this.endpoints.postNodeExpansion), {
            method: 'POST',
            body: JSON.stringify({
                params: this.params,
                request
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // Assuming JSON response
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            })
            .finally(() => this.isFetching = false);
    }

    query(queryString) {
        const request = {
            query: queryString,
            params: this.params
        };

        this.isFetching = true;

        if (isColab()) {
            return google.colab.kernel.invokeFunction('graph_visualization.Query', [], request)
                .then(result => result.data['application/json'])
                .finally(() => this.isFetching = false);
        }

        return fetch(this.buildRoute(this.endpoints.postQuery), {
            method: 'POST',
            body: JSON.stringify(request)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // Assuming JSON response
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            })
            .finally(() => this.isFetching = false);
    }

    ping() {
        this.promise = fetch(this.buildRoute(this.endpoints.getPing))
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // Assuming JSON response
            })
            .then(data => {
                console.log(data); // Process the received data
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }
}

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    module.exports = GraphServer;
}