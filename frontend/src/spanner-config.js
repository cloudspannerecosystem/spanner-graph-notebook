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

import GraphNode from './models/node';
import GraphEdge from './models/edge';
import Schema from './models/schema';

/** @typedef {GraphObjectUID} NodeUID */
/** @typedef {Record<GraphObjectUID, GraphNode>} NodeMap */
/** @typedef {Record<GraphObjectUID, Edge>} EdgeMap */
/** @typedef {Record<NodeUID, Edge>} NeighborMap */

class GraphConfig {

    /**
     * The array of node objects to be rendered. 123123123
     * @type {Schema}
     */
    schema = null;

    /**
     * A map of nodes generated from the Schema where the key is the node's UID and the value is the Node instance.
     * @type {NodeMap}
     */
    schemaNodes = {};

    /**
     * The map of edges generated from the Schema to be rendered where the key is the edge's UID and the value is the Edge instance.
     * @type {EdgeMap}
     */
    schemaEdges = {};

    /**
     * A map of nodes where the key is the node's UID and the value is the Node instance.
     * @type {NodeMap}
     */
    nodes = {};

    /**
     * The map of edge objects to be rendered where the key is the edge's UID and the value is the Edge instance.
     * @type {EdgeMap}
     */
    edges = {};

    /**
     * Raw data of rows from Spanner Graph
     * @type {Array<any>}
     */
    rowsData = [];

    /**
     * rowsData grouped by fields that were specified in the user's query.
     * @type {Object}
     */
    queryResult = {};

    /**
     * The currently focused GraphObject. This is usually the
     * node or edge that the user is hovering their mouse over.
     * @type {GraphObject}
     * @default null
     */
    focusedGraphObject = null;

    /**
     * The currently selected GraphObject. This is usually
     * the node or edge that the user has clicked on.
     * @type {GraphObject}
     * @default null
     */
    selectedGraphObject = null;

    /**
     * The color scheme to use for nodes.
     * @type {GraphConfig.ColorScheme}
     * @default GraphConfig.ColorScheme.NEIGHBORHOOD
     */
    colorScheme = GraphConfig.ColorScheme.NEIGHBORHOOD;

    colorPalette = [
        '#1A73E8',
        '#E52592',
        '#12A4AF',
        '#F4511E',
        '#9334E6',
        '#689F38',
        '#3949AB',
        '#546E7A',
        '#EF6C00',
        '#D93025',
        '#1E8E3E',
        '#039BE5',
        '#4682B4',
        '#F0E68C',
        '#00FFFF',
        '#FFB6C1',
        '#E6E6FA',
        '#7B68EE',
        '#CD853F',
        '#BDB76B',
        '#40E0D0',
        '#708090',
        '#DA70D6',
        '#32CD32',
        '#8B008B',
        '#B0E0E6',
        '#FF7F50',
        '#A0522D',
        '#6B8E23',
        '#DC143C',
        '#FFD700',
        '#DB7093',
    ]

    // [label: string]: colorString
    nodeColors = {};
    // [label: string]: colorString
    schemaNodeColors = {};

    edgeDesign = {
        default: {
            color: '#DADCE0',
            width: 2,
            shadowWidth: 0,
            shadowColor: '#000000'
        },
        focused: {
            color: '#80868B',
            width: 4,
            shadowWidth: 6,
            shadowColor: '#E8EAED'
        },
        selected: {
            color: '#1A73E8',
            width: 4,
            shadowWidth: 8,
            shadowColor: 'rgba(26, 115, 232, 0.25)'
        }
    };

    static ColorScheme = Object.freeze({
        NEIGHBORHOOD: Symbol('neighborhood'),
        LABEL: Symbol('label')
    });

    static ViewModes = Object.freeze({
        DEFAULT: Symbol('DEFAULT'),
        SCHEMA: Symbol('SCHEMA'),
        TABLE: Symbol('TABLE'),
    });

    static LayoutModes = Object.freeze({
        FORCE: Symbol('FORCE'),
        TOP_DOWN: Symbol('TOP_DOWN'),
        LEFT_RIGHT: Symbol('LEFT_RIGHT'),
        RADIAL_IN: Symbol('RADIAL_IN'),
        RADIAL_OUT: Symbol('RADIAL_OUT'),
    })

    viewMode = GraphConfig.ViewModes.DEFAULT;
    layoutMode = GraphConfig.LayoutModes.FORCE;
    lastLayoutMode = GraphConfig.LayoutModes.FORCE;

    showLabels = false;

    
    /**
     * Map of neighbors with the connecting edges
     * @type {Object.<GraphObjectUID, NeighborMap>}
     */
    neighborsOfNode = {}
    /**
     * Set of edges pertaining to a specific node, both incoming and outgoing.
     * @type {Object.<GraphObjectUID, Set<Edge>>}
     */
    edgesOfNode = {}

    /**
     * Map of node labels to their selected property for display
     * @type {Object.<string, string>}
     */
    keyProperties = {}

    nodeCount = 0;
    schemaNodeCount = 0;

    /**
     * Constructs a new GraphConfig instance.
     * @constructor
     * @param {Object} config - The configuration object.
     * @param {Array} config.nodesData - An array of data objects for nodes.
     * @param {Array} config.edgesData - An array of data objects for edges.
     * @param {Array} [config.colorPalette] - An optional array of colors to use as the color palette.
     * @param {GraphConfig.ColorScheme} [config.colorScheme] - Color scheme can be optionally declared.
     * @param {Array} [config.rowsData] - Raw row data from Spanner
     * @param {Object} [config.queryResult] - key-value pair: [field_name: str]: [...config.rowsData]. This
     * has the same data as config.rowsData, but it is grouped by a field name written by the user in their query string.
     * @param {RawSchema} config.schemaData - Raw schema data from Spanner
     */
    constructor({ nodesData, edgesData, colorPalette, colorScheme, rowsData, schemaData, queryResult}) {
        this.parseSchema(schemaData);
        this.nodes = this.parseNodes(nodesData);
        this.nodeCount = Object.keys(this.nodes).length;
        this.edges = this.parseEdges(edgesData);

        this.nodeColors = {};
        this.assignColors();

        if (colorPalette && Array.isArray(colorPalette)) {
            this.colorPalette = colorPalette;
        }

        if (colorScheme) {
            this.colorScheme = colorScheme;
        }

        this.rowsData = rowsData;
        this.queryResult = queryResult;
    }

    /**
     * Assigns colors for node labels to the existing color map
     */
    assignColors() {
        const labels = new Set();

        for (const uid of Object.keys(this.nodes)) {
            const node = this.nodes[uid];
            if (!(node instanceof GraphNode) || node.isIntermediateNode()) {
                continue;
            }

            labels.add(node.getLabels());
        }

        for (const uid of Object.keys(this.schemaNodes)) {
            const node = this.schemaNodes[uid];
            if (!(node instanceof GraphNode)) {
                continue;
            }

            labels.add(node.getLabels());
        }

        for (const label of labels) {
            if (this.colorPalette.length === 0) {
                console.error('Node labels exceed the color palette. Assigning default color.');
                continue;
            }

            if (!label || !label instanceof String) {
                console.error('Node does not have a label', node);
                continue;
            }

            if (!this.nodeColors[label]) {
                this.nodeColors[label] = this.colorPalette.shift();
            }
        }
    }

    /**
     * Parses schema data into nodes and edges
     * @param {RawSchema} schemaData - The raw data representing a schema
     * @throws {Error} Throws an error if the schema data can not be parsed
     */
    parseSchema(schemaData) {
        if (!(schemaData instanceof Object)) {
            this.schema = new Schema({});
            return;
        }

        this.schema = new Schema(schemaData);

        const nodesData = this.schema.rawSchema.nodeTables.map(
            /**
             * @param {NodeTable} nodeTable
             * @returns {NodeData}
             */
            (nodeTable) => {
                /**
                 * @type {NodeData}
                 */
                return {
                    labels: nodeTable.labelNames,
                    properties: this.schema.getPropertiesOfTable(nodeTable),
                    color: 'rgb(0, 0, 100)', // this isn't used
                    identifier: this.schema.getNodeTableId(nodeTable).toString()
                };
            }
        );
        this.schemaNodes = this.parseNodes(nodesData);
        this.schemaNodeCount = Object.keys(this.schemaNodes).length;

        const edgesData = this.schema.rawSchema.edgeTables.map(
            /**
             * @param {EdgeTable} edgeTable
             * @returns {EdgeData}
             */
            (edgeTable, i) => {
                const connectedNodes = this.schema.getNodesOfEdges(edgeTable);

                /**
                 * @type {EdgeData}
                 */
                return {
                    labels: edgeTable.labelNames,
                    properties: this.schema.getPropertiesOfTable(edgeTable),
                    color: 'rgb(0, 0, 100)', // this isn't used
                    destination_node_identifier: this.schema.getNodeTableId(connectedNodes.to).toString(),
                    source_node_identifier: this.schema.getNodeTableId(connectedNodes.from).toString(),
                    identifier: this.schema.getEdgeTableId(edgeTable).toString()
                };
        });
        this.schemaEdges = this.parseEdges(edgesData);
    }

    /**
     * Parses an array of node data, instantiates Nodes, and adds them to the graph.
     * @param {Array<NodeData>} nodesData - An array of objects representing the data for each node.
     * @returns {NodeMap}
     * @throws {Error} Throws an error if `nodesData` is not an array.
     */
    parseNodes(nodesData) {
        if (!Array.isArray(nodesData)) {
            console.error('Nodes must be an array', nodesData)
            throw Error('Nodes must be an array');
        }

        /** @type {NodeMap} */
        const nodes = {};
        const allSchemaStaticLabelSets = this.schema.getAllNodeTableStaticLabelSets();
        const containsDynamicLabelElement = this.schema.containsDynamicLabelNode();
        nodesData.forEach(nodeData => {
            if (!(nodeData instanceof Object)) {
                console.error('Node data is not an object', nodeData);
                return;
            }
            const fullNodeData = { ...nodeData, containsDynamicLabelElement, allSchemaStaticLabelSets };

            // Try to create a Node
            const node = new GraphNode(fullNodeData);
            if (!node || !node.instantiated) {
                console.error('Unable to instantiate node', node.instantiationErrorReason);
                return;
            }
            if (node instanceof GraphNode && node.instantiated) {
                nodes[node.uid] = node;
                if (Array.isArray(node.key_property_names) && node.key_property_names.length) {
                    this.keyProperties[node.getLabels()] = node.key_property_names[0];
                }
            } else {
                node.instantiationErrorReason = 'Could not construct an instance of Node';
                console.error(node.instantiationErrorReason, { fullNodeData, node });
            }
        });

        return nodes;
    }

    /**
     * Parses an array of edge data, instantiates Edges, and adds them to the graph.
     * @param {Array<EdgeData>} edgesData - An array of objects representing the data for each edge.
     * @returns {EdgeMap}
     * @throws {Error} Throws an error if `edgesData` is not an array.
     */
    parseEdges(edgesData) {
        if (!Array.isArray(edgesData)) {
            console.error('Edges must be an array', edgesData)
            throw Error('Edges must be an array');
        }

        /** @type {EdgeMap} */
        const edges = {}
        const allSchemaStaticLabelSets = this.schema.getAllEdgeTableStaticLabelSets();
        const containsDynamicLabelElement = this.schema.containsDynamicLabelEdge();
        edgesData.forEach(edgeData => {
            if (!(edgeData instanceof Object)) {
                console.error('Edge data is not an object', edgeData);
                return;
            }
            const fullEdgeData = { ...edgeData, containsDynamicLabelElement, allSchemaStaticLabelSets };

            // Try to create an Edge
            const edge = new GraphEdge(fullEdgeData);
            if (!edge || !edge.instantiated) {
                console.error('Unable to instantiate edge', edge.instantiationErrorReason);
                return;
            }
            if (edge instanceof GraphEdge) {
                edges[edge.uid] = edge;
                
                // Update indices right when edge is created
                this._updateEdgeIndices(edge);
            } else {
                edge.instantiationErrorReason = 'Could not construct an instance of Edge';
                console.error(edge.instantiationErrorReason, { fullEdgeData, edge });
            }
        });

        return edges;
    }

    /**
     * Update the indexing of node and edge relationships
     * @param {GraphEdge} edge
     * @private
     */
    _updateEdgeIndices(edge) {
        if (!this.neighborsOfNode[edge.sourceUid]) {
            this.neighborsOfNode[edge.sourceUid] = {};
        }

        if (!this.neighborsOfNode[edge.destinationUid]) {
            this.neighborsOfNode[edge.destinationUid] = {};
        }

        if (!this.edgesOfNode[edge.sourceUid]) {
            this.edgesOfNode[edge.sourceUid] = new Set();
        }

        if (!this.edgesOfNode[edge.destinationUid]) {
            this.edgesOfNode[edge.destinationUid] = new Set();
        }

        this.neighborsOfNode[edge.sourceUid][edge.destinationUid] = edge;
        this.neighborsOfNode[edge.destinationUid][edge.sourceUid] = edge;

        this.edgesOfNode[edge.sourceUid].add(edge);
        this.edgesOfNode[edge.destinationUid].add(edge);
    }

    /**
     * @param {Array<NodeData>} nodesData
     * @param {Array<EdgeData>} edgesData
     * @returns {{newNodes: NodeMap, newEdges: EdgeMap}} Object containing maps of newly added nodes and edges
     */
    appendGraphData(nodesData, edgesData) {
        const newNodes = this.parseNodes(nodesData);
        const newEdges = this.parseEdges(edgesData);

        for (const uid of Object.keys(newNodes)) {
            const existingNode = this.nodes[uid];
            if (!(existingNode instanceof GraphNode) || existingNode.isIntermediateNode()) {
                this.nodes[uid] = newNodes[uid];
            }
        }

        this.nodeCount = Object.keys(this.nodes).length;

        for (const uid of Object.keys(newEdges)) {
            if (!this.edges[uid]) {
                this.edges[uid] = newEdges[uid];
            }
        }

        this.assignColors();

        return {newNodes, newEdges};
    }
}

export default GraphConfig;