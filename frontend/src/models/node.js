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

import GraphObject from './graph-object';

/**
 * Represents a graph node.
 * @class
 * @extends GraphObject
 */
class GraphNode extends GraphObject {
    /**
     * Arbitrary value
     * @type {number}
     */
    value;

    /**
     * Human-readable properties that serve to identify or distinguish the node.
     * For example, a Node with a label of "Movie" may have a key_property_names
     * of value ['title'], where "title" is the name of a property that serves to
     * most-effectively distinguish the node from its peers. Using this knowledge,
     * displaying node.properties.title to the user would be helpful to them.
     * @type {[string]}
     */
    identifiers = [];

    /**
     * Denotes if the node was created in the absence of a node from the query response.
     * This may happen when a query only returns edges. The edge has UIDs for a source/destination node,
     * but no nodes were returned from the response.
     * @type {boolean}
     */
    intermediate = false;

    /**
     * The following properties will be set by ForceGraph.
     * All are of type Number.
     */
    // x;
    // y;
    // fx;
    // fy;
    // vx;
    // vy;

    /**
     * @typedef {Object} NodeData - The label shown in the sidebar or graph.
     * @property {string[]} labels
     * @property {Object} properties - An optional property:value map.
     * @property {Object} key_property_names
     * @property {string} color
     * @property {string} identifier
     * @property {bool} intermediate
     * @property {Set<Set<string>>} allSchemaStaticLabelSets - A set of static label sets from all node table definitions in the schema.
     */

    /**
    * A node on the graph
    * @param {NodeData} params
    */
    constructor(params) {
        const { labels, title, properties, value, key_property_names, identifier, intermediate, containsDynamicLabelElement, allSchemaStaticLabelSets} = params;
        super({ labels, title, properties, key_property_names, identifier, containsDynamicLabelElement, allSchemaStaticLabelSets});

        this.value = value;
        this.instantiated = true;
        this.intermediate = intermediate || false;

        // Parse the human-readable unique identifiers that
        // distinguishes a node from its peers
        if (typeof properties === 'object' && Array.isArray(key_property_names)) {
            for (const propertyName of key_property_names) {
                if (propertyName in properties) {
                    this.identifiers.push(properties[propertyName]);
                }
            }
        }
    }

    isIntermediateNode() {
        return this.intermediate;
    }
}

export default GraphNode;