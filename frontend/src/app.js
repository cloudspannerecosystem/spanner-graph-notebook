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

class SpannerApp {
    /**
     * Unique ID to prevent namespace collisions across multiple iPython cells
     * @type {number}
     */
    id = 0;

    /**
     * @type {HTMLDivElement}
     */
    mount = null;

    /**
     * @type {GraphServer}
     */
    server = null;
    /**
     * @type {GraphStore}
     */
    store = null;
    /**
     * @type {SpannerMenu}
     */
    menu = null;
    /**
     * @type {Sidebar}
     */
    sidebar = null;
    /**
     * @type {GraphVisualization}
     */
    graph = null;
    /**
     * @type {SpannerTable}
     */
    table = null;

    lastQuery = '';

    componentMounts = {
        /**
         * @type {HTMLElement}
         */
        menu: null,
        /**
         * @type {HTMLElement}
         */
        graph: null,
        /**
         * @type {HTMLElement}
         */
        sidebar: null,
        /**
         * @type {HTMLElement}
         */
        table: null
    };

    constructor({id, port, params, mount, query}) {
        this.id = id;
        this.lastQuery = query;

        // mount must be valid
        if (!mount) {
            throw Error('Must have a valid HTML element to mount the app');
        }
        this.mount = mount;

        this.scaffold();

        this.server = new GraphServer(port, params);
        this.server.query(query)
            .then(data => {
                if (!data) {
                    this.tearDown();
                    return;
                }

                const {error, response} = data;

                this.loaderElement.classList.add('hidden');

                if (error || !response) {
                    if (!error) {
                        error = 'An error has occurred';
                    }

                    this.errorElement.textContent = error;
                    this.errorElement.classList.remove('hidden');
                    return;
                }

                const {
                    nodes,
                    edges,
                    rows,
                    schema,
                    query_result
                } = response;

                const graphConfig = new GraphConfig({
                    nodesData: nodes,
                    edgesData: edges,
                    colorScheme: GraphConfig.ColorScheme.LABEL,
                    rowsData: rows,
                    schemaData: schema,
                    queryResult: query_result
                });

                this.store = new GraphStore(graphConfig);

                this.menu = new SpannerMenu(this.store, this.componentMounts.menu);

                this.table = new SpannerTable(this.store, this.componentMounts.table, this.componentMounts.menu);

                const graphContainer = this.mount.querySelector(`#graph-container-${this.id}`);
                graphContainer.className =
                    this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT ? 'dots' : '';

                if ((nodes.length && edges.length) || graphConfig.schema) {
                    this.sidebar = new Sidebar(this.store, this.componentMounts.sidebar);
                    this.graph = new GraphVisualization(this.store,
                        this.componentMounts.graph, this.componentMounts.menu);
                }

                this.store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE,
                    (viewMode, config) => {
                        graphContainer.className = viewMode === GraphConfig.ViewModes.DEFAULT ? 'dots' : '';

                        if (viewMode === GraphConfig.ViewModes.TABLE) {
                            this.componentMounts.graph.parentElement.classList.add('hidden');
                            this.componentMounts.sidebar.classList.add('hidden');
                            this.componentMounts.table.classList.remove('hidden');
                        } else {
                            this.componentMounts.graph.parentElement.classList.remove('hidden');
                            this.componentMounts.sidebar.classList.remove('hidden');
                            this.componentMounts.table.classList.add('hidden');
                        }
                    });

                this.store.addEventListener(GraphStore.EventTypes.NODE_EXPANSION_REQUEST,
                    (node, direction, edgeLabel, properties, config) => {
                        // Show loading state through GraphVisualization
                        this.graph.showLoadingStateForNode(node);

                        this.server.nodeExpansion(node, direction, edgeLabel, properties)
                            .then(data => {
                                if (!data || !data.response) {
                                    return;
                                }

                                const newData = this.store.appendGraphData(data.response.nodes, data.response.edges)
                                if (newData) {
                                    // Show success message before appending data
                                    this.graph.showSuccessStateForNode(node, {
                                        nodesAdded: newData.newNodes.length,
                                        edgesAdded: newData.newEdges.length
                                    });
                                } else {
                                    this.graph.showSuccessStateForNode(node, {nodesAdded: 0, edgesAdded: 0});
                                }
                            })
                            .catch(error => {
                                // Show error state through GraphVisualization
                                this.graph.showErrorStateForNode(node, error);
                            })
                            .finally(() => {
                                // Hide loading state through GraphVisualization
                                this.graph.hideLoadingStateForNode(node);
                            });
                    });

                if (!nodes.length) {
                    this.store.setViewMode(GraphConfig.ViewModes.TABLE);
                }
            });
    }

    tearDown() {
        this.mount.innerHTML = '';
    }

    scaffold() {
        if (!this.mount) {
            throw Error("Must have a valid HTML element to mount the app");
        }

        this.mount.className = `${this.mount.className}`;
        this.mount.innerHTML = `
            <style>
                .container {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
            
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    width: calc(100% - .5rem);
                                     
                    background-color: #fff;
                    font: 16px 'Google Sans', Roboto, Arial, sans-serif;
                }
            
                .container .content {
                    border-radius: 0 0 8px 8px;
                    display: flex;
                    flex: 1;
                    height: 616px;
                    width: 100%;
                    overflow: hidden;
                    position: relative;
                }
            
                #graph-container-${this.id} {
                    background-color: #FBFDFF;
                    width: 100%;
                }
            
                #force-graph-${this.id} {
                    width: 100%;
                    height: 616px;
                    position: relative;
                }

                .node-loading-spinner {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(26, 115, 232, 0.1);
                    border-radius: 50%;
                    border-top: 3px solid #1a73e8;
                    animation: spin 1s linear infinite;
                    pointer-events: none;
                    transform: translate(-50%, -50%);
                }

                .node-loading-spinner::after {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    border: 2px solid rgba(26, 115, 232, 0.1);
                    border-top: 2px solid transparent;
                    border-radius: 50%;
                }

                .node-error-tooltip {
                    position: absolute;
                    background: #d93025;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 10;
                    pointer-events: none;
                    animation: fadeInOut 5s ease-in-out;
                }

                .node-success-toast {
                    position: absolute;
                    background: white;
                    color: #3C4043;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 10;
                    pointer-events: none !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    opacity: 1;
                    transition: opacity 0.3s ease-in-out;
                    user-select: none;
                    -webkit-user-select: none;
                }

                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }

                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { opacity: 0; }
                }

                .error  {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    font-family: 'Google Sans', Roboto, Arial, sans-serif;
                    font-size: 18px;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: .25rem;
                    padding: .75rem 1.25rem;
                    color: #721c24;
                }
                
                .error.hidden,
                .loader-container.hidden,
                .content .hidden {
                    display: none !important;
                }
                
                .loader-container {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    
                }
                
                .loader {
                  width: 48px;
                  height: 48px;
                  border: 5px solid rgba(0, 0, 0, 0);
                  border-bottom-color: #3498db;
                  border-radius: 50%;
                  display: inline-block;
                  box-sizing: border-box;
                  animation: rotation 1s linear infinite;
                  margin-right: 2rem;
                }
                
                @keyframes rotation {
                  0% {
                    transform: rotate(0deg);
                  }
                  100% {
                    transform: rotate(360deg);
                  }
                }
                
                .graph-context-menu {
                    position: fixed;
                    background: white;
                    border-radius: 4px;
                    padding: 0;
                    min-width: 160px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    font-family: 'Google Sans', Roboto, Arial, sans-serif;
                    font-size: 14px;
                    z-index: 1000;
                }
        
                .context-menu-item {
                    padding: 12px;
                    margin-right: 0;
                    cursor: pointer;
                    color: #3c4043;
                    display: flex;
                    align-items: center;
                }
                
                .context-menu-item svg {
                    margin-right: 5px;
                }
        
                .context-menu-item:hover {
                    background-color: #f1f3f4;
                }

                .context-menu-divider {
                    height: 1px;
                    background-color: #dadce0;
                    margin: 4px 0;
                }
            </style>
            <div class="container">
                <header id="graph-menu-${this.id}"></header>
                <div class="content">
                    <div class="error hidden"></div>
                    <div class="loader-container">
                        <div class="loader"></div>
                    </div>
                    <div id="graph-container-${this.id}">
                        <div id="force-graph-${this.id}">
                        </div>
                    </div>
                    <div id="sidebar-${this.id}"></div>
                    <div id="table-${this.id}" class="hidden"></div>
                </div>
            </div>
        `;

        this.loaderElement = this.mount.querySelector('.loader-container');
        this.errorElement = this.mount.querySelector('.error');
        this.componentMounts.menu = this.mount.querySelector(`#graph-menu-${this.id}`);
        this.componentMounts.graph = this.mount.querySelector(`#force-graph-${this.id}`);
        this.componentMounts.sidebar = this.mount.querySelector(`#sidebar-${this.id}`);
        this.componentMounts.table = this.mount.querySelector(`#table-${this.id}`);
    }
}


if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    module.exports = SpannerApp;
}