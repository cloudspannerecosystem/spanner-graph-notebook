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

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    Node = require('./models/node');
    Edge = require('./models/edge');
    Schema = require('./models/schema');
}

class GraphConfig {

    /**
     * The array of node objects to be rendered. 123123123
     * @type {Schema}
     */
    schema = null;

    /**
     * The array of node objects to be rendered.
     * @type {Array<Node>}
     */
    schemaNodes = [];

    /**
     * The array of edge objects to be rendered.
     * @type {Array<Edge>}
     */
    schemaEdges = [];

    /**
     * The array of node objects to be rendered.
     * @type {Array<Node>}
     */
    nodes = [];

    /**
     * The array of edge objects to be rendered.
     * @type {Array<Edge>}
     */
    edges = [];

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
        '#1A73E8', '#E52592', '#12A4AF', '#F4511E',
        '#9334E6', '#689F38', '#3949AB', '#546E7A',
        '#EF6C00', '#D93025', '#1E8E3E', '#039BE5'
    ];

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
        this.nodes = this.parseNodes(nodesData);
        this.edges = this.parseEdges(edgesData);
        this.nodeColors = this.assignColors(this.nodes);
        this.parseSchema(schemaData);

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
     * @param nodes
     * @returns {{}} Color map by the node's label
     */
    assignColors(nodes) {
        const colors = {};
        const colorPalette = this.colorPalette.map(color => color);

        if (!nodes || !nodes instanceof Array) {
            console.error('Nodes must be array', nodes);
            throw Error('Nodes must be an array');
        }

        nodes.forEach(node => {
            if (colorPalette.length === 0) {
                console.error('Node labels exceed the color palette. Assigning default color.');
                return;
            }

            if (!node || !node instanceof Node) {
                console.error('Object is not an instance of Node', node);
                return;
            }

            const label = node.getDisplayName();
            if (!label || !label instanceof String) {
                console.error('Node does not have a label', node);
                return;
            }

            if (!colors[label]) {
                colors[label] = colorPalette.shift();
            }
        });

        return colors;
    }

    /**
     * Parses schema data into nodes and edges
     * @param {RawSchema} schemaData - The raw data representing a schema
     * @throws {Error} Throws an error if the schema data can not be parsed
     */
    parseSchema(schemaData) {
        if (!(schemaData instanceof Object)) {
            return;
        }

        this.schema = new Schema(schemaData);

        const nodesData = this.schema.rawSchema.nodeTables.map(
            /**
             * @param {NodeTable} nodeTable
             * @returns {NodeData}
             */
            (nodeTable, i) => {
                /**
                 * @type {NodeData}
                 */
                return {
                    labels: nodeTable.labelNames,
                    properties: this.schema.getPropertiesOfTable(nodeTable),
                    color: 'rgb(0, 0, 100)', // this isn't used
                    key_property_names: ['id'],
                    id: this.schema.getNodeTableId(nodeTable)
                };
            }
        );
        this.schemaNodes = this.parseNodes(nodesData);

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
                    to: this.schema.getNodeTableId(connectedNodes.to),
                    from: this.schema.getNodeTableId(connectedNodes.from),
                    key_property_names: ['id'],
                    id: this.schema.getEdgeTableId(edgeTable)
                };
        });
        this.schemaEdges = this.parseEdges(edgesData);
        this.schemaNodeColors = this.assignColors(this.schemaNodes);
    }

    /**
     * Parses an array of node data, instantiates nodes, and adds them to the graph.
     * @param {Array<NodeData>} nodesData - An array of objects representing the data for each node.
     * @throws {Error} Throws an error if `nodesData` is not an array.
     */
    parseNodes(nodesData) {
        if (!Array.isArray(nodesData)) {
            console.error('Nodes must be an array', nodesData)
            throw Error('Nodes must be an array');
        }

        /** @type {Node[]} */
        const nodes = []
        nodesData.forEach(nodeData => {
            if (!(nodeData instanceof Object)) {
                console.error('Node data is not an object', nodeData);
                return;
            }

            // Try to create a Node
            const node = new Node(nodeData);
            if (!node || !node.instantiated) {
                console.error('Unable to instantiate node', node.instantiationErrorReason);
                return;
            }
            if (node instanceof Node && node.instantiated) {
                nodes.push(node);
            } else {
                node.instantiationErrorReason = 'Could not construct an instance of Node';
                console.error(node.instantiationErrorReason, { nodeData, node });
            }
        });

        return nodes;
    }

    parseEdges(edgesData) {
        if (!Array.isArray(edgesData)) {
            console.error('Edges must be an array', edgesData)
            throw Error('Edges must be an array');
        }

        /** @type {Edge[]} */
        const edges = []
        edgesData.forEach(edgeData => {
            if (!(edgeData instanceof Object)) {
                console.error('Edge data is not an object', edgeData);
                return;
            }

            // Try to create an Edge
            const edge = new Edge(edgeData);
            if (!edge || !edge.instantiated) {
                console.error('Unable to instantiate edge', edge.instantiationErrorReason);
                return;
            }
            if (edge instanceof Edge) {
                edges.push(edge);
            } else {
                edge.instantiationErrorReason = 'Could not construct an instance of Edge';
                console.error(edge.instantiationErrorReason, { edgeData, edge });
            }
        });

        return edges;
    }
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphConfig;
}