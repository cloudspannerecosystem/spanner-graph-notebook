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

/** @typedef {string} GraphObjectUID */

class GraphObject {
    /**
     * The label of the Graph Object.
     * @type {string[]}
     */
    labels =[];

    /**
     * A map of properties and their values describing the Graph Ebject.
     * @type {{[key: string]: string}}
     */
    properties = {};

    /**
     * A boolean indicating if the Graph Object has been instantiated.
     * @type {boolean}
     */
    instantiated = false;

    /**
     * The key property names for the graph element determines what keys in the properties
     * are to be displayed.
     * @type {string[]}
     */
    key_property_names = [];

    /**
     * The reason for the instantiation error.
     * @type {string}
     */
    instantiationErrorReason;

    /**
     * Corresponds to "identifier" in Spanner
     * @type {GraphObjectUID}
     */
    uid = '';


    /**
     * An object that renders on the graph.
     *
     * @param {Object} params
     * @param {string[]} params.labels - The labels for the object.
     * @param {Object} params.properties - The optional property:value map for the object.
     * @param {string} params.identifier - The unique identifier in Spanner
     */
    constructor({ labels, properties, key_property_names, identifier }) {
        if (!Array.isArray(labels)) {
            throw new TypeError('labels must be an Array');
        }

        if (!this._validUid(identifier)) {
            throw new TypeError('Invalid identifier');
        }

        this.labels = labels;
        this.properties = properties;
        this.key_property_names = key_property_names;
        this.uid = identifier;
        this.instantiated = true;
    }

    /**
     * @returns {string}
     */
    getDisplayName() {
        return this.labels.join(' | ');
    }

    /**
     * @param {GraphObjectUID} uid
     * @returns {boolean}
     * @private
     */
    _validUid(uid) {
        return (typeof uid === 'string') && uid.length > 0;
    }
}

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    module.exports = GraphObject;
}