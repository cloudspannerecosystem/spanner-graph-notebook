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

class GraphServer {
    isFetching = false;
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

    constructor(port, graph, params) {
        let numericalPort = port;
        if (typeof numericalPort !== 'number') {
            numericalPort = Number.parseInt(numericalPort);

            if (isNaN(numericalPort)) {
                console.error('Graph Server was not given a numerical port', {port});
                return;
            }
        }

        this.port = numericalPort;
        this.params = params
        this.graph = graph;
    }

    /**
     * @param {Node} node
     */
    nodeExpansion(node) {
        if (!node.identifiers.length || !node.key_property_names.length) {
            return Promise.reject(new Error('Node does not have an identifier'));
        }

        if (!node.uid) {
            return Promise.reject(new Error('Node does not have a UID'));
        }

        const request = {
            project: this.project,
            instance: this.instance,
            database: this.database,
            uid: node.uid,
            graph: this.graph,
            node_key_property_name: node.key_property_names[0],
            node_key_property_value: node.identifiers[0],
            direction: 'OUTGOING'
        };

        this.isFetching = true;

        if (typeof google !== 'undefined') {
            return google.colab.kernel.invokeFunction('spanner.NodeExpansion', [], request)
                .then(result => result.data['application/json'])
                .finally(() => this.isFetching = false);
        }

        return fetch(this.buildRoute(this.endpoints.postNodeExpansion), {
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

    /**
     * @param {Node} node
     * @param {Edge} edge
     */
    nodeExpansionSingleEdge(node, edge) {

    }

    query(queryString) {
        const request = {
            query: queryString,
            params: this.params
        };

        this.isFetching = true;

        if (typeof google !== 'undefined') {
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