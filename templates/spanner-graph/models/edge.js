/* # Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
 */

class Edge extends GraphObject {
    /**
     * The identifier of the node this edge is directed to.
     * @type {number}
     */
    target;

    /**
     * The identifier of the node this edge originates from.
     * @type {number}
     */
    source;

    /**
    * An edge is the line that connects two Nodes.
    *
    * @param {Object} params
    * @param {string} params.to - The identifier of the node this edge is directed to.
    * @param {string} params.from - The identifier of the node this edge originates from.
    * @param {string} params.label - The label for the edge.
    * @param {string|Object} params.title - The optional property:value map for the edge.
    * @extends GraphObject
    */
    constructor({ to, from, label, properties, title }) {
        super({ label, title, properties });

        if (!this.isNumber(to) || !this.isNumber(from)) {
            this.instantiated = false;
            console.log('Failed to instantiate edge', { reason: '"to" and "from" are not numbers', to, from, label, title });
            return;
        }

        this.target = to;
        this.source = from;
        this.instantiated = true;
    }

    isNumber(value) {
        return Number.isFinite(Number(value));
    }
}

window[namespace].Edge = Edge;