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
    const validEdgeData = {
        source_node_identifier: 'from',
        destination_node_identifier: 'destination',
        identifier: 'me',
        labels: ['Test Edge'],
        properties: {
            type: 'connection',
            weight: 1.0
        }
    };

    it('should create a valid edge with required parameters', () => {
        const edge = new Edge(validEdgeData);
        expect(edge).toBeDefined();
        expect(edge.sourceUid).toBe('from');
        expect(edge.destinationUid).toBe('destination');
        expect(edge.labels).toEqual(['Test Edge']);
        expect(edge.instantiated).toBe(true);
    });

    it('should fail to instantiate with improper source and destination', () => {
        const invalidData = [null, undefined, '', 10, {}, []];

        for (const source_node_identifier of invalidData) {
            const invalidEdge = new Edge({
                ...validEdgeData,
                source_node_identifier,
            });

            expect(invalidEdge.instantiated).toBe(false);
            expect(invalidEdge.instantiationErrorReason).toEqual('Edge destination or source invalid')
        }

        for (const destination_node_identifier of invalidData) {
            const invalidEdge = new Edge({
                ...validEdgeData,
                destination_node_identifier,
            });

            expect(invalidEdge.instantiated).toBe(false);
            expect(invalidEdge.instantiationErrorReason).toEqual('Edge destination or source invalid')
        }
    });

    it('should handle properties correctly', () => {
        const edge = new Edge(validEdgeData);
        expect(edge.properties).toEqual({
            type: 'connection',
            weight: 1.0
        });
    });
});
