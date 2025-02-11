/**
 * Copyright 2025 Google LLC
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

// @ts-ignore
const GraphNode = require('../../../src/models/node.js');

describe('Node', () => {
    let graphNode: typeof GraphNode;

    beforeEach(() => {
        graphNode = new GraphNode({
            labels: ['Test Node'],
            id: 1,
            uid: '1',
            value: 100,
            neighborhood: 2,
            color: '#ffffff',
            properties: {
                name: 'Node Name',
                type: 'example'
            },
            key_property_names: ['name', 'type']
        });
    });

    it('should create a valid node with required parameters', () => {
        expect(graphNode).toBeDefined();
        expect(graphNode.id).toBe(1);
        expect(graphNode.uid).toBe('1');
        expect(graphNode.value).toBe(100);
        expect(graphNode.labels).toEqual(['Test Node']);
        expect(graphNode.instantiated).toBe(true);
    });

    it('should throw error when id is invalid', () => {
        expect((new GraphNode({
            labels: ['Invalid Node'],
            id: 'not-a-number'
        })).instantiationErrorReason).toBe("Node does not have an ID");

        expect((new GraphNode({
            labels: ['Invalid Node'],
            // missing ID
        })).instantiationErrorReason).toBe("Node does not have an ID");
    });

    it('should parse identifiers from properties using key_property_names', () => {
        expect(graphNode.identifiers).toEqual(['Node Name', 'example']);
    });

});