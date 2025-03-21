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

import GraphConfig from './spanner-config';
import GraphEdge from "./models/edge";
import GraphNode from "./models/node";
import GraphObject from "./models/graph-object";

/**
 * @callback GraphConfigCallback
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback FocusedGraphObjectCallback
 * @param {GraphObject|null} focusedGraphObject - The graph object currently focused. If null, nothing is focused.
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback SelectedGraphObjectCallback
 * @param {GraphObject|null} selectedGraphObject - The graph object currently selected. If null, nothing is selected.
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback SelectedGraphColorSchemeCallback
 * @param {GraphConfig.ColorScheme} colorScheme - The color scheme to use for nodes.
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback ViewModeChangedCallback
 * @param {GraphConfig.ViewModes} ViewMode - Whether to show the graph, table, or schema view.
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback LayoutModeChangedCallback
 * @param {GraphConfig.LayoutModes} layoutMode - The layout of the nodes (i.e. force directed, DAG, etc...)
 * @param {LayoutModes} lastLayoutMode - The previous layout used.
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback ShowLabelsCallback
 * @param {Boolean} visible - Whether the labels are visible or not.
 * @param {GraphConfig} config - The graph configuration.
 * @returns {void}
 */

/**
 * @callback NodeExpansionRequestCallback
 * @param {GraphNode} node
 * @param {GraphEdge.Direction} direction
 * @param {String} edgeLabel
 * @param {{key: string, value: string|number, type: PropertyDeclarationType}[]} properties
 * @param {GraphConfig} config - The graph configuration
 * @returns {void}
 */

/**
 * @callback GraphDataUpdateCallback
 * @param {{nodes: Array<GraphNode>, edges: Array<Edge>}} currentGraph - The current state of the graph
 * @param {{newNodes: Array<NodeData>, newEdges: Array<EdgeData>}} updates - The newly added data
 * @param {GraphConfig} config - The graph configuration
 * @returns {void}
 */

class GraphStore {
    /**
     * The configuration that the graph store is based on.
     * @type {GraphConfig}
     */
    config;

    /**
     * @type {Object.<string, string>}
     * An object to store reserved colors keyed by label.
     */
    reservedColorsByLabel = {};

    /**
     * @type {Array.<string>}
     * An array to store reserved colors for neighborhoods.
     */
    reservedColorsByNeighborhood = [];


    static EventTypes = Object.freeze({
        CONFIG_CHANGE: Symbol('configChange'),
        FOCUS_OBJECT: Symbol('focusObject'),
        SELECT_OBJECT: Symbol('selectObject'),
        COLOR_SCHEME: Symbol('colorScheme'),
        VIEW_MODE_CHANGE: Symbol('viewModeChange'),
        LAYOUT_MODE_CHANGE: Symbol('layoutModeChange'),
        SHOW_LABELS: Symbol('showLabels'),
        NODE_EXPANSION_REQUEST: Symbol('nodeExpansionRequest'),
        GRAPH_DATA_UPDATE: Symbol('graphDataUpdate')
    });

    /**
     * Events that are broadcasted to GraphVisualization implementations.
     * @type {Object.<GraphStore.EventTypes, Array<Function>>}
     * @property {Array<GraphConfigCallback>} [GraphStore.EventTypes.CONFIG_CHANGE]
     * @property {Array<FocusedGraphObjectCallback>} [GraphStore.EventTypes.FOCUS_OBJECT]
     * @property {Array<SelectedGraphObjectCallback>} [GraphStore.EventTypes.SELECT_OBJECT]
     * @property {Array<SelectedGraphColorSchemeCallback>} [GraphStore.EventTypes.COLOR_SCHEME]
     * @property {Array<ViewModeChangedCallback>} [GraphStore.EventTypes.VIEW_MODE_CHANGE]
     * @property {Array<LayoutModeChangedCallback>} [GraphStore.EventTypes.LAYOUT_MODE_CHANGE]
     * @property {Array<ShowLabelsCallback>} [GraphStore.EventTypes.SHOW_LABELS]
     * @property {Array<NodeExpansionRequestCallback>} [GraphStore.EventTypes.NODE_EXPANSION_REQUEST]
     * @property {Array<GraphDataUpdateCallback>} [GraphStore.EventTypes.GRAPH_DATA_UPDATE]
     */
    eventListeners = {
        [GraphStore.EventTypes.CONFIG_CHANGE]: [],
        [GraphStore.EventTypes.FOCUS_OBJECT]: [],
        [GraphStore.EventTypes.SELECT_OBJECT]: [],
        [GraphStore.EventTypes.COLOR_SCHEME]: [],
        [GraphStore.EventTypes.VIEW_MODE_CHANGE]: [],
        [GraphStore.EventTypes.LAYOUT_MODE_CHANGE]: [],
        [GraphStore.EventTypes.SHOW_LABELS]: [],
        [GraphStore.EventTypes.NODE_EXPANSION_REQUEST]: [],
        [GraphStore.EventTypes.GRAPH_DATA_UPDATE]: []
    };

    /**
     * The data store that a GraphVisualization implementation utilizes.
     * @param {GraphConfig|null} config
     */
    constructor(config) {
        if (!(config instanceof GraphConfig)) {
            config = new GraphConfig({
                nodesData: [],
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: {}
            });
        }

        this.config = config;
    }

    /**
     * Adds an event listener for a specific event type.
     * @param {GraphStore.EventTypes} eventType - The event type to listen for.
     * @param {GraphConfigCallback} callback - The callback to execute when the event is triggered.
     */
    addEventListener(eventType, callback) {
        if (!this.eventListeners[eventType]) {
            throw Error('Invalid event type', eventType);
        }

        this.eventListeners[eventType].push(callback);
    }

    /**
     * @param {GraphConfig.ViewModes} viewMode
     */
    setViewMode(viewMode) {
        if (viewMode === this.config.viewMode) {
            return;
        }

        this.setFocusedObject(null);
        this.setSelectedObject(null);

        this.config.viewMode = viewMode;
        this.eventListeners[GraphStore.EventTypes.VIEW_MODE_CHANGE]
            .forEach(callback => callback(viewMode, this.config));
    }

    /**
     * @param {Boolean} visible
     */
    showLabels(visible) {
        this.config.showLabels = visible;
        this.eventListeners[GraphStore.EventTypes.SHOW_LABELS]
            .forEach(callback => callback(visible, this.config));
    }

    /**
     * @param {LayoutModes} layoutMode
     */
    setLayoutMode(layoutMode) {
        this.config.lastLayoutMode = this.config.layoutMode;
        this.config.layoutMode = layoutMode;
        this.eventListeners[GraphStore.EventTypes.LAYOUT_MODE_CHANGE]
            .forEach(callback => callback(layoutMode, this.config.lastLayoutMode, this.config));
    }

    /**
     * Sets the focused object in the graph and notifies all registered listeners about the focus change.
     * @param {Object} graphObject - The graph object to be focused.
     */
    setFocusedObject(graphObject) {
        this.config.focusedGraphObject = graphObject;
        this.eventListeners[GraphStore.EventTypes.FOCUS_OBJECT].forEach(callback => callback(graphObject, this.config));
    }

    /**
     * Sets the selected object in the graph and notifies all registered listeners about the selection change.
     * @param {Object} graphObject - The graph object to be selected.
     */
    setSelectedObject(graphObject) {
        this.config.selectedGraphObject = graphObject;
        this.eventListeners[GraphStore.EventTypes.SELECT_OBJECT].forEach(callback => callback(graphObject, this.config));
    }

    /**
     * Sets the new color scheme and notifies all registered listeners about the color scheme change.
     * @param {GraphConfig.ColorScheme} colorScheme - The new color scheme to use for nodes.
     */
    setColorScheme(colorScheme) {
        if (!colorScheme) {
            console.error('Color scheme must be provided', colorScheme);
        }

        this.config.colorScheme = colorScheme;
        this.eventListeners[GraphStore.EventTypes.COLOR_SCHEME].forEach(callback => callback(colorScheme, this.config));
    }

    /**
     * Get edges associated with a graph object.
     * @param {GraphObject} graphObject - The graph object to get edges for.
     * @returns {Set<Edge>} A set of edges associated with the graph object.
     */
    getEdgesOfObject(graphObject) {
        if (!graphObject || !graphObject instanceof GraphObject) {
            return new Set();
        }

        if (graphObject instanceof GraphNode) {
            return this.getEdgesOfNode(graphObject);
        }

        return new Set();
    }

    /**
     * Get edges associated with a node.
     * @param {GraphNode} node - The node to get edges for.
     * @returns {Set<Edge>} A set of edges associated with the node.
     */
    getEdgesOfNode(node) {
        if (!(node instanceof GraphNode)) {
            return new Set();
        }

        if (!this.config.edgesOfNode[node.uid]) {
            this.config.edgesOfNode[node.uid] = new Set();
        }

        return this.config.edgesOfNode[node.uid];
    }

    /**
     * Returns all edge types, sorted by:
     * - incoming, alphabetized
     * - outgoing, alphabetized
     * @param node
     * @returns {Array<{label: string, direction: ("INCOMING"|"OUTGOING")}>}
     */
    getEdgeTypesOfNodeSorted(node) {
        return this.getEdgeTypesOfNode(node).sort((a, b) => {
           if (a.direction !== b.direction) {
               return a.direction === 'INCOMING' ? -1 : 1;
           }

           return a.label.localeCompare(b.label);
        });
    }

    /**
     * Gets all possible edge types for a node based on its labels and the schema
     * @param {GraphNode} node - The node to get edge types for
     * @returns {Array<{label: string, direction: 'INCOMING' | 'OUTGOING'}>} Array of edge types with their directions
     */
    getEdgeTypesOfNode(node) {
        if (!(node instanceof GraphNode)) {
            return [];
        }

        if (!this.config || !this.config.schema || !this.config.schema.rawSchema || !this.config.schema.rawSchema.nodeTables) {
            return [];
        }

        // Find matching node tables for this node's labels
        const matchingNodeTables = this.config.schema.rawSchema.nodeTables.filter(nodeTable =>
            node.labels.some(label => nodeTable.labelNames.includes(label))
        );

        const edgeTypes = new Set();

        // For each matching node table, find incoming and outgoing edges
        matchingNodeTables.forEach(nodeTable => {
            this.config.schema.rawSchema.edgeTables.forEach(edgeTable => {
                // Check for outgoing edges
                if (edgeTable.sourceNodeTable.nodeTableName === nodeTable.name) {
                    edgeTable.labelNames.forEach(label => {
                        edgeTypes.add({
                            label,
                            direction: 'OUTGOING'
                        });
                    });
                }

                // Check for incoming edges
                if (edgeTable.destinationNodeTable.nodeTableName === nodeTable.name) {
                    edgeTable.labelNames.forEach(label => {
                        edgeTypes.add({
                            label,
                            direction: 'INCOMING'
                        });
                    });
                }
            });
        });

        return Array.from(edgeTypes);
    }

    /**
     * Get neighbors of a node.
     * @param {GraphNode} node - The node to get neighbors for.
     * @returns {NeighborMap} A set of neighbor information objects.
     */
    getNeighborsOfNode(node) {
        if (!(node instanceof GraphNode)) {
            return {}
        }

        if (!this.config.neighborsOfNode[node.uid]) {
            this.config.neighborsOfNode[node.uid] = {};
        }

        return this.config.neighborsOfNode[node.uid];
    }

    /**
     * Check if an edge is connected to a specific node.
     * @param {GraphEdge} edge - The edge to check.
     * @param {GraphNode} node - The node to check connection with.
     * @returns {boolean} True if the edge is connected to the node, false otherwise.
     */
    edgeIsConnectedToNode(edge, node) {
        if (!edge || !(edge instanceof GraphEdge) || !node || !(node instanceof GraphNode)) {
            return false;
        }

        return edge.sourceUid === node.uid || edge.destinationUid === node.uid
    }

    /**
     * Check if a node is a neighbor to another node.
     * @param {GraphNode} node - The node to check from.
     * @param {GraphNode} potentialNeighbor - The potential neighbor node.
     * @returns {boolean} True if the nodes are neighbors, false otherwise.
     */
    nodeIsNeighborTo(node, potentialNeighbor) {
        if (!(potentialNeighbor instanceof GraphNode)) {
            return false;
        }

        return Boolean(this.getNeighborsOfNode(node)[potentialNeighbor.uid]);
    }

    /**
     * Check if an edge is connected to the focused node.
     * @param {GraphEdge} edge - The edge to check.
     * @returns {boolean} True if the edge is connected to the focused node, false otherwise.
     */
    edgeIsConnectedToFocusedNode(edge) {
        return this.edgeIsConnectedToNode(edge, this.config.focusedGraphObject);
    }

    /**
     * Check if an edge is connected to the selected node.
     * @param {GraphEdge} edge - The edge to check.
     * @returns {boolean} True if the edge is connected to the selected node, false otherwise.
     */
    edgeIsConnectedToSelectedNode(edge) {
        return this.edgeIsConnectedToNode(edge, this.config.selectedGraphObject);
    }

    /**
     * Check if a node is a neighbor to the focused node.
     * @param {GraphNode} node - The node to check.
     * @returns {boolean} True if the node is a neighbor to the focused node, false otherwise.
     */
    nodeIsNeighborToFocusedNode(node) {
        return this.nodeIsNeighborTo(node, this.config.focusedGraphObject);
    }

    /**
     * Check if a node is a neighbor to the selected node.
     * @param {GraphNode} node - The node to check.
     * @returns {boolean} True if the node is a neighbor to the selected node, false otherwise.
     */
    nodeIsNeighborToSelectedNode(node) {
        return this.nodeIsNeighborTo(node, this.config.selectedGraphObject);
    }

    /**
     * Gets the color for a node based on its neighborhood.
     * @param {GraphObject} node - The node to get the color for.
     * @returns {string} The color for the node based on its neighborhood.
     */
    getColorForNodeByNeighborhood(node) {
        if (!node || typeof node.neighborhood !== 'number') {
            console.error('Node must have a neighborhood', node);
        }

        let index = this.reservedColorsByNeighborhood.indexOf(node.neighborhood);
        if (index === -1) {
            index = this.reservedColorsByNeighborhood.push(node.neighborhood) - 1;
        }

        if (index > this.config.colorPalette.length - 1) {
            console.error('Ran out of colors for neighborhood');
            return this.config.colorPalette[0];
        }

        return this.config.colorPalette[index];
    }

    /**
     * Gets the color for a node based on its label.
     * @param {GraphObject} node - The node to get the color for.
     * @returns {string} The color for the node based on its label.
     */
    getColorForNodeByLabel(node) {
        const defaultColor = 'rgb(100, 100, 100)';
        if (!(node instanceof GraphNode)) {
            return defaultColor;
        }

        if (node.isIntermediateNode()) {
            return 'rgb(128, 134, 139)';
        }

        const nodeColor = this.config.nodeColors[node.getLabels()];
        if (nodeColor) {
            return nodeColor;
        }

        return defaultColor;
    }

    /**
     * Gets the color for a node based on the specified color scheme.
     * @param {GraphObject} node - The node to get the color for.
     * @param {GraphConfig.ColorScheme} colorScheme - The color scheme to use.
     * @returns {string} The color for the node.
     * @throws {Error} If an invalid color scheme is provided.
     */
    getColorForNode(node) {
        switch (this.config.colorScheme) {
            case GraphConfig.ColorScheme.NEIGHBORHOOD:
                return this.getColorForNodeByNeighborhood(node);
            case GraphConfig.ColorScheme.LABEL:
                return this.getColorForNodeByLabel(node);
            default:
                throw Error('Invalid color scheme', colorScheme);
        }
    }

    /**
     * @param {Array<NodeData>} nodesData
     * @param {Array<EdgeData>} edgesData
     */
    appendGraphData(nodesData, edgesData) {
        const newNodes = [];
        if (Array.isArray(nodesData)) {
            for (const nodeData of nodesData) {
                const existingNode = this.config.nodes[nodeData.identifier];
                if (existingNode && !existingNode.isIntermediateNode()) {
                    continue;
                }

                newNodes.push(nodeData);
            }
        }

        const newEdges = [];
        if (Array.isArray(edgesData)) {
            for (const edgeData of edgesData) {
                if (this.config.edges[edgeData.identifier]) {
                    continue;
                }

                newEdges.push(edgeData);
            }
        }

        if (!newNodes.length && !newEdges.length) {
            return;
        }

        this.config.appendGraphData(newNodes, newEdges);
        this.eventListeners[GraphStore.EventTypes.GRAPH_DATA_UPDATE]
            .forEach(callback => callback(
                {nodes: this.getNodes(), edges: this.getEdges()},
                {newNodes, newEdges},
                this.config)
            );

        return {newNodes, newEdges};
    }

    /**
     * Get a node by its UID.
     * @param {GraphObjectUID} uid - The unique identifier of the node.
     * @returns {Node|null} The node with the given UID, or null if not found.
     */
    getNode(uid) {
        if (typeof uid !== 'string' || uid.length === 0) {
            return null;
        }

        let nodeMap = {}
        switch (this.config.viewMode) {
            case GraphConfig.ViewModes.DEFAULT:
                nodeMap = this.config.nodes;
                break;
            case GraphConfig.ViewModes.SCHEMA:
                nodeMap = this.config.schemaNodes;
                break;
        }

        return nodeMap[uid];
    }

    getNodeCount() {
        return this.config.viewMode === GraphConfig.ViewModes.DEFAULT ? this.config.nodeCount : this.config.schemaNodeCount;
    }

    /**
     * Get all nodes in the current view mode.
     * @returns {Array<Node>} An array of all nodes.
     */
    getNodes() {
        /** @type {NodeMap} */
        let nodeMap = {}
        switch (this.config.viewMode) {
            case GraphConfig.ViewModes.DEFAULT:
                nodeMap = this.config.nodes;
                break;
            case GraphConfig.ViewModes.SCHEMA:
                nodeMap = this.config.schemaNodes;
                break;
        }

        return Object.keys(nodeMap).map(uid => nodeMap[uid]);
    }

    /**
     * Get all edges in the current view mode.
     * @returns {Array<Edge>} An array of all edges.
     */
    getEdges() {
        /** @type {EdgeMap} */
        let edgeMap = {}
        switch (this.config.viewMode) {
            case GraphConfig.ViewModes.DEFAULT:
                edgeMap = this.config.edges;
                break;
            case GraphConfig.ViewModes.SCHEMA:
                edgeMap = this.config.schemaEdges;
                break;
        }

        return Object.keys(edgeMap).map(uid => edgeMap[uid]);
    }

    getEdgeDesign(edge) {
        const hasSelectedObject = this.config.selectedGraphObject
        const edgeIsSelected = this.config.selectedGraphObject && edge === this.config.selectedGraphObject;
        if (hasSelectedObject && edgeIsSelected) {
            return this.config.edgeDesign.selected;
        }

        if (hasSelectedObject) {
            if (this.edgeIsConnectedToSelectedNode(edge)) {
                return this.config.edgeDesign.focused;
            } else {
                return this.config.edgeDesign.default;
            }
        }

        const edgeIsFocused = this.config.focusedGraphObject && edge === this.config.focusedGraphObject;
        if (!hasSelectedObject && edgeIsFocused) {
            return this.config.edgeDesign.focused;
        }
        
        const isNeighbor = this.edgeIsConnectedToFocusedNode(edge) ||
            this.edgeIsConnectedToSelectedNode(edge);
        if (isNeighbor) {
            return this.config.edgeDesign.focused;
        }

        return this.config.edgeDesign.default;
    }

    /**
     * @param {GraphNode} node
     * @param {GraphEdge.Direction} direction
     * @param {string|undefined} edgeLabel
     */
    requestNodeExpansion(node, direction, edgeLabel) {
        const properties = Object.keys(node.properties).map(propertyName => ({
            key: propertyName,
            value: node.properties[propertyName],
            type: this.getPropertyType(node, propertyName)
        }));

        this.eventListeners[GraphStore.EventTypes.NODE_EXPANSION_REQUEST]
            .forEach(callback => callback(node, direction, edgeLabel, properties, this.config));
    }

    /**
     * Gets the type of a specific property for a node or edge.
     * @param {GraphNode|GraphEdge} graphObject - The object to get the property type from
     * @param {string} propertyName - The name of the property to get the type for
     * @returns {PropertyDeclarationType|null} The type of the property, or null if not found
     */
    getPropertyType(graphObject, propertyName) {
        if (!this.config.schema || !this.config.schema.rawSchema) {
            return null;
        }

        if (!(graphObject instanceof Node) && !(graphObject instanceof Edge)) {
            return;
        }

        const schema = this.config.schema.rawSchema;

        // Find matching node/edge tables for the labels
        const matchingTables = schema[graphObject instanceof Node ? 'nodeTables' : 'edgeTables'].filter(table =>
            graphObject.labels.some(label => table.labelNames.includes(label))
        );

        if (matchingTables.length === 0) {
            console.error(`No matching table found for labels: ${graphObject.labels.join(', ')}`);
            return null;
        }

        // Look through all matching node tables for the property
        for (const table of matchingTables) {
            const propertyDef = table.propertyDefinitions.find(
                prop => prop.propertyDeclarationName === propertyName
            );
            
            if (propertyDef) {
                // Find the property declaration to get its type
                const propertyDecl = schema.propertyDeclarations.find(
                    decl => decl.name === propertyDef.propertyDeclarationName
                );
                
                if (propertyDecl) {
                    return propertyDecl.type;
                }
            }
        }

        console.error(`Property ${propertyName} not found in any matching tables for labels: ${graphObject.labels.join(', ')}`);
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphStore;
}