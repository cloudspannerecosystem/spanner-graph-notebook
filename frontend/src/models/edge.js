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
    GraphObject = require('./graph-object');
}

/**
 * Represents a graph edge.
 * @class
 * @extends GraphObject
 */
class Edge extends GraphObject {
    /**
     * Preserve the UID from being overwritten by ForceGraph
     * @type {GraphObjectUID}
     */
    sourceUid;

    /**
     * Preserve the UID from being overwritten by ForceGraph
     * @type {GraphObjectUID}
     */
    destinationUid;

    /**
     * ForceGraph inserts a Node reference
     * @type {Node}
     */
    source;

    /**
     * ForceGraph inserts a Node reference
     * @type {Node}
     */
    target;

    /**
     * Controls the curvature of the edge when rendered in ForceGraph
     * @type {{
     *   amount: number,
     *   nodePairId: string
     * }}
     * @property {number} amount The amount of curvature to apply (0 = straight line, 1 = maximum curve)
     * @property {string} nodePairId Unique identifier for the pair of nodes this edge connects
     */
    curvature = {
        amount: 0,
        nodePairId: '',
    };

    static Direction = Object.freeze({
        INCOMING: Symbol('INCOMING'),
        OUTGOING: Symbol('OUTGOING')
    });

    /**
     * @typedef {Object} EdgeData - The label shown in the sidebar or graph.
     * @property {string[]} labels
     * @property {string|Object} properties - An optional property:value map.
     * @property {Object} key_property_names
     * @property {string} source_node_identifier - The node's UID
     * @property {string} destination_node_identifier - The node's UID
     * @property {string} identifier - The edge's UID
     * @property {string|Object} title - The optional property:value map for the edge.
     */

    /**
     * An edge is the line that connects two Nodes.
     * @param {EdgeData} params
     */
    constructor(params) {
        const {source_node_identifier, destination_node_identifier, labels, properties, title, identifier} = params;
        super({labels, title, properties, identifier});

        if (!this._validUid(source_node_identifier) || !this._validUid(destination_node_identifier)) {
            this.instantiationErrorReason = 'Edge destination or source invalid';
            this.instantiated = false;
            console.error(this.instantiationErrorReason, params);
            return;
        }

        /**
         * preserve ID from getting
         * overwritten by ForceGraph
         */
        this.sourceUid = source_node_identifier;
        this.destinationUid = destination_node_identifier;

        this.instantiated = true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Edge;
}