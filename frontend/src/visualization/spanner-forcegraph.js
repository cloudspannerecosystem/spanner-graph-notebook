/**
 * Copyright 2024 Google LLC
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

/** @typedef {import('../models/edge').Edge} Edge */

class GraphVisualization {
    /**
     * The graph store that this visualization is based on.
     * @type {GraphStore}
     */
    store;

    /**
     * The DOM element that the graph will be rendered in.
     * @type {HTMLElement}
     */
    mount;

    /**
     * The DOM element that the menu will be rendered in.
     * @type {HTMLElement}
     */
    menuMount;

    /**
     * The ForceGraph object that renders the graph.
     * @type {ForceGraph}
     */
    graph;

    /**
     * The Node that the user has clicked on. It will be visually highlighted.
     * @type {?Node}
     */
    selectedNode = null;

    /**
     * The Edge that the user has clicked on. It will be visually highlighted.
     * @type {?Edge}
     */
    selectedEdge = null;


    /**
     * The Nodes that are connected to the selected edge. It will be visually highlighted.
     * @type {Node[]}
     */
    selectedEdgeNeighbors = [];

    /**
     * The Nodes that are connected to the focused edge. It will be visually highlighted.
     * @type {Node[]}
     */
    focusedEdgeNeighbors = [];

    /**
     * All the edges connected to the selected node. They will be visually highlighted.
     * @type {Array<Edge>}
     */
    selectedNodeEdges = [];

    /**
     * Neighboring Nodes to the selected Node. They will be visually highlighted, but not as prominently as the selected node.
     * @type {Array<Node>}
     */
    selectedNodeNeighbors = [];

    /**
     * The Node that the user is hovering their mouse over. It will be visually highlighted.
     * @type {?Node}
     */
    focusedNode = null;

    /**
     * All the edges connected to the focused node. They will be visually highlighted.
     * @type {Array<Edge>}
     */
    focusedNodeEdges = [];

    /**
     * Neighboring Nodes to the focused Node. They will be visually highlighted, but not as prominently as the focused node.
     * @type {Array<Node>}
     */
    focusedNodeNeighbors = [];

    // The graph will only automatically center upon
    // the initial layout has finished.
    requestedRecenter = false;

    /**
     * @type {Node[]}
     */
    nodesToUnlockPosition = [];

    /**
     * @typedef {Object} ToolsConfig
     * @property {number} zoomInSpeed - Speed of zooming in.
     * @property {number} zoomInIncrement - Increment value for zooming in.
     * @property {number} zoomOutIncrement - Increment value for zooming out.
     * @property {number} zoomOutSpeed - Speed of zooming out.
     * @property {number} recenterSpeed - Speed of recenter.
     */
    /**
     * @typedef {Object} ToolsElements
     * @property {HTMLElement|null} container - The container element.
     * @property {HTMLElement|null} recenter - The recenter button element.
     * @property {HTMLElement|null} zoomIn - The zoom in button element.
     * @property {HTMLElement|null} zoomOut - The zoom out button element.
     * @property {HTMLElement|null} viewMode - The toggle element to switch view modes
     */
    /**
     * @typedef {Object} Tools
     * @property {ToolsElements} elements - The HTML elements used by the tools.
     * @property {ToolsConfig} config - Configuration for the tools.
     */
    /** @type {Tools} */
    tools = {
        elements: {
            container: null,
            recenter: null,
            zoomIn: null,
            zoomOut: null,
            viewMode: null,
            toggleFullscreen: null
        },
        config: {
            zoomInSpeed: 100,
            zoomInIncrement: 2,
            zoomOutIncrement: 0.5,
            zoomOutSpeed: 100,
            recenterSpeed: 200
        }
    };

    static ClusterMethod = Object.freeze({
        NEIGHBORHOOD: Symbol('Force directed in community'),
        LABEL: Symbol('Force directed')
    });

    // key is the amount of nodes in the ground
    static GraphSizes = Object.freeze({
        SMALL: Symbol('Small'),
        MEDIUM: Symbol('Medium'),
        LARGE: Symbol('Large'),
        UNDEFINED: Symbol('Large'),
    });

    getNodeRelativeSize() {
        return this.NODE_REL_SIZE;
    }

    NODE_REL_SIZE = 4;

    enterFullscreenSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M120-120v-200h80v120h120v80H120Zm520 0v-80h120v-120h80v200H640ZM120-640v-200h200v80H200v120h-80Zm640 0v-120H640v-80h200v200h-80Z"/></svg>`;
    exitFullscreenSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M240-120v-120H120v-80h200v200h-80Zm400 0v-200h200v80H720v120h-80ZM120-640v-80h120v-120h80v200H120Zm520 0v-200h80v120h120v80H640Z"/></svg>`;
    incomingEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M320-320q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0 80q-100 0-170-70T80-480q0-100 70-170t170-70q90 0 156.5 57T557-520h323v80H557q-14 86-80.5 143T320-240Zm0-240Z"/></svg>`;
    outgoingEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M640-320q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0 80q-90 0-156.5-57T403-440H80v-80h323q14-86 80.5-143T640-720q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-240Z"/></svg>`;

    /**
     * Renders a graph visualization.
     * @param {GraphStore} inStore - The store to derive configuration from.
     * @param {HTMLElement} inMount - The DOM element that the graph will be rendered in.
     * @param {HTMLElement} inMenuMount - The DOM element that the top menu will be rendered in.
     */
    constructor(inStore, inMount, inMenuMount) {
        if (!(inStore instanceof GraphStore)) {
            throw Error('Store must be an instance of GraphStore');
        }

        if (!(inMount instanceof HTMLElement)) {
            throw Error('Mount must be an instance of HTMLElement');
        }

        if (!(inMenuMount instanceof HTMLElement)) {
            throw Error('Menu Mount must be an instance of HTMLElement');
        }

        this.store = inStore;
        this.mount = inMount;
        this.menuMount = inMenuMount;

        // tooltips are absolutely positioned
        // relative to the mounting element
        this.mount.style.display = 'relative';

        this.initializeEvents(this.store);
        this.graph = ForceGraph()(this.mount);
        this._setupGraphTools(this.graph);
        this._setupDrawLabelsOnEdges(this.graph);
        this._setupLineLength(this.graph);
        this._setupDrawNodes(this.graph);
        this._setupDrawEdges(this.graph);

        this.graph.dagMode('');

        this.render();
    }

    sanitize(input) {
        if (input === null || input === undefined) return '';
        const str = String(input)
        return str.replace(/[&<>"'`=\/]/g, function (s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '`': '&#96;',
                '=': '&#61;',
                '/': '&#47;'
            }[s];
        });
    }

    /**
     * Registers callbacks for GraphStore events.
     * @param {GraphStore} store
     */
    initializeEvents(store) {
        if (!(store instanceof GraphStore)) {
            throw Error('Store must be an instance of GraphStore');
        }

        store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE,
            (viewMode, config) => this.onViewModeChange(viewMode, config));

        store.addEventListener(GraphStore.EventTypes.CONFIG_CHANGE,
            (config) => this.onStoreConfigChange(config));

        store.addEventListener(GraphStore.EventTypes.FOCUS_OBJECT,
            (graphObject, config) => {
                this.focusedNode = null;
                this.focusedNodeEdges = [];
                this.focusedNodeNeighbors = []
                this.focusedEdge = null;
                this.focusedEdgeNeighbors = [];

                if (graphObject instanceof Node) {
                    this.onFocusedNodeChanged(graphObject)
                }

                if (graphObject instanceof Edge) {
                    this.onFocusedEdgeChanged(graphObject)
                }
            });

        store.addEventListener(GraphStore.EventTypes.SELECT_OBJECT,
            (graphObject, config) => {
                this.selectedNode = null;
                this.selectedEdge = null;
                this.selectedNodeEdges = [];
                this.selectedNodeNeighbors = [];
                this.selectedEdgeNeighbors = [];

                if (graphObject instanceof Node && graphObject) {
                    this.onSelectedNodeChanged(graphObject);
                }

                if (graphObject instanceof Edge && graphObject) {
                    this.onSelectedEdgeChanged(graphObject);
                }
            });

        store.addEventListener(GraphStore.EventTypes.LAYOUT_MODE_CHANGE,
            (layoutMode, lastLayoutMode) => this.onLayoutModeChange(layoutMode, lastLayoutMode));

            // Subscribe to graph data updates
        this.store.addEventListener(GraphStore.EventTypes.GRAPH_DATA_UPDATE, (nodes, edges, config) => {
            const graphData = {
                nodes: nodes,
                links: this._computeCurvature(edges)
            };
            this.graph.graphData(graphData);
            this.refreshCache();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.store.setSelectedObject(null); // Deselect any selected node/edge
            }
        });
    }

    /**
     * @type ViewModeChangedCallback
     */
    onViewModeChange(viewMode, config) {
        if (viewMode === GraphConfig.ViewModes.TABLE) {
            this.graph.pauseAnimation();
            return;
        }

        switch (viewMode) {
            // Always use Force layout for Schema graph
            case GraphConfig.ViewModes.SCHEMA:
                this.onLayoutModeChange(GraphConfig.LayoutModes.FORCE);
                break;
            // Revert to the user's layout selection for the default graph
            case GraphConfig.ViewModes.DEFAULT:
                this.onLayoutModeChange(this.store.config.layoutMode);
                break;
        }

        // Regenerate the graph
        this.requestedRecenter = true;
        const nextData = {
            // Reset coordinates
            nodes: this.store.getNodes().map(node => {
                delete node.x;
                delete node.y;
                delete node.fx;
                delete node.fy;
                delete node.vx;
                delete node.vy;
                return node;
            }),
            links: this._computeCurvature(this.store.getEdges())
        };

        // Wait for the app to finish removing `display: none` from the container.
        // If forcegraph renders while `display: none` is still active (switching
        // from table to graph view), the nodes will spawn in the top-left of the graph.
        requestAnimationFrame(() => {
            this.graph.resumeAnimation();
            this._updateGraphSize();

            // Reset the position and zoom
            this.graph.centerAt(0, 0);
            this.graph.graphData(nextData);
            // Default calculation that forcegraph uses for initial zoom
            // https://github.com/vasturiano/force-graph/blob/c128445f86a7973b1517e354dc3dc1c074d88dd7/src/force-graph.js#L495
            this.graph.zoom(4 / Math.cbrt(nextData.nodes.length));
        });
    }

    /**
     * @type LayoutModeChangedCallback
     */
    onLayoutModeChange(layoutMode, lastLayoutMode, config) {
        let dagDistance;
        let collisionRadius = 1; // Default collision radius

        /**
         * See "setDagMode": https://github.com/vasturiano/force-graph
         * @type {string}
         */
        let forceGraphLayoutModeString = '';

        const graphSize = Math.max(this.store.getNodes().length, 15);

        switch (layoutMode) {
            case GraphConfig.LayoutModes.FORCE:
                dagDistance = 0; // Not applicable for force layout
                break;
            case GraphConfig.LayoutModes.TOP_DOWN:
                forceGraphLayoutModeString = 'td';
                dagDistance = Math.log10(graphSize) * 50;
                collisionRadius = 12;
                break;
            case GraphConfig.LayoutModes.LEFT_RIGHT:
                forceGraphLayoutModeString = 'lr';
                dagDistance = Math.log10(graphSize) * 100;
                collisionRadius = 12;
                break;
            case GraphConfig.LayoutModes.RADIAL_IN:
                forceGraphLayoutModeString = 'radialin';
                dagDistance = Math.log10(graphSize) * 100;
                collisionRadius = 8;
                break;
            case GraphConfig.LayoutModes.RADIAL_OUT:
                forceGraphLayoutModeString = 'radialout';
                dagDistance = Math.log10(graphSize) * 100;
                collisionRadius = 8;
                break;
        }

        this.graph.dagMode(forceGraphLayoutModeString);
        this.graph.dagLevelDistance(dagDistance);

        // Update d3Force collision
        this.requestedRecenter = true;
        this.graph.d3Force('collide', d3.forceCollide(collisionRadius));
    }

    _updateGraphSize() {
        if (!document.fullscreenElement) {
            this.mount.style.width = '100%';
            this.mount.style.height = '616px';
            this.graph.width(this.mount.offsetWidth);
            this.graph.height(this.mount.offsetHeight);
        } else {
            const height = window.innerHeight - this.menuMount.offsetHeight;
            this.mount.style.width = window.innerWidth + 'px';
            this.mount.style.height = height + 'px';
            this.graph.width(this.mount.offsetWidth);
            this.graph.height(height);
        }
    }

    _getRecenterPadding() {
        return this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA ?
            64 : 16;
    }

    _setupGraphTools(graphObject) {
        const html = `
            <button id="graph-zoom-in" title="Zoom In" fill="#3C4043">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#3C4043">
                    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Zm-40-60v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"/>
                </svg>
            </button>
            <button id="graph-zoom-out" title="Zoom Out" fill="#3C4043">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#3C4043">
                    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400ZM280-540v-80h200v80H280Z"/>
                </svg>
            </button>
            <button id="graph-recenter" title="Recenter Graph" class="recenter-button" fill="#3C4043">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                    <path d="M480-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-480q0-33-23.5-56.5T480-560q-33 0-56.5 23.5T400-480q0 33 23.5 56.5T480-400Zm0-80ZM200-120q-33 0-56.5-23.5T120-200v-160h80v160h160v80H200Zm400 0v-80h160v-160h80v160q0 33-23.5 56.5T760-120H600ZM120-600v-160q0-33 23.5-56.5T200-840h160v80H200v160h-80Zm640 0v-160H600v-80h160q33 0 56.5 23.5T840-760v160h-80Z"/>
                </svg>
            </button>
            ${typeof google !== 'undefined' ? '' : `
                <button id="graph-fullscreen" title="Toggle Fullscreen">
                    ${this.enterFullscreenSvg}
                </button>
            `}`;

        this.tools.elements.container = document.createElement('div');
        this.tools.elements.container.id = 'graph-tools';
        this.tools.elements.container.innerHTML = html;
        this.mount.append(this.tools.elements.container);

        this.tools.elements.recenter = this.tools.elements.container.querySelector('#graph-recenter');
        this.tools.elements.recenter.addEventListener('click', () => {
            graphObject.zoomToFit(this.tools.config.recenterSpeed, this._getRecenterPadding());
        });

        this.tools.elements.zoomIn = this.tools.elements.container.querySelector('#graph-zoom-in');
        this.tools.elements.zoomIn.addEventListener('click', () => {
            graphObject.zoom(graphObject.zoom() * this.tools.config.zoomInIncrement, this.tools.config.zoomInSpeed);
        });

        this.tools.elements.zoomOut = this.tools.elements.container.querySelector('#graph-zoom-out');
        this.tools.elements.zoomOut.addEventListener('click', () => {
            graphObject.zoom(graphObject.zoom() * this.tools.config.zoomOutIncrement, this.tools.config.zoomOutSpeed);
        });

        if (typeof google === 'undefined') {
            this.tools.elements.toggleFullscreen = this.tools.elements.container.querySelector('#graph-fullscreen');

            const debounce = (callback, timeout = 300) => {
                let timer = 0;
                return (...args) => {
                    window.clearTimeout(timer);
                    timer = window.setTimeout(() => {
                        callback.apply(this, args);
                    }, timeout);
                }
            }

            const fullscreenMount = this.mount.parentElement.parentElement.parentElement;

            window.addEventListener('fullscreenchange', debounce((e) => {
                if (fullscreenMount !== e.target) {
                    return;
                }

                this._updateGraphSize();
            }));

            this.tools.elements.toggleFullscreen.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    this.tools.elements.toggleFullscreen.innerHTML = this.exitFullscreenSvg;
                    if (fullscreenMount.requestFullscreen) {
                        fullscreenMount.requestFullscreen();
                    } else if (fullscreenMount.mozRequestFullScreen) { // Firefox
                        fullscreenMount.mozRequestFullScreen();
                    } else if (fullscreenMount.webkitRequestFullscreen) { // Chrome, Safari and Opera
                        fullscreenMount.webkitRequestFullscreen();
                    } else if (fullscreenMount.msRequestFullscreen) { // IE/Edge
                        fullscreenMount.msRequestFullscreen();
                    }
                } else {
                    this.tools.elements.toggleFullscreen.innerHTML = this.enterFullscreenSvg;
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }
            });
        }
    }

    /**
     * Callback for GraphStore.EventTypes.CONFIG_CHANGE events.
     * @param {GraphConfig} config - The new configuration.
     */
    onStoreConfigChange(config) {
        this.render();
    }

    refreshCache() {
        const {nodes, links} = this.graph.graphData();

        if (this.selectedNode) {
            this.selectedNodeEdges = links.filter(
                link => link.sourceUid === this.selectedNode.uid || link.destinationUid === this.selectedNode.uid);

            this.selectedNodeNeighbors = nodes.filter(n => {
                const selectedEdges = this.selectedNodeEdges.filter(link => link.sourceUid === n.uid || link.destinationUid === n.uid);
                const containsEdges = selectedEdges.length > 0;
                if (containsEdges) {
                    this.selectedNodeEdges.push(...selectedEdges);
                }

                return containsEdges;
            });
        }

        if (this.focusedNode) {
            const focusedNodeEdges = links.filter(link => link.sourceUid === this.focusedNode.uid || link.destinationUid === this.focusedNode.uid);
            this.focusedNodeEdges.push(...focusedNodeEdges);
            this.focusedNodeNeighbors = nodes.filter(n => {
                if (n.uid === node.uid) {
                    return false;
                }

                const focusedEdges = this.focusedNodeEdges.filter(link => link.sourceUid === n.uid || link.destinationUid === n.uid);
                return focusedEdges.length > 0;
            });
        }

        if (this.selectedEdge) {
            this.selectedEdgeNeighbors = [
                this.selectedEdge.source,
                this.selectedEdge.target
            ];
        }

        if (this.focusedEdge) {
            this.focusedEdgeNeighbors = [
                this.focusedEdge.source,
                this.focusedEdge.target
            ];
        }
    }

    onSelectedEdgeChanged(edge) {
        this.selectedEdge = edge;
        this.selectedEdgeNeighbors = [];

        if (!this.selectedEdge) {
            this.selectedEdge = null;
            return;
        }

        this.selectedEdgeNeighbors = [
            edge.source, edge.target
        ];
    }

    onSelectedNodeChanged(node) {
        this.selectedNode = node;

        // This is duplicated between onSelectedNodeChange and onFocusedNodeChange.
        // This could be extracted to a separate function.
        const {nodes, links} = this.graph.graphData();

        this.selectedNodeEdges = links.filter(
            link => link.source.uid === node.uid || link.target.uid === node.uid);

        this.selectedNodeNeighbors = nodes.filter(n => {
            const selectedEdges = this.selectedNodeEdges.filter(link => link.source.uid === n.uid || link.target.uid === n.uid);
            const containsEdges = selectedEdges.length > 0;
            if (containsEdges) {
                this.selectedNodeEdges.push(...selectedEdges);
            }

            return containsEdges;
        });

        this.graph.centerAt(node.x, node.y, 1000);
        this.graph.zoom(4, 1000);
    }

    onFocusedEdgeChanged(edge) {
        this.focusedEdge = edge;
        this.focusedEdgeNeighbors = [];

        if (!edge) {
            // There are multiple conditions that will trigger a false here,
            // and we want to enforce null type.
            this.focusedEdge = null;
            return;
        }

        this.focusedEdgeNeighbors = [
            edge.source,
            edge.target
        ];
    }

    /**
     * Highlights the focused node as well as its edges and neighbors
     * @param {Node|null} node - The node to highlight. If null, the highlight is removed.
     */
    onFocusedNodeChanged(node) {
        this.focusedNode = node;
        this.focusedNodeEdges = [];
        this.focusedNodeNeighbors = [];

        if (!this.focusedNode) {
            return;
        }

        const {nodes, links} = this.graph.graphData();
        const focusedNodeEdges = links.filter(link => link.source.uid === node.uid || link.target.uid === node.uid);
        this.focusedNodeEdges.push(...focusedNodeEdges);
        this.focusedNodeNeighbors = nodes.filter(n => {
            if (n.uid === node.uid) {
                return false;
            }

            const focusedEdges = this.focusedNodeEdges.filter(link => link.source.uid === n.uid || link.target.uid === n.uid);
            return focusedEdges.length > 0;
        });
    }

    _setupLineLength(graph) {
        this.graph.calculateLineLengthByCluster = () => {
            this.graph
                .d3Force('link').distance(link => {
                const graphSize = Math.max(this.store.getNodes().length, 15);
                let distance = Math.log10(graphSize) * 40;

                // Only apply neighborhood clustering logic if using force layout
                if (graphSize !== 0 && (this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA || this.graph.dagMode() !== '')) {
                    distance = Math.log10(graphSize) * 50;
                } else if (this.graph.dagMode() === '') {
                    distance = link.source.neighborhood === link.target.neighborhood ? distance * 0.5 : distance * 0.8;
                }
                return distance;
            });
            return graph;
        }
    }

    _computeCurvature(links) {
        let selfLoopLinks = {};
        let sameNodesLinks = {};
        const curvatureMinMax = 0.35;

        // 1. assign each link a nodePairId that combines their source and target independent of the links direction
        // 2. group links together that share the same two nodes or are self-loops
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const sourceId = link.sourceUid;
            const targetId = link.destinationUid;
            link.curvature.amount = 0;
            
            // Create consistent nodePairId regardless of direction by always putting smaller ID first
            // Using localeCompare for proper string comparison
            link.curvature.nodePairId = sourceId.localeCompare(targetId) <= 0 ?
                `${sourceId}_${targetId}` : 
                `${targetId}_${sourceId}`;
            
            let map = sourceId === targetId ? selfLoopLinks : sameNodesLinks;
            if (!map[link.curvature.nodePairId]) {
                map[link.curvature.nodePairId] = [];
            }
            map[link.curvature.nodePairId].push(link);
        }

        // Compute the curvature for self-loop links to avoid overlaps
        Object.keys(selfLoopLinks).forEach(id => {
            let links = selfLoopLinks[id];
            let lastIndex = links.length - 1;
            links[lastIndex].curvature.amount = 1;
            let delta = (1 - curvatureMinMax) / Math.max(1, lastIndex);
            for (let i = 0; i < lastIndex; i++) {
                links[i].curvature.amount = curvatureMinMax + i * delta;
            }
        });

        // Compute the curvature for links sharing the same two nodes to avoid overlaps
        Object.keys(sameNodesLinks).forEach(nodePairId => {
            let links = sameNodesLinks[nodePairId];
            if (links.length <= 1) {
                return; // Skip if only one link between nodes
            }
            
            let lastIndex = links.length - 1;
            let lastLink = links[lastIndex];
            lastLink.curvature.amount = curvatureMinMax;
            let delta = 2 * curvatureMinMax / Math.max(1, lastIndex);
            
            for (let i = 0; i < lastIndex; i++) {
                const link = links[i];
                link.curvature.amount = -curvatureMinMax + i * delta;
                // Compare strings properly using localeCompare
                if (lastLink.sourceUid.localeCompare(link.sourceUid) !== 0) {
                    link.curvature.amount *= -1; // flip it around, otherwise they overlap
                }
            }
        });

        return links;
    }

    _setupDrawEdges(graph) {
        graph.drawEdges = (node, ctx, globalScale) => {
            this.graph
                // this will be extracted to a wrapper function for
                // -> hiding labels upon zooming out past a threshold
                // -> hide when large amount of edges shown
                //    -> show edges for node that the user highlights
                // -> settings menu
                // -> or some other heuristic
                .linkDirectionalArrowLength(4)
                .calculateLineLengthByCluster()
                .linkDirectionalArrowRelPos(0.9875)
                .linkCurvature(link => link.curvature.amount)
                .linkWidth(link => {
                    let edgeDesign = this.store.getEdgeDesign(link);
                    return edgeDesign.width;
                })
                .linkColor(link => {
                    let edgeDesign = this.store.getEdgeDesign(link);

                    // Check if ANY node OR edge is focused or selected
                    const isAnyElementFocusedOrSelected =
                        this.store.config.focusedGraphObject instanceof Node ||
                        this.store.config.selectedGraphObject instanceof Node ||
                        this.store.config.focusedGraphObject instanceof Edge ||
                        this.store.config.selectedGraphObject instanceof Edge;

                    // Lighten the edge color if an element is focused or selected
                    // and the edge is NOT connected to it
                    if (isAnyElementFocusedOrSelected &&
                        !this.store.edgeIsConnectedToFocusedNode(link) &&
                        !this.store.edgeIsConnectedToSelectedNode(link) &&
                        link !== this.store.config.focusedGraphObject && // Check for focused edge
                        link !== this.store.config.selectedGraphObject) { // Check for selected edge

                        const lightenAmount = 0.48;
                        const originalColor = edgeDesign.color;
                        return this.lightenColor(originalColor, lightenAmount);
                    } else {
                        return edgeDesign.color; // Return original color
                    }
                })
                .labelsOnEdges(2);

            return graph;
        }
    }

    // Helper function to lighten a color
    lightenColor(color, amount) {
        const usePound = color[0] === '#';
        let R = parseInt(color.substring(usePound ? 1 : 0, usePound ? 3 : 2), 16);
        let G = parseInt(color.substring(usePound ? 3 : 2, usePound ? 5 : 4), 16);
        let B = parseInt(color.substring(usePound ? 5 : 4, usePound ? 7 : 6), 16);

        R = Math.floor((R * (1 - amount)) + (255 * amount));
        G = Math.floor((G * (1 - amount)) + (255 * amount));
        B = Math.floor((B * (1 - amount)) + (255 * amount));

        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }

    _setupDrawNodes(graph) {
        graph.drawNodes = () => {
            this.graph
                .nodeCanvasObject(
                    /**
                     * Callback function to draw nodes based off of the current config state.
                     * @param {Node} node - The node object
                     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
                     * @param {number} globalScale - The global scale of the graph
                     */
                    (node, ctx, globalScale) => {
                        let lightenAmount = 0;
                        const defaultLightenAmount = 0.64;

                        // If a node is selected or focused...
                        if (this.store.config.selectedGraphObject instanceof Node ||
                            this.store.config.focusedGraphObject instanceof Node) {

                            // Lighten all nodes...
                            lightenAmount = defaultLightenAmount;

                            // ...unless it's the selected or hovered node itself...
                            if (node === this.store.config.selectedGraphObject ||
                                node === this.store.config.focusedGraphObject) {
                                lightenAmount = 0;
                            }
                            // ...or if it's connected to the selected or hovered node.
                            else if (this.selectedNodeNeighbors.includes(node) ||
                                this.focusedNodeNeighbors.includes(node)) {
                                lightenAmount = 0;
                            }
                        }

                        // If an edge is selected or focused...
                        if (this.store.config.selectedGraphObject instanceof Edge ||
                            this.store.config.focusedGraphObject instanceof Edge) {
                            lightenAmount = defaultLightenAmount;

                            // If the node is a neighbor of a focused or selected edge
                            if (this.focusedEdgeNeighbors.includes(node) ||
                                this.selectedEdgeNeighbors.includes(node)) {
                                lightenAmount = 0;
                            }
                        }

                        const isFocusedOrHovered = node === this.store.config.selectedGraphObject || node === this.store.config.focusedGraphObject;
                        if (isFocusedOrHovered) {
                            // draw stroke
                            let strokeSize = 0;
                            let strokeSeparationSize = this.getNodeRelativeSize() * 0.125;
                            if (node === this.store.config.selectedGraphObject) {
                                strokeSize = this.getNodeRelativeSize() * .75;
                            } else {
                                strokeSize = this.getNodeRelativeSize() * 0.5;
                            }

                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(26, 115, 232, .24)`;
                            ctx.lineWidth = strokeSize;
                            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                            ctx.arc(node.x, node.y,
                                this.getNodeRelativeSize() + strokeSeparationSize + strokeSize / 2,
                                0, 2 * Math.PI, false);
                            ctx.stroke();
                        }

                        // This draws the circle for the node
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, this.getNodeRelativeSize(), 0, 2 * Math.PI, false);
                        ctx.fillStyle = this.store.getColorForNode(node);
                        ctx.fill();

                        // lighten the node color
                        if (lightenAmount > 0) {
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, this.getNodeRelativeSize(), 0, 2 * Math.PI, false);
                            ctx.fillStyle = `rgba(255, 255, 255, ${lightenAmount})`;
                            ctx.fill();
                        }

                        const showLabel =
                            // The user has chosen to view labels
                            this.store.config.showLabels ||
                            // Always show labels in Schema view
                            this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA ||
                            // Show labels for the node that the user has selected or focused
                            isFocusedOrHovered ||
                            // Always show labels for the neighbors of the selected/focused object
                            this.selectedNodeNeighbors.includes(node) ||
                            this.focusedNodeNeighbors.includes(node) ||
                            this.focusedEdgeNeighbors.includes(node) ||
                            this.selectedEdgeNeighbors.includes(node);

                        // Init label
                        ctx.save();
                        ctx.translate(node.x, node.y);
                        const fontSize = 2;
                        ctx.font = `${this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT ? 'bold' : ''} ${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;

                        if (!showLabel) {
                            return;
                        }

                        let label = node.getDisplayName();
                        if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT && node.identifiers.length > 0) {
                            label += ` (${node.identifiers.join(', ')})`;
                        }

                        // Draw the label's background
                        const padding = 1;
                        const textRect = ctx.measureText(label);
                        const rectX = this.getNodeRelativeSize() + padding * 0.5;
                        const rectWidth = textRect.width + padding;
                        const rectHeight = fontSize + padding;
                        const rectY = -rectHeight * 0.5;
                        const borderRadius = padding * 0.5;

                        ctx.fillStyle = this.store.getColorForNode(node); // Teal color similar to the image
                        ctx.beginPath();
                        ctx.roundRect(
                            rectX,
                            rectY,
                            rectWidth,
                            rectHeight, borderRadius);
                        ctx.fill();

                        // lighten the background
                        if (lightenAmount > 0) {
                            ctx.fillStyle = `rgba(255, 255, 255, ${lightenAmount})`;
                            ctx.beginPath();
                            ctx.roundRect(
                                rectX,
                                rectY,
                                rectWidth,
                                rectHeight, borderRadius);
                            ctx.fill();
                        }

                        // Draw the label text
                        let textVerticalOffset = 0;
                        if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1) {
                            textVerticalOffset = -Math.abs(textRect.actualBoundingBoxAscent - textRect.actualBoundingBoxDescent) * 0.25;
                        }

                        if (this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA) {
                            // "NodeType"
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = '#fff';
                            ctx.font = `${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;
                            ctx.fillText(
                                label,
                                rectX + rectWidth * 0.5,
                                textVerticalOffset);

                            ctx.restore();
                        } else if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                            // "NodeType <b>(identifiers)</b>"
                            // requires two separate drawings
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = '#fff';

                            // 1. First, handle the regular font part ("NodeType ")
                            const prefixLabel = `${node.getDisplayName()} `;
                            ctx.font = `${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;
                            const prefixRect = ctx.measureText(prefixLabel);

                            // 2. Calculate how much wider the text would be if bold
                            ctx.font = `bold ${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;
                            const prefixBoldRect = ctx.measureText(prefixLabel);

                            // 3. Adjust starting position to account for bold/regular difference
                            // This ensures consistent left/right margins regardless of font weight
                            const prefixLabelX = rectX + padding * 0.5 + (prefixBoldRect.width - prefixRect.width) * 0.5;

                            // 4. Draw regular text first
                            ctx.font = `${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;
                            ctx.fillText(prefixLabel, prefixLabelX, textVerticalOffset);

                            // 5. Draw bold identifiers part right after
                            const suffixLabel = `(${node.identifiers.join(', ')})`;
                            const suffixLabelX = prefixLabelX + prefixRect.width;  // Start where previous text ended
                            ctx.font = `bold ${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;
                            ctx.fillText(suffixLabel, suffixLabelX, textVerticalOffset);
                            ctx.restore();
                        }
                    });

            return graph;
        }
    }

    _generateGraphElementTooltip(element) {
        let color = "#a9a9a9";
        if (element instanceof Node) {
            color = this.store.getColorForNode(element);
        }
        let content = `
            <div class="graph-element-tooltip" style="background-color: ${color}">
                <div><strong>${this.sanitize(element.getDisplayName())}</strong></div>`;

        if (element.properties) {
            if (element.key_property_names.length === 1) {
                for (const key of element.key_property_names) {
                    if (element.properties.hasOwnProperty(key)) {
                        content += `<div>${this.sanitize(element.properties[key])}</div>`
                    }
                }
            } else {
                for (const key of element.key_property_names) {
                    if (element.properties.hasOwnProperty(key)) {
                        content += `<div>${key}: ${this.sanitize(element.properties[key])}</div>`
                    }
                }
            }
        }

        content += '</div>'
        return content;
    }

    _setupDrawLabelsOnEdges(graph) {
        /**
         * Draw labels on edges
         * @param {number} maxGlobalScale - Labels will disappear after the global scale
         * has exceeded this number (aka the user has zoomed out past a threshold)
         */
        graph.labelsOnEdges = (maxGlobalScale) => {
            graph
                .linkCanvasObjectMode(() => 'after')
                .linkLabel(() => {
                    if (this.store.config.selectedGraphObject) {
                        return '';
                    }
                    return ''
                })
                .linkCanvasObject(
                    /**
                     * Draw labels on edges
                     * @param {Edge} link - The link object
                     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
                     * @param {number} globalScale - The global scale of the graph
                     */
                    (link, ctx, globalScale) => {

                        const isSelected = this.selectedEdge && link === this.selectedEdge;
                        const isFocused = this.focusedEdge && link === this.focusedEdge;

                        const showLabel = () => {
                            // 1. Prioritize focused edge
                            if (this.focusedEdge && link === this.focusedEdge) {
                                return true; // Always show label for focused edge
                            }

                            // 2. Show label if a node is connected to a focused or selected node
                            if (this.selectedNode && this.store.edgeIsConnectedToSelectedNode(link) ||
                                this.focusedNode && this.store.edgeIsConnectedToFocusedNode(link)) {
                                return true;
                            }

                            // 3. Show label if the edge is selected
                            if (this.selectedEdge && link === this.selectedEdge) {
                                return true; // Always show label for selected edge
                            }

                            // 4. Show labels if within zoom tolerance and no node or edge is focused/selected
                            const focusedOrSelectedObjectExists = this.focusedEdge || this.selectedEdge || this.focusedNode || this.selectedNode;
                            const withinZoomTolerance = globalScale > maxGlobalScale;
                            if (withinZoomTolerance && !focusedOrSelectedObjectExists) {
                                return true;
                            }

                            // 5. Always show the label if "Show Labels" is selected
                            if (this.store.config.showLabels) {
                                return true;
                            }

                            // Otherwise, hide the label
                            return false;
                        };

                        if (!showLabel()) {
                            return;
                        }

                        const start = link.source;
                        const end = link.target;

                        if (typeof start !== 'object' || typeof end !== 'object') return;

                        // Initialize text position
                        let textPos = {
                            x: (start.x + end.x) * 0.5,
                            y: (start.y + end.y) * 0.5
                        };

                        // Get control points
                        const controlPoints = link.__controlPoints;

                        const getQuadraticXYFourWays = (
                            t,
                            sx,
                            sy,
                            cp1x,
                            cp1y,
                            cp2x,
                            cp2y,
                            ex,
                            ey,
                        ) => {
                            return {
                                x:
                                    (1 - t) * (1 - t) * (1 - t) * sx +
                                    3 * (1 - t) * (1 - t) * t * cp1x +
                                    3 * (1 - t) * t * t * cp2x +
                                    t * t * t * ex,
                                y:
                                    (1 - t) * (1 - t) * (1 - t) * sy +
                                    3 * (1 - t) * (1 - t) * t * cp1y +
                                    3 * (1 - t) * t * t * cp2y +
                                    t * t * t * ey,
                            };
                        };

                        const selfLoop = link.source === link.target;

                        if (link.curvature !== 0 && controlPoints) {
                            const time = 0.5;
                            if (selfLoop) {
                                // Self-loop
                                textPos = getQuadraticXYFourWays(
                                    time, link.source.x, link.source.y,
                                    controlPoints[0],
                                    controlPoints[1],
                                    controlPoints[2],
                                    controlPoints[3],
                                    link.target.x, link.target.y,
                                );
                            } else {
                                // Use midpoint of quadratic Bezier curve
                                textPos = {
                                    x: Math.pow(1 - time, 2) * start.x + 2 * (1 - time) * time * controlPoints[0] + Math.pow(time, 2) * end.x,
                                    y: Math.pow(1 - time, 2) * start.y + 2 * (1 - time) * time * controlPoints[1] + Math.pow(time, 2) * end.y
                                };
                            }
                        }

                        // Calculate text angle
                        let textAngle = Math.atan2(end.y - start.y, end.x - start.x);
                        if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                        if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                        // Calculate font size based on link length
                        let label = link.getDisplayName();
                        let labelTail = '';

                        let maxTextLength = 50;
                        if (!selfLoop) {
                            const relLink = {x: end.x - start.x, y: end.y - start.y};
                            const linkLength = Math.sqrt(relLink.x * relLink.x + relLink.y * relLink.y);
                            maxTextLength = linkLength - 5;
                        }

                        const fontSize = 2;
                        // Set text style based on focus OR selection
                        const defaultTextStyle = 'normal'; // Default text style
                        const highlightedTextStyle = 'bold'; // Style when focused or selected

                        ctx.font = `${isFocused || isSelected ? highlightedTextStyle : defaultTextStyle} ${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;

                        const textWidth = () => (ctx.measureText(label).width + ctx.measureText(labelTail).width) * 2;
                        while (textWidth() > maxTextLength) {
                            if (label.length <= 1) {
                                break;
                            }

                            label = label.substring(0, label.length - 1);
                            labelTail = '...';
                        }
                        label = label + labelTail;
                        const textRect = ctx.measureText(label);

                        ctx.save();
                        ctx.translate(textPos.x, textPos.y);
                        ctx.rotate(textAngle);

                        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                        ctx.fillRect(
                            (-textRect.width / 2) - 1,
                            (-fontSize / 2) - 1,
                            textRect.width + 2,
                            fontSize + 2, 1);

                        // Set text color based on focus OR selection
                        const defaultTextColor = '#9AA0A6'; // Default color
                        const focusedTextColor = '#3C4043'; // Color when focused
                        const selectedTextColor = '#1A73E8'; // Color when selected

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        let textVerticalOffset = 0;
                        if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1) {
                            textVerticalOffset = -Math.abs(textRect.actualBoundingBoxAscent - textRect.actualBoundingBoxDescent) * 0.25;
                        } else {
                            textVerticalOffset = ctx.measureText("H").actualBoundingBoxDescent * 0.5;
                        }
                        ctx.fillStyle = isSelected
                            ? selectedTextColor
                            : isFocused
                                ? focusedTextColor
                                : defaultTextColor;
                        ctx.fillText(label, 0, textVerticalOffset);

                        ctx.strokeStyle = isSelected
                            ? selectedTextColor
                            : defaultTextColor;
                        ctx.lineWidth = .5;
                        ctx.strokeRect((-textRect.width / 2) - 1, (-fontSize / 2) - 1, textRect.width + 2, fontSize + 2);

                        ctx.restore();
                    });
            return graph;
        };
    }

    /**
     * @param {Node} node - The node to show context menu for
     * @param {MouseEvent} event - The mouse event that triggered the context menu
     * @private
     */
    _showMouseContextMenu(node, event) {
        // Prevent the default context menu
        event.preventDefault();

        // Remove any existing context menus
        const existingMenu = document.querySelector('.graph-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const edgeDirections = {};
        for (const edge of this.store.getEdgesOfNode(node)) {
            if (edgeDirections[edge.getDisplayName()]) {
                continue;
            }
            edgeDirections[edge.getDisplayName()] = edge.source === node ? '->' : '<-';
        }

        const edgeButtons = this.store.getEdgeTypesOfNode(node).map(({label, direction}) => {
           const directionSvg = direction === Edge.Direction.INCOMING.description ? this.incomingEdgeSvg : this.outgoingEdgeSvg;

           return `<div class="context-menu-item node-expand-edge" data-label="${label}" data-direction="${direction}">${directionSvg} ${label}</div>`;
        });

        const html = `
            <div class="graph-context-menu">
                <div class="context-menu-item has-submenu">
                    <span>Expand</span>
                    <span class="submenu-arrow">›</span>
                    <div class="submenu">
                        <div class="context-menu-item node-expand-edge" data-direction="${Edge.Direction.INCOMING.description}">All incoming edges</div>
                        <div class="context-menu-item node-expand-edge" data-direction="${Edge.Direction.OUTGOING.description}">All outgoing edges</div>
                        ${edgeButtons.join('')}
                    </div>
                </div>
                <div id="context-menu-hide-button" class="context-menu-item">Hide</div>
                <div id="context-menu-hide-others-button" class="context-menu-item">Hide all others</div>
            </div>
        `;

        // Create a container for the menu
        const menuContainer = document.createElement('div');
        menuContainer.innerHTML = html;

        // Add the menu to the document body
        document.body.appendChild(menuContainer.firstElementChild);

        // Position the menu at the mouse coordinates
        const menu = document.querySelector('.graph-context-menu');
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        // Add event listener to close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        document.addEventListener('click', closeMenu);

        // Add event listeners for node expansion of individual edge types
        for (const element of document.body.querySelectorAll('.node-expand-edge')) {
            const edgeLabel = element.dataset.label;
            const direction = element.dataset.direction;

            element.addEventListener('click', () => {
                // Fix node position during expansion
                node.fx = node.x;
                node.fy = node.y;
                this.nodesToUnlockPosition.push(node);

                this.store.setFocusedObject();
                this.store.setSelectedObject(node);
                this.store.requestNodeExpansion(node, direction, edgeLabel);

                menu.remove();
            });
        }
    }

    /**
     * Renders the graph visualization.
     */
    render() {
        this.requestedRecenter = true;

        const graphData = {
            nodes: this.store.getNodes().map(node => {
                delete node.x;
                delete node.y;
                delete node.fx;
                delete node.fy;
                delete node.vx;
                delete node.vy;
                return node;
            }),
            links: this._computeCurvature(this.store.getEdges())
        };

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.mount.offsetWidth;
        offscreenCanvas.height = this.mount.offsetHeight;

        this.graph
            // The canvas can sometimes exceed
            // the dimensions of the HTMLElement
            // it is mounted to. This fixes
            // that issue.
            .width(this.mount.offsetWidth)
            .height(this.mount.clientHeight)
            .nodeId('uid')
            .nodeVal('value')
            .nodeColor('color')
            .linkSource('sourceUid')
            .linkTarget('destinationUid')
            .linkLabel(link => '')
            .autoPauseRedraw(false)
            .onNodeHover(node => {
                if (!this.store.config.focusedGraphObject || !(this.store.config.focusedGraphObject instanceof Edge)) {
                    this.store.setFocusedObject(node);
                }
            })
            .onNodeDragEnd(node => {
                node.fx = node.x;
                node.fy = node.y;
            })
            .onNodeClick(node => {
                this.store.setSelectedObject(node);
            })
            .onNodeRightClick((node, event) => {
                this._showMouseContextMenu(node, event);
            })
            .onLinkHover(link => {
                this.store.setFocusedObject(link);
            })
            .onLinkClick(link => {
                this.store.setSelectedObject(link);
            })
            .onBackgroundClick(event => {
                this.store.setSelectedObject(null);
            })
            .calculateLineLengthByCluster()
            .drawNodes()
            .drawEdges()
            .cooldownTime(1250);

        // fit to canvas when engine stops
        this.graph.onEngineStop(() => {
            if (this.requestedRecenter) {
                this.graph.zoomToFit(1000, this._getRecenterPadding());
                this.requestedRecenter = false;
            }

            for (const node of this.nodesToUnlockPosition) {
                node.fx = undefined;
                node.fy = undefined;
            }
            this.nodesToUnlockPosition = [];
        });

        this.graph.graphData(graphData);
    }
}