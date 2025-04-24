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
    labels = [];

    /**
     * GraphObject::labels concatenated into a string
     * @type {string}
     */
    labelString = '';

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
     * @param {boolean} params.containsDynamicLabelElement - True if there is dynamic label element type
     * @param {Set<Set<string>>} params.allSchemaStaticLabelSets - A set containing sets of static labels from all table definitions
     */
    constructor({ labels, properties, key_property_names, identifier, containsDynamicLabelElement, allSchemaStaticLabelSets }) {
        if (!Array.isArray(labels)) {
            throw new TypeError('labels must be an Array');
        }

        if (!this._validUid(identifier)) {
            throw new TypeError('Invalid identifier');
        }

        let displayLabels = [...labels]; // Start with a copy of the original labels
        
        // Check if the instance's labels match any of the static label sets defined in the schema.
        // `allSchemaStaticLabelSets` is a Set of Sets (e.g., Set<Set<'LabelA', 'LabelB'>>).
        if (containsDynamicLabelElement && allSchemaStaticLabelSets instanceof Set && allSchemaStaticLabelSets.size > 0) {
            for (const schemaStaticSet of allSchemaStaticLabelSets) {
                // `schemaStaticSet` is one of the Set<string> from the schema (e.g., {'GraphNode'}).
                if (!schemaStaticSet instanceof Set) {
                    continue;
                }
                if ( schemaStaticSet.size == 0) {
                    continue;
                }
                if (schemaStaticSet.size >= labels.size) {
                    continue;
                }
                // Check if all labels in `schemaStaticSet` are present in the `instanceLabelsSet`.
                let isSubset = true;
                for (const staticLabel of schemaStaticSet) {
                    if (!labels.includes(staticLabel)) {
                        isSubset = false;
                        break;
                    }
                }

                if (isSubset) {
                    // The instance's labels contain a complete static label set from the schema.
                    // Filter these static labels out to get the "dynamic" or additional labels.
                    const originalDisplayLabelsBeforeFilter = [...displayLabels];
                    displayLabels = displayLabels.filter(l => !schemaStaticSet.has(l));

                    // If filtering resulted in an empty list, but the original list was not empty,
                    // it implies that the instance *only* had the static labels.
                    // In this case, to avoid an object with no label, revert to showing the static labels.
                    // This is important if `dynamicLabelExpr` was not used or didn't yield a new label.
                    if (displayLabels.length === 0 && originalDisplayLabelsBeforeFilter.length > 0) {
                        displayLabels = originalDisplayLabelsBeforeFilter;
                    }
                    // Assuming an object's labels should only be filtered against one primary static set.
                    // If multiple static sets could be subsets, this `break` might need re-evaluation
                    // or a more complex priority system for which static set "wins" for filtering.
                    break;
                }
            }
        }

        this.labels = displayLabels;
        this.labelString = this.labels.join(' | ');
        this.properties = properties;
        this.key_property_names = key_property_names;
        this.uid = identifier;
        this.instantiated = true;
    }

    /**
     * @returns {string}
     */
    getLabels() {
        return this.labelString;
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

export default GraphObject;