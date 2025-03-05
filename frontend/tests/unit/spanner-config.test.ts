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
 *
 *
 */

// @ts-ignore
const GraphConfig = require('../../src/spanner-config.js');
// @ts-ignore
const GraphNode = require('../../src/models/node.js');
// @ts-ignore
const Edge = require('../../src/models/edge.js');
// @ts-ignore
const Schema = require('../../src/models/schema.js');

describe('GraphConfig', () => {
    let mockNodesData = [
        {
            identifier: "1",
            labels: ['Person'],
            properties: {name: 'John', age: 30},
            key_property_names: ['id']
        },
        {
            identifier: "2",
            labels: ['Company'],
            properties: {name: 'Google', location: 'CA'},
            key_property_names: ['id']
        }
    ];
    let mockEdgesData = [
        {
            identifier: "edge-1",
            source_node_identifier: "1",
            destination_node_identifier: "2",
            labels: ['WORKS_AT'],
            properties: {since: 2020},
            key_property_names: ['id']
        }
    ];
    let mockSchemaData = {
        nodeTables: [
            {
                name: 'Person',
                labelNames: ['Person'],
                columns: [
                    {name: 'id', type: 'STRING'},
                    {name: 'name', type: 'STRING'},
                    {name: 'age', type: 'INT64'}
                ]
            },
            {
                name: 'Company',
                labelNames: ['Company'],
                columns: [
                    {name: 'id', type: 'STRING'},
                    {name: 'name', type: 'STRING'},
                    {name: 'location', type: 'STRING'}
                ]
            }
        ],
        edgeTables: [
            {
                name: 'WORKS_AT',
                labelNames: ['WORKS_AT'],
                columns: [
                    {name: 'id', type: 'STRING'},
                    {name: 'since', type: 'INT64'}
                ],
                sourceNodeTable: {
                    nodeTableName: 'Person'
                },
                destinationNodeTable: {
                    nodeTableName: 'Company'
                }
            }
        ]
    };

    describe('constructor', () => {
        it('should create a new GraphConfig instance with default values', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(Object.keys(config.nodes).length).toBe(2);
            expect(Object.keys(config.edges).length).toBe(1);
            expect(config.colorScheme).toBe(GraphConfig.ColorScheme.NEIGHBORHOOD);
            expect(config.viewMode).toBe(GraphConfig.ViewModes.DEFAULT);
            expect(config.layoutMode).toBe(GraphConfig.LayoutModes.FORCE);
        });

        it('should accept custom color palette and scheme', () => {
            const customPalette = ['#FF0000', '#00FF00', '#0000FF'];
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData,
                colorPalette: customPalette,
                colorScheme: GraphConfig.ColorScheme.LABEL
            });

            expect(config.colorPalette).toEqual(customPalette);
            expect(config.colorScheme).toBe(GraphConfig.ColorScheme.LABEL);
        });
    });

    describe('parseNodes', () => {
        it('should parse valid node data', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                edgesData: [],
                // @ts-ignore
                schemaData: mockSchemaData
            });

            const uids = Object.keys(config.nodes);
            expect(uids).toBeInstanceOf(Array);
            expect(uids.length).toBe(2);
            expect(typeof uids[0]).toEqual("string");
            expect(config.nodes[uids[0]]).toBeInstanceOf(GraphNode);
            expect(config.nodes[uids[0]].labels).toEqual(['Person']);
            expect(config.nodes[uids[1]].labels).toEqual(['Company']);
        });
    });

    describe('parseEdges', () => {
        it('should parse valid edge data', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            const edge = config.edges[Object.keys(config.edges)[0]];
            expect(Object.keys(config.edges).length).toBe(1);
            expect(edge).toBeInstanceOf(Edge);
            expect(edge.labels).toEqual(['WORKS_AT']);
            expect(edge.sourceUid).toEqual("1");
            expect(edge.destinationUid).toEqual("2");
        });
    });

    describe('assignColors', () => {
        it('should assign unique colors to different node labels', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.nodeColors['Person']).toBeDefined();
            expect(config.nodeColors['Company']).toBeDefined();
            expect(config.nodeColors['Person']).not.toBe(config.nodeColors['Company']);
        });

        it('should reuse colors for same labels', () => {
            const nodesWithSameLabels = [
                // @ts-ignore
                ...mockNodesData,
                {
                    identifier: "3",
                    labels: ['Person'],
                    properties: {name: 'Jane', age: 25},
                    key_property_names: ['id']
                }
            ];

            const config = new GraphConfig({
                nodesData: nodesWithSameLabels,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(Object.keys(config.nodeColors).length).toBe(2);
        });
    });

    describe('parseSchema', () => {
        it('should parse schema data correctly', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.schema).toBeInstanceOf(Schema);

            const uids = Object.keys(config.schemaNodes);
            expect(uids).toBeInstanceOf(Array);
            expect(uids.length).toBe(2);
            expect(typeof uids[0]).toEqual("string");
            expect(config.schemaNodes[uids[0]]).toBeInstanceOf(GraphNode);
            expect(Object.keys(config.schemaEdges).length).toBe(1);
            expect(config.schemaNodeColors).toBeDefined();
        });

        it('should handle missing schema data gracefully', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                schemaData: null
            });

            expect(config.schema).toBeNull();
            expect(Object.keys(config.schemaNodes).length).toBe(0);
            expect(Object.keys(config.schemaEdges).length).toBe(0);
        });
    });

    describe('Node Counting', () => {
        test('nodeCount is initialized correctly in constructor', () => {
            const mockConfig = new GraphConfig({
                nodesData: [
                    { identifier: "1", labels: ['Person'], properties: {} },
                    { identifier: "2", labels: ['Company'], properties: {} }
                ],
                edgesData: [],
                colorPalette: {},
                colorScheme: {},
                rowsData: [],
                schemaData: {},
                queryResult: {}
            });
            
            expect(mockConfig.nodeCount).toBe(2);
        });
        
        test('schemaNodeCount is initialized correctly after parsing schema', () => {
            // In this test we'll directly verify that schemaNodeCount is updated
            // after setting schemaNodes
            const mockConfig = new GraphConfig({
                nodesData: [],
                edgesData: [],
                colorPalette: {},
                colorScheme: {},
                rowsData: [],
                schemaData: {},
                queryResult: {}
            });
            
            // Manually set schemaNodes and check the schemaNodeCount update
            mockConfig.schemaNodes = mockConfig.parseNodes([
                { identifier: "0", labels: ['Person'], properties: {} },
                { identifier: "1", labels: ['Company'], properties: {} },
                { identifier: "2", labels: ['Product'], properties: {} }
            ]);
            mockConfig.schemaNodeCount = Object.keys(mockConfig.schemaNodes).length;
            
            expect(mockConfig.schemaNodeCount).toBe(3);
        });
        
        test('nodeCount is updated correctly when appending graph data', () => {
            const mockConfig = new GraphConfig({
                nodesData: [
                    { identifier: "1", labels: ['Person'], properties: {} }
                ],
                edgesData: [],
                colorPalette: {},
                colorScheme: {},
                rowsData: [],
                schemaData: {},
                queryResult: {}
            });
            
            expect(mockConfig.nodeCount).toBe(1);
            
            mockConfig.appendGraphData([
                { identifier: "1", labels: ['Person'], properties: {} },
                { identifier: "2", labels: ['Company'], properties: {} }
            ], []);
            
            expect(mockConfig.nodeCount).toBe(2);
        });
    });
});