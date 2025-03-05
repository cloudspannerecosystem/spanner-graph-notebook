// @ts-nocheck
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

const GraphStore = require('../../../src/spanner-store');
const GraphConfig = require('../../../src/spanner-config');
const GraphNode = require('../../../src/models/node');
const Edge = require('../../../src/models/edge');
const SpannerMenu = require('../../../src/visualization/spanner-menu');
const mockData = require('../../mock-data.json');

describe('SpannerMenu', () => {
    let store;
    let mockConfig;
    let mockMount;
    let menu;
    let mockNode1;
    let mockNode2;
    let mockEdge;

    beforeEach(() => {
        // Set up test nodes and edge using mock data
        mockNode1 = new GraphNode(mockData.response.nodes[0]);
        mockNode2 = new GraphNode(mockData.response.nodes[1]);
        mockEdge = new Edge({
            source: mockNode1,
            target: mockNode2,
            ...mockData.response.edges[0]
        });

        // Mock the DOM mount point
        mockMount = document.createElement('div');
        document.body.appendChild(mockMount);

        // Set up store with mock config using actual mock data
        mockConfig = new GraphConfig({
            nodesData: mockData.response.nodes,
            edgesData: mockData.response.edges,
            colorScheme: GraphConfig.ColorScheme.LABEL,
            viewMode: GraphConfig.ViewModes.DEFAULT,
            schemaData: mockData.response.schema
        });

        store = new GraphStore(mockConfig);
        menu = new SpannerMenu(store, mockMount);
    });

    afterEach(() => {
        document.body.removeChild(mockMount);
    });

    describe('Node and Edge Count', () => {
        it('should initialize with correct node and edge count', () => {
            const countElement = mockMount.querySelector('.element-count');
            const expectedCount = `${Object.keys(store.config.nodes).length} nodes, ${Object.keys(store.config.edges).length} edges`;
            expect(countElement?.textContent).toBe(expectedCount);
        });

        it('should update count when nodes are added', () => {
            const initialNodeCount = Object.keys(store.config.nodes).length;
            const initialEdgeCount = Object.keys(store.config.edges).length;

            // Add new nodes using appendGraphData
            const newNodesData = [
                { identifier: 'new-node-1', labels: ['TestLabel1'] },
                { identifier: 'new-node-2', labels: ['TestLabel2'] }
            ];
            store.appendGraphData(newNodesData, []);

            // Check the updated count
            const countElement = mockMount.querySelector('.element-count');
            expect(countElement?.textContent).toBe(`${initialNodeCount + 2} nodes, ${initialEdgeCount} edges`);
        });

        it('should update count when edges are added', () => {
            const initialNodeCount = Object.keys(store.config.nodes).length;
            const initialEdgeCount = Object.keys(store.config.edges).length;

            // Add new edges using appendGraphData
            const newEdgesData = [{
                identifier: 'new-edge-1',
                source_node_identifier: mockNode1.uid,
                destination_node_identifier: mockNode2.uid,
                labels: ['NEW_EDGE']
            }];
            store.appendGraphData([], newEdgesData);

            // Check the updated count
            const countElement = mockMount.querySelector('.element-count');
            expect(countElement?.textContent).toBe(`${initialNodeCount} nodes, ${initialEdgeCount + 1} edges`);
        });

        it('should handle empty graph state', () => {
            // Create new empty config and store
            const emptyConfig = new GraphConfig({
                nodesData: [],
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                viewMode: GraphConfig.ViewModes.DEFAULT,
                schemaData: {}
            });
            store = new GraphStore(emptyConfig);
            menu = new SpannerMenu(store, mockMount);

            const countElement = mockMount.querySelector('.element-count');
            expect(countElement?.textContent).toBe('0 nodes, 0 edges');
        });

        it('should handle multiple data updates', () => {
            const initialNodeCount = Object.keys(store.config.nodes).length;
            const initialEdgeCount = Object.keys(store.config.edges).length;

            // First update - add nodes
            const newNodesData = [
                { identifier: 'new-node-1', labels: ['TestLabel1'] },
                { identifier: 'new-node-2', labels: ['TestLabel2'] }
            ];
            store.appendGraphData(newNodesData, []);

            // Check intermediate count
            let countElement = mockMount.querySelector('.element-count');
            expect(countElement?.textContent).toBe(`${initialNodeCount + 2} nodes, ${initialEdgeCount} edges`);

            // Second update - add edges between new nodes
            const newEdgesData = [{
                identifier: 'new-edge-1',
                source_node_identifier: 'new-node-1',
                destination_node_identifier: 'new-node-2',
                labels: ['NEW_EDGE']
            }];
            store.appendGraphData([], newEdgesData);

            // Check final count
            countElement = mockMount.querySelector('.element-count');
            expect(countElement?.textContent).toBe(`${initialNodeCount + 2} nodes, ${initialEdgeCount + 1} edges`);
        });
    });
}); 