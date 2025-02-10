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

class Edge extends GraphObject {
    /**
     * The identifier of the node this edge is directed to.
     * @type {Node}
     */
    target;

    /**
     * The identifier of the node this edge originates from.
     * @type {Node}
     */
    source;

    static Direction = Object.freeze({
        INCOMING: Symbol('INCOMING'),
        OUTGOING: Symbol('OUTGOING')
    });

    /**
     * @typedef {Object} EdgeData - The label shown in the sidebar or graph.
     * @property {string[]} labels
     * @property {string|Object} properties - An optional property:value map.
     * @property {Object} key_property_names
     * @property {string} color
     * @property {number} from
     * @property {number} to
     * @property {number} id
     */

    /**
    * An edge is the line that connects two Nodes.
    *
    * @param {Object} params
    * @param {string} params.to - The identifier of the node this edge is directed to.
    * @param {string} params.from - The identifier of the node this edge originates from.
    * @param {string|Object} params.title - The optional property:value map for the edge.
    * @extends GraphObject
    */
    constructor({ to, from, labels, properties, title }) {
        super({ labels, title, properties });

        if (!this.isNumber(to) || !this.isNumber(from)) {
            this.instantiated = false;
            console.log('Failed to instantiate edge', { reason: '"to" and "from" are not numbers', to, from, labels, title });
            return;
        }

        /**
         * preserve ID from getting
         * overwritten by ForceGraph
         */
        this.to = to;
        this.from = from;

        this.source = from;
        this.target = to;

        this.instantiated = true;
    }

    isNumber(value) {
        return Number.isFinite(Number(value));
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Edge;
}