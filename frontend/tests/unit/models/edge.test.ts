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
const Edge = require('../../../src/models/edge');

describe('Edge', () => {
    let edge: typeof Edge;

    beforeEach(() => {
        edge = new Edge({
            from: 1,
            to: 2,
            labels: ['Test Edge'],
            properties: {
                type: 'connection',
                weight: 1.0
            }
        });
    });

    it('should create a valid edge with required parameters', () => {
        expect(edge).toBeDefined();
        expect(edge.from).toBe(1);
        expect(edge.to).toBe(2);
        expect(edge.labels).toEqual(['Test Edge']);
        expect(edge.instantiated).toBe(true);
    });

    it('should set source and target properties correctly', () => {
        expect(edge.source).toBe(1);
        expect(edge.target).toBe(2);
    });

    it('should fail to instantiate when "from" is not a number', () => {
        const invalidEdge = new Edge({
            from: 'not-a-number',
            to: 2,
            labels: ['Invalid Edge']
        });
        
        expect(invalidEdge.instantiated).toBe(false);
    });

    it('should fail to instantiate when "to" is not a number', () => {
        const invalidEdge = new Edge({
            from: 1,
            to: 'not-a-number',
            labels: ['Invalid Edge']
        });
        
        expect(invalidEdge.instantiated).toBe(false);
    });

    it('should handle properties correctly', () => {
        expect(edge.properties).toEqual({
            type: 'connection',
            weight: 1.0
        });
    });

    it('should handle missing properties', () => {
        const edgeWithoutProps = new Edge({
            from: 1,
            to: 2,
            labels: ['No Props']
        });
        
        expect(edgeWithoutProps.properties).toBeUndefined();
    });
});
