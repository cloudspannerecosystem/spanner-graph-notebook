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

/**
 * Represents the schema of the data.
 * @class
 */
class Schema {
    /**
     * @typedef {Object} PropertyDefinition
     * @property {string} propertyDeclarationName
     * @property {string} valueExpressionSql
     * @property {string} nodeTableName
     */

    /**
     * @typedef {Object} EdgeDestinationNode
     * @property {Array<string>} edgeTableColumns
     * @property {Array<string>} nodeTableColumns
     * @property {string} nodeTableName
     */

    /**
     * @typedef {Object} EdgeTable
     * @property {string} baseCatalogName
     * @property {string} baseSchemaName
     * @property {string} baseTableName
     * @property {EdgeDestinationNode} destinationNodeTable
     * @property {Array<string>} keyColumns
     * @property {string} kind
     * @property {Array<string>} labelNames
     * @property {string} name
     * @property {Array<PropertyDefinition>} propertyDefinitions
     * @property {EdgeDestinationNode} sourceNodeTable
     */

    /**
     * @typedef {Object} NodeTable
     * @property {string} baseCatalogName
     * @property {string} baseSchemaName
     * @property {string} baseTableName
     * @property {Array<string>} keyColumns
     * @property {string} kind
     * @property {Array<string>} labelNames
     * @property {string} name
     * @property {Array<PropertyDefinition>} propertyDefinitions
     */

    /**
     * @typedef PropertyDeclarationType
     * @param {'TYPE_CODE_UNSPECIFIED'|'BOOL'|'INT64'|'FLOAT64'|'FLOAT32'|'TIMESTAMP'|'DATE'|
     *         'STRING'|'BYTES'|'ARRAY'|'STRUCT'|'NUMERIC'|'JSON'|'PROTO'|'ENUM'}
     */

    /**
     * @type {PropertyDeclarationType}
     */
    propertyDeclarationTypes = [
        'TYPE_CODE_UNSPECIFIED',
        'BOOL',
        'INT64',
        'FLOAT64',
        'FLOAT32',
        'TIMESTAMP',
        'DATE',
        'STRING',
        'BYTES',
        'ARRAY',
        'STRUCT',
        'NUMERIC',
        'JSON',
        'PROTO',
        'ENUM'
    ];

    /**
     * @typedef PropertyDeclaration
     * @param {string} name
     * @param {PropertyDeclarationType} type
     */

    /**
     * @typedef {Object} RawSchema The raw schema object returned from Cloud Spanner
     * @property {string} catalog
     * @property {Array<EdgeTable>} edgeTables
     * @property {number} labels
     * @property {string} name
     * @property {Array<NodeTable>} nodeTables
     * @property {Array<PropertyDeclaration>} propertyDeclarations
     * @property {string} schema
     */

    /**
     * @type {RawSchema}
     */
    rawSchema;

    /**
     * @param {RawSchema} rawSchemaObject
     */
    constructor(rawSchemaObject) {
        this.rawSchema = rawSchemaObject;

        if (!(rawSchemaObject instanceof Object)) {
            return;
        }

        if (!this.rawSchema.edgeTables || !Array.isArray(this.rawSchema.edgeTables)) {
            this.rawSchema.edgeTables = [];
        }

        if (!this.rawSchema.nodeTables || !Array.isArray(this.rawSchema.nodeTables)) {
            this.rawSchema.nodeTables = [];
        }

        if (!this.rawSchema.propertyDeclarations || !Array.isArray(this.rawSchema.propertyDeclarations)) {
            this.rawSchema.propertyDeclarations = [];
        }
    }

    /**
     * @param {Array<EdgeTable|NodeTable>} tables
     * @returns {Array<string>}
     */
    getNamesOfTables(tables) {
         const names = {};

        if (!this.rawSchema) {
            console.error('No schema found');
            return [];
        }

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];

            if (!table.name) {
                console.error('name of nodeTable is not declared');
                continue;
            }

            if (typeof table.name != 'string') {
                console.error('name of nodeTable is not a string');
                continue;
            }

            names[table.name] = '';
        }

        return Object.keys(names);
    }

    /**
     * We are only returning the first label as a stopgap
     * until the Spanner Backend settles on a solution.
     * @param {Array<EdgeTable|NodeTable>} tables
     * @returns {Array<string>}
     */
    getUniqueLabels(tables) {
        if (!Array.isArray(tables)) {
            return [];
        }

        /**
         * @type {Array<string>}
         */
        const labels = [];

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            if (!table.labelNames || !Array.isArray(table.labelNames)) {
                table.labelNames = [];
            }

            if (!(table instanceof Object) ||
                !(table.labelNames instanceof Array) ||
                table.labelNames.length === 0) {
                continue;
            }

            labels.push(tables[i].labelNames[0]);
        }

        return labels;
    }

    /**
     * @returns {Array<string>}
     */
    getNodeNames() {
        if (!this.rawSchema || !Array.isArray(this.rawSchema.nodeTables)) {
            return [];
        }

        return this.getUniqueLabels(this.rawSchema.nodeTables);
    }

    /**
     * @returns {Array<string>}
     */
    getEdgeNames() {
        if (!this.rawSchema || !Array.isArray(this.rawSchema.edgeTables)) {
            return [];
        }

        return this.getUniqueLabels(this.rawSchema.edgeTables);
    }

    /**
     * @returns {{nodes: Array<string>, edges: Array<string>}}
     */
    getTableNames() {
        return {
            edges: this.getEdgeNames(),
            nodes: this.getNodeNames()
        };
    }

    /**
     * @param {EdgeTable|NodeTable} table
     * @returns {{name: string, type: PropertyDeclarationType}} The keys are the property names, and the values are the value types (int, float, etc.)
     */
    getPropertiesOfTable(table){
        const properties = {}

        const getPropertyType = (name) => {
            for (let j = 0; j < this.rawSchema.propertyDeclarations.length; j++) {
                const declaration = this.rawSchema.propertyDeclarations[j];
                if (declaration.name === name) {
                    return declaration.type;
                }
            }
        }

        if (!table.propertyDefinitions || !Array.isArray(table.propertyDefinitions)) {
            table.propertyDefinitions = [];
        }

        for (let i = 0; i < table.propertyDefinitions.length; i++) {
            const propertyDefinition = table.propertyDefinitions[i];

            const propertyType = getPropertyType(propertyDefinition.propertyDeclarationName);

            if (!propertyType) {
                console.error(`Property Declaration does not contain Property Definition: ${propertyDefinition.propertyDeclarationName}`);
                continue;
            }

            properties[propertyDefinition.propertyDeclarationName] = propertyType;
        }

        return properties;
    }

    /**
     * @param {NodeTable} nodeTable
     * @returns {Array<EdgeTable>} Edges
     */
    getEdgesOfNode(nodeTable){
        return this.rawSchema.edgeTables.filter(edgeTable =>
            edgeTable.sourceNodeTable.nodeTableName === nodeTable.name ||
            edgeTable.destinationNodeTable.nodeTableName === nodeTable.name);
    }

    /**
     * @param edgeTable
     * @returns {{
     *     to: NodeTable
     *     from: NodeTable
     * }}
     */
    getNodesOfEdges(edgeTable) {
        /**
         * @type {{to: {nodeTable}, from: {nodeTable}}}
         */
        const nodes = {};
        for (let i = 0; i < this.rawSchema.nodeTables.length; i++) {
            const nodeTable = this.rawSchema.nodeTables[i];
            if (edgeTable.sourceNodeTable.nodeTableName === nodeTable.name) {
                nodes.from = nodeTable;
            }

            if (edgeTable.destinationNodeTable.nodeTableName === nodeTable.name) {
                nodes.to = nodeTable;
            }

            if (nodes.from && nodes.to) {
                break;
            }
        }

        if (!nodes.to || !nodes.from) {
            console.error('EdgeTable does not have a source or destination node', edgeTable);
        }

        return nodes;
    }

    /**
     * @param {String} name
     * @returns {EdgeTable}
     */
    getEdgeFromName(name) {
        const edges = this.rawSchema.edgeTables.filter(edgeTable =>
            edgeTable.name === name);

        if (edges.length > 0) {
            return edges[0];
        }

        console.error(`No edgeTable associated with name ${name}`);
    }

    /**
     * @param {String} name
     * @returns {NodeTable}
     */
    getNodeFromName(name) {
        const nodes = this.rawSchema.nodeTables.filter(nodeTable =>
            nodeTable.name === name);

        if (nodes.length > 0) {
            return nodes[0];
        }

        console.error(`No nodeTable associated with name ${name}`);
    }

    /**
     * @param {EdgeTable} edgeTable
     * @returns {number}
     */
    getEdgeTableId(edgeTable) {
        return this.rawSchema.edgeTables.indexOf(edgeTable);
    }

    /**
     * @param {NodeTable} nodeTable
     * @returns {number}
     */
    getNodeTableId(nodeTable) {
        return this.rawSchema.nodeTables.indexOf(nodeTable);
    }

    /**
     * @param {String} nodeName
     * @param {String} edgeName
     * @returns {{isConnected: Boolean, isSource: Boolean}}
     */
    nodeIsConnectedToEdge(nodeName, edgeName) {
        const connection = {
            isConnected: false,
            isSource: false
        };

        const node = this.getNodeFromName(nodeName);
        if (!node) {
            console.error(`No node found from name ${nodeName}`);
            return connection;
        }

        const edge = this.getEdgeFromName(edgeName);
        if (!edge) {
            console.error(`No edge found from name ${edgeName}`);
            return connection;
        }

        connection.isConnected = true;
        connection.isSource = edge.sourceNodeTable.nodeTableName === node.name
        return connection;
    }

    /**
     * @param {NodeTable|EdgeTable} table
     * @return {string}
     */
    getDisplayName(table) {
        return table.labelNames[0];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Schema;
}