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

const GraphObject = require('../../../src/models/graph-object.js');

describe('Graph Object', () => {
    it('should create a Graph Object instance', () => {
        const graphObject = new GraphObject({
            labels: ['foo', 'bar'], properties: [], identifier: '1'
        });

        expect(graphObject).toBeInstanceOf(GraphObject);
    });

    it('should fail to instantiate without labels', () => {
        expect(() => {
            new GraphObject({
                properties: [], identifier: '1'
            });
        }).toThrow(new TypeError('labels must be an Array'));
    });

    it('should fail to instantiate without an identifier', () => {
        expect(() => {
            new GraphObject({
                labels: ['foo'], properties: []
            });
        }).toThrow(new TypeError('Invalid identifier'));
    });

    it('should return the first label as its display name', () => {
        const graphObject = new GraphObject({
            labels: ['foo', 'bar'], properties: [], identifier: '1'
        });

        expect(graphObject.getDisplayName()).toBe('foo');
    });
});