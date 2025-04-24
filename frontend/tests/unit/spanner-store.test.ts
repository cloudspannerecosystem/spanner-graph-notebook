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
import GraphStore from '../../src/spanner-store';
// @ts-ignore
import GraphConfig from '../../src/spanner-config';
// @ts-ignore
import GraphNode from '../../src/models/node';
// @ts-ignore
import Edge from '../../src/models/edge';

describe('GraphStore', () => {
    let store: typeof GraphStore;
    let mockConfig: typeof GraphConfig;
    let mockNode1: typeof GraphNode;
    let mockNode2: typeof GraphNode;
    let mockEdge: typeof Edge;

    beforeEach(() => {
        const mockNode1Data = {identifier: '1', labels: ['TestLabel1']};
        const mockNode2Data = {identifier: '2', labels: ['TestLabel2']};
        const mockEdgeData = {
            identifier: "edge-1",
            source_node_identifier: mockNode1Data.identifier,
            destination_node_identifier: mockNode2Data.identifier,
            labels: ['testEdgeLabel1']
        };

        const mockPropertyDeclarations = [
            {name: 'age', type: 'INT64'},
            {name: 'name', type: 'STRING'},
            {name: 'active', type: 'BOOL'}
        ];

        const mockNodeTable = {
            name: 'Users',
            labelNames: ['User'],
            propertyDefinitions: [
                {propertyDeclarationName: 'age'},
                {propertyDeclarationName: 'name'}
            ],
            keyColumns: ['id'],
            kind: 'NODE',
            baseCatalogName: 'test',
            baseSchemaName: 'test',
            baseTableName: 'users'
        };

        const mockNodeTable2 = {
            name: 'Posts',
            labelNames: ['Post'],
            propertyDefinitions: [
                {propertyDeclarationName: 'name'}
            ],
            keyColumns: ['id'],
            kind: 'NODE',
            baseCatalogName: 'test',
            baseSchemaName: 'test',
            baseTableName: 'posts'
        };

        const mockEdgeTable = {
            name: 'Follows',
            labelNames: ['FOLLOWS'],
            propertyDefinitions: [
                {propertyDeclarationName: 'active'}
            ],
            keyColumns: ['id'],
            kind: 'EDGE',
            sourceNodeTable: {
                nodeTableName: 'Users',
                edgeTableColumns: ['source_id'],
                nodeTableColumns: ['id']
            },
            destinationNodeTable: {
                nodeTableName: 'Users',
                edgeTableColumns: ['target_id'],
                nodeTableColumns: ['id']
            },
            baseCatalogName: 'test',
            baseSchemaName: 'test',
            baseTableName: 'follows'
        };

        const mockEdgeTable2 = {
            name: 'Created',
            labelNames: ['CREATED'],
            propertyDefinitions: [],
            keyColumns: ['id'],
            kind: 'EDGE',
            sourceNodeTable: {
                nodeTableName: 'Users',
                edgeTableColumns: ['user_id'],
                nodeTableColumns: ['id']
            },
            destinationNodeTable: {
                nodeTableName: 'Posts',
                edgeTableColumns: ['post_id'],
                nodeTableColumns: ['id']
            },
            baseCatalogName: 'test',
            baseSchemaName: 'test',
            baseTableName: 'created'
        };

        const mockSchemaData = {
            catalog: 'test',
            schema: 'test',
            name: 'test_schema',
            labels: 2,
            nodeTables: [mockNodeTable, mockNodeTable2],
            edgeTables: [mockEdgeTable, mockEdgeTable2],
            propertyDeclarations: mockPropertyDeclarations,
        };

        mockConfig = new GraphConfig({
            nodesData: [mockNode1Data, mockNode2Data],
            edgesData: [mockEdgeData],
            colorScheme: GraphConfig.ColorScheme.LABEL,
            rowsData: [],
            schemaData: mockSchemaData
        });

        mockNode1 = mockConfig.nodes[mockNode1Data.identifier];
        mockNode2 = mockConfig.nodes[mockNode2Data.identifier];
        mockEdge = mockConfig.edges[Object.keys(mockConfig.edges)[0]];

        store = new GraphStore(mockConfig);
    });

    describe('Event Handling', () => {
        it('should add and trigger FOCUS_OBJECT event listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.FOCUS_OBJECT, mockCallback);

            // Trigger event
            store.setFocusedObject(mockNode1);

            // Verify callback
            expect(mockCallback).toHaveBeenCalledWith(mockNode1, expect.any(GraphConfig));
        });

        it('should add and trigger SELECT_OBJECT event listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.SELECT_OBJECT, mockCallback);

            // Trigger event
            store.setSelectedObject(mockNode1);

            // Verify callback
            expect(mockCallback).toHaveBeenCalledWith(mockNode1, expect.any(GraphConfig));
        });


        it('should add and trigger COLOR_SCHEME event listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.COLOR_SCHEME, mockCallback);

            // Trigger event
            store.setColorScheme(GraphConfig.ColorScheme.NEIGHBORHOOD);

            // Verify callback
            expect(mockCallback).toHaveBeenCalledWith(GraphConfig.ColorScheme.NEIGHBORHOOD, expect.any(GraphConfig));
        });

        it('should add and trigger VIEW_MODE_CHANGE event listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE, mockCallback);

            // Trigger event
            store.setViewMode(GraphConfig.ViewModes.SCHEMA);

            // Verify callback
            expect(mockCallback).toHaveBeenCalledWith(GraphConfig.ViewModes.SCHEMA, expect.any(GraphConfig));
        });

        it('should add and trigger LAYOUT_MODE_CHANGE event listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.LAYOUT_MODE_CHANGE, mockCallback);
            const lastLayout = store.config.layoutMode;

            // Trigger event
            store.setLayoutMode(GraphConfig.LayoutModes.TOP_DOWN);

            // Verify callback
            expect(mockCallback).toHaveBeenCalledWith(GraphConfig.LayoutModes.TOP_DOWN, lastLayout, expect.any(GraphConfig));
        });

        it('should add and trigger SHOW_LABELS event listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.SHOW_LABELS, mockCallback);

            // Trigger event
            store.showLabels(true);

            // Verify callback
            expect(mockCallback).toHaveBeenCalledWith(true, expect.any(GraphConfig));
        });

        it('should throw an error for invalid event type', () => {
            expect(() => {
                store.addEventListener('INVALID_EVENT' as any, () => {
                });
            }).toThrow();
        });
    });

    describe('View Mode Management', () => {
        it('should set view mode and notify listeners', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE, mockCallback);

            store.setViewMode(GraphConfig.ViewModes.SCHEMA);
            expect(mockCallback).toHaveBeenCalledWith(GraphConfig.ViewModes.SCHEMA, expect.any(GraphConfig));
        });

        it('should not notify if setting same view mode', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE, mockCallback);

            store.setViewMode(store.config.viewMode);
            expect(mockCallback).not.toHaveBeenCalled();
        });
    });

    describe('Object Selection and Focus', () => {
        it('should set and notify about focused object', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.FOCUS_OBJECT, mockCallback);

            store.setFocusedObject(mockNode1);
            expect(mockCallback).toHaveBeenCalledWith(mockNode1, expect.any(GraphConfig));
        });

        it('should set and notify about selected object', () => {
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.SELECT_OBJECT, mockCallback);

            store.setSelectedObject(mockNode1);
            expect(mockCallback).toHaveBeenCalledWith(mockNode1, expect.any(GraphConfig));
        });
    });

    describe('Nodes', () => {
        it('should retrieve an array of nodes in default view mode', () => {
            store.setViewMode(GraphConfig.ViewModes.DEFAULT);
            const nodes = store.getNodes();
            expect(nodes).toHaveLength(2);
            expect(nodes).toContainEqual(mockNode1);
            expect(nodes).toContainEqual(mockNode2);
        });

        it('should retrieve schema nodes in schema view mode', () => {
            // Set up some schema nodes
            const schemaNode1 = new GraphNode({identifier: '1', labels: ['Users']});
            const schemaNode2 = new GraphNode({identifier: '2', labels: ['Posts']});
            store.config.schemaNodes = {
                [schemaNode1.uid]: schemaNode1,
                [schemaNode2.uid]: schemaNode2
            };

            store.setViewMode(GraphConfig.ViewModes.SCHEMA);
            const nodes = store.getNodes();
            expect(nodes).toHaveLength(2);
            expect(nodes).toContainEqual(schemaNode1);
            expect(nodes).toContainEqual(schemaNode2);
        });

        it('should return empty array for unsupported view mode', () => {
            // @ts-ignore - Intentionally setting invalid view mode for test
            store.config.viewMode = 'INVALID_MODE';
            const nodes = store.getNodes();
            expect(nodes).toHaveLength(0);
        });

        it('should get color by label', () => {
            store.config.nodeColors = {'TestLabel1': 'red'};
            const color = store.getColorForNodeByLabel(mockNode1);
            expect(color).toBe('red');
        });

        it('should handle duplicate UIDs in node construction', () => {
            const node1Data = {identifier: 'same-uid', labels: ['Test1']};
            const node2Data = {identifier: 'same-uid', labels: ['Test2']};

            // Create a new config with duplicate UIDs
            const configWithDupes = new GraphConfig({
                nodesData: [node1Data, node2Data],
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            // The last node with the same UID should be the one that remains
            expect(Object.keys(configWithDupes.nodes)).toHaveLength(1);
            expect(configWithDupes.nodes['same-uid'].uid).toEqual(node2Data.identifier);
        });

        it('should properly convert node arrays to maps', () => {
            const nodeDataArray = [
                {identifier: 'uid1', labels: ['Test1']},
                {identifier: 'uid2', labels: ['Test2']},
                {identifier: 'uid3', labels: ['Test3']}
            ];

            const configFromArray = new GraphConfig({
                nodesData: nodeDataArray,
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            // Verify the conversion to map
            expect(Object.keys(configFromArray.nodes)).toHaveLength(3);
            expect(configFromArray.nodes['uid1'].uid).toBe('uid1');
            expect(configFromArray.nodes['uid2'].uid).toBe('uid2');
            expect(configFromArray.nodes['uid3'].uid).toBe('uid3');
        });

        it('should maintain node references when converting between formats', () => {
            // Create nodes and edges with references
            const nodeData1 = {identifier: 'uid1', labels: ['Test1']};
            const nodeData2 = {identifier: 'uid2', labels: ['Test2']};
            const edgeData = {
                identifier: 'edge-1',
                source_node_identifier: nodeData1.identifier,
                destination_node_identifier: nodeData2.identifier,
                labels: ['connects']
            };

            const config = new GraphConfig({
                nodesData: [nodeData1, nodeData2],
                edgesData: [edgeData],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            const store = new GraphStore(config);
            const nodes = store.getNodes();

            // Verify nodes in array maintain same references
            const node1InArray = nodes.find((n: typeof GraphNode) => n.uid === 'uid1');
            const node2InArray = nodes.find((n: typeof GraphNode) => n.uid === 'uid2');
            expect(node1InArray).toBe(config.nodes['uid1']);
            expect(node2InArray).toBe(config.nodes['uid2']);
        });
    });

    describe('Graph Navigation', () => {
        /**
         * todo: Presently, this is depending on the node/edge data to have
         * been mutated by ForceGraph.
         */
        
        it('should return edges connected to a given node', () => {
            // Create test nodes
            const node1Data = {identifier: 'test1', labels: ['Label1']};
            const node2Data = {identifier: 'test2', labels: ['Label2']};
            const node3Data = {identifier: 'test3', labels: ['Label3']};

            // Create test edges
            const edge1Data = {
                identifier: 'edge1',
                source_node_identifier: node1Data.identifier,
                destination_node_identifier: node2Data.identifier,
                labels: ['CONNECTS']
            };
            
            const edge2Data = {
                identifier: 'edge2',
                source_node_identifier: node2Data.identifier,
                destination_node_identifier: node3Data.identifier,
                labels: ['CONNECTS']
            };
            
            // Create a new config with these test objects
            const testConfig = new GraphConfig({
                nodesData: [
                    node1Data, node2Data, node3Data
                ],
                edgesData: [
                    edge1Data, edge2Data
                ],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });
            
            const store = new GraphStore(testConfig);

            // ForceGraph sets these automatically, but we need to set them manually for testing
            testConfig.edges[edge1Data.identifier].sourceNode = testConfig.nodes[edge1Data.source_node_identifier];
            testConfig.edges[edge1Data.identifier].destinationNode = testConfig.nodes[edge1Data.destination_node_identifier];
            testConfig.edges[edge2Data.identifier].sourceNode = testConfig.nodes[edge2Data.source_node_identifier];
            testConfig.edges[edge2Data.identifier].destinationNode = testConfig.nodes[edge2Data.destination_node_identifier];

            // Test edges for node1 (should have edge1 only)
            const node1Edges = store.getEdgesOfNode(testConfig.nodes[node1Data.identifier]);
            expect(node1Edges.size).toBe(1);
            expect(node1Edges).toContain(testConfig.edges[edge1Data.identifier]);
            
            // Test edges for node2 (should have both edge1 and edge2)
            const node2Edges = store.getEdgesOfNode(testConfig.nodes[node2Data.identifier]);
            expect(node2Edges.size).toBe(2);
            expect(node2Edges).toContain(testConfig.edges[edge1Data.identifier]);
            expect(node2Edges).toContain(testConfig.edges[edge2Data.identifier]);
            
            // Test edges for node3 (should have edge2 only)
            const node3Edges = store.getEdgesOfNode(testConfig.nodes[node3Data.identifier]);
            expect(node3Edges.size).toBe(1);
            expect(node3Edges).toContain(testConfig.edges[edge2Data.identifier]);
            
            // Test with null/invalid input
            expect(store.getEdgesOfNode(null).size).toBe(0);
            expect(store.getEdgesOfNode(undefined).size).toBe(0);
            expect(store.getEdgesOfNode({} as any).size).toBe(0);
        });

        it('should return neighbors of a given node', () => {
            // Create test nodes
            const node1Data = {identifier: 'test1', labels: ['Label1']};
            const node2Data = {identifier: 'test2', labels: ['Label2']};
            const node3Data = {identifier: 'test3', labels: ['Label3']};
            const node4Data = {identifier: 'test4', labels: ['Label4']};

            // Create test edges
            const edge1Data = {
                identifier: 'edge1',
                source_node_identifier: node1Data.identifier,
                destination_node_identifier: node2Data.identifier,
                labels: ['CONNECTS']
            };
            
            const edge2Data = {
                identifier: 'edge2',
                source_node_identifier: node2Data.identifier,
                destination_node_identifier: node3Data.identifier,
                labels: ['CONNECTS']
            };

            const edge3Data = {
                identifier: 'edge3',
                source_node_identifier: node2Data.identifier,
                destination_node_identifier: node4Data.identifier,
                labels: ['CONNECTS']
            };
            
            // Create a new config with these test objects
            const testConfig = new GraphConfig({
                nodesData: [
                    node1Data, node2Data, node3Data, node4Data
                ],
                edgesData: [
                    edge1Data, edge2Data, edge3Data
                ],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });
            
            const store = new GraphStore(testConfig);

            // ForceGraph sets these automatically, but we need to set them manually for testing
            testConfig.edges[edge1Data.identifier].source = testConfig.nodes[edge1Data.source_node_identifier];
            testConfig.edges[edge1Data.identifier].target = testConfig.nodes[edge1Data.destination_node_identifier];
            testConfig.edges[edge2Data.identifier].source = testConfig.nodes[edge2Data.source_node_identifier];
            testConfig.edges[edge2Data.identifier].target = testConfig.nodes[edge2Data.destination_node_identifier];
            testConfig.edges[edge3Data.identifier].source = testConfig.nodes[edge3Data.source_node_identifier];
            testConfig.edges[edge3Data.identifier].target = testConfig.nodes[edge3Data.destination_node_identifier];

            // Test neighbors of node1 (should only have node2)
            const node1Neighbors = store.getNeighborsOfNode(testConfig.nodes[node1Data.identifier]);
            const node1NeighborUids = Object.keys(node1Neighbors);
            expect(node1NeighborUids.length).toBe(1);
            expect(node1NeighborUids).toContain(node2Data.identifier);

            // Test neighbors of node2 (should have node1, node3, and node4)
            const node2Neighbors = store.getNeighborsOfNode(testConfig.nodes[node2Data.identifier]);
            const node2NeighborUids = Object.keys(node2Neighbors);
            expect(Object.keys(node2Neighbors).length).toBe(3);
            expect(node2NeighborUids).toContain(node1Data.identifier);
            expect(node2NeighborUids).toContain(node3Data.identifier);
            expect(node2NeighborUids).toContain(node4Data.identifier);

            // Test neighbors of node3 (should only have node2)
            const node3Neighbors = store.getNeighborsOfNode(testConfig.nodes[node3Data.identifier]);
            const node3NeighborUids = Object.keys(node3Neighbors);
            expect(node3NeighborUids.length).toBe(1);
            expect(node3NeighborUids).toContain(node2Data.identifier);

            // Test neighbors of node4 (should only have node2)
            const node4Neighbors = store.getNeighborsOfNode(testConfig.nodes[node4Data.identifier]);
            const node4NeighborUids = Object.keys(node4Neighbors);
            expect(node4NeighborUids.length).toBe(1);
            expect(node4NeighborUids).toContain(node2Data.identifier);

            // Test with null/invalid input
            expect(store.getNeighborsOfNode(null)).toEqual({});
            expect(store.getNeighborsOfNode(undefined)).toEqual({});
            expect(store.getNeighborsOfNode({} as any)).toEqual({});
        });

        it('should return edges of a graph object', () => {
            // Create test nodes
            const node1Data = {identifier: 'test1', labels: ['Label1']};
            const node2Data = {identifier: 'test2', labels: ['Label2']};
            const node3Data = {identifier: 'test3', labels: ['Label3']};

            // Create test edges
            const edge1Data = {
                identifier: 'edge1',
                source_node_identifier: node1Data.identifier,
                destination_node_identifier: node2Data.identifier,
                labels: ['CONNECTS']
            };
            
            const edge2Data = {
                identifier: 'edge2',
                source_node_identifier: node2Data.identifier,
                destination_node_identifier: node3Data.identifier,
                labels: ['CONNECTS']
            };
            
            // Create a new config with these test objects
            const testConfig = new GraphConfig({
                nodesData: [node1Data, node2Data, node3Data],
                edgesData: [edge1Data, edge2Data],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });
            
            const store = new GraphStore(testConfig);

            // ForceGraph sets these automatically, but we need to set them manually for testing
            testConfig.edges[edge1Data.identifier].sourceNode = testConfig.nodes[edge1Data.source_node_identifier];
            testConfig.edges[edge1Data.identifier].destinationNode = testConfig.nodes[edge1Data.destination_node_identifier];
            testConfig.edges[edge2Data.identifier].sourceNode = testConfig.nodes[edge2Data.source_node_identifier];
            testConfig.edges[edge2Data.identifier].destinationNode = testConfig.nodes[edge2Data.destination_node_identifier];

            // Test edges for node object
            const nodeEdges = store.getEdgesOfObject(testConfig.nodes[node2Data.identifier]);
            expect(nodeEdges.size).toBe(2);
            expect(nodeEdges).toContain(testConfig.edges[edge1Data.identifier]);
            expect(nodeEdges).toContain(testConfig.edges[edge2Data.identifier]);

            // Test with null/invalid input
            expect(store.getEdgesOfObject(null).size).toBe(0);
            expect(store.getEdgesOfObject(undefined).size).toBe(0);
            expect(store.getEdgesOfObject({} as any).size).toBe(0);
        });

        describe('Edge and Node Relationships', () => {
            let node1: typeof GraphNode;
            let node2: typeof GraphNode;
            let node3: typeof GraphNode;
            let edge1: typeof Edge;
            let edge2: typeof Edge;

            beforeEach(() => {
                // Create test nodes
                const node1Data = {identifier: 'test1', labels: ['Label1']};
                const node2Data = {identifier: 'test2', labels: ['Label2']};
                const node3Data = {identifier: 'test3', labels: ['Label3']};

                // Create test edges
                const edge1Data = {
                    identifier: 'edge1',
                    source_node_identifier: node1Data.identifier,
                    destination_node_identifier: node2Data.identifier,
                    labels: ['CONNECTS']
                };
                
                const edge2Data = {
                    identifier: 'edge2',
                    source_node_identifier: node2Data.identifier,
                    destination_node_identifier: node3Data.identifier,
                    labels: ['CONNECTS']
                };
                
                // Create a new config with these test objects
                const testConfig = new GraphConfig({
                    nodesData: [node1Data, node2Data, node3Data],
                    edgesData: [edge1Data, edge2Data],
                    colorScheme: GraphConfig.ColorScheme.LABEL,
                    rowsData: [],
                    schemaData: null
                });
                
                store = new GraphStore(testConfig);
                
                // Get references to nodes and edges
                node1 = testConfig.nodes[node1Data.identifier];
                node2 = testConfig.nodes[node2Data.identifier];
                node3 = testConfig.nodes[node3Data.identifier];
                edge1 = testConfig.edges[edge1Data.identifier];
                edge2 = testConfig.edges[edge2Data.identifier];

                // Set up edge source/destination references
                edge1.source = node1;
                edge1.target = node2;
                edge2.source = node2;
                edge2.target = node3;
            });

            describe('edgeIsConnectedToNode', () => {
                it('should return true when node is source of edge', () => {
                    expect(store.edgeIsConnectedToNode(edge1, node1)).toBe(true);
                    expect(store.edgeIsConnectedToNode(edge2, node2)).toBe(true);
                });

                it('should return true when node is destination of edge', () => {
                    expect(store.edgeIsConnectedToNode(edge1, node2)).toBe(true);
                    expect(store.edgeIsConnectedToNode(edge2, node3)).toBe(true);
                });

                it('should return false when node is not connected to edge', () => {
                    expect(store.edgeIsConnectedToNode(edge1, node3)).toBe(false);
                    expect(store.edgeIsConnectedToNode(edge2, node1)).toBe(false);
                });

                it('should handle null/undefined inputs', () => {
                    expect(store.edgeIsConnectedToNode(null, node1)).toBe(false);
                    expect(store.edgeIsConnectedToNode(edge1, null)).toBe(false);
                    expect(store.edgeIsConnectedToNode(undefined, node1)).toBe(false);
                    expect(store.edgeIsConnectedToNode(edge1, undefined)).toBe(false);
                });
            });

            describe('nodeIsNeighborTo', () => {
                it('should return true for directly connected nodes', () => {
                    expect(store.nodeIsNeighborTo(node1, node2)).toBe(true);
                    expect(store.nodeIsNeighborTo(node2, node3)).toBe(true);
                });

                it('should return true regardless of edge direction', () => {
                    expect(store.nodeIsNeighborTo(node2, node1)).toBe(true);
                    expect(store.nodeIsNeighborTo(node3, node2)).toBe(true);
                });

                it('should return false for unconnected nodes', () => {
                    expect(store.nodeIsNeighborTo(node1, node3)).toBe(false);
                    expect(store.nodeIsNeighborTo(node3, node1)).toBe(false);
                });

                it('should handle null/undefined inputs', () => {
                    expect(store.nodeIsNeighborTo(null, node1)).toBe(false);
                    expect(store.nodeIsNeighborTo(node1, null)).toBe(false);
                    expect(store.nodeIsNeighborTo(undefined, node1)).toBe(false);
                    expect(store.nodeIsNeighborTo(node1, undefined)).toBe(false);
                });
            });

            describe('edgeIsConnectedToFocusedNode', () => {
                it('should return true when edge is connected to focused node', () => {
                    store.setFocusedObject(node1);
                    expect(store.edgeIsConnectedToFocusedNode(edge1)).toBe(true);
                    
                    store.setFocusedObject(node2);
                    expect(store.edgeIsConnectedToFocusedNode(edge1)).toBe(true);
                    expect(store.edgeIsConnectedToFocusedNode(edge2)).toBe(true);
                });

                it('should return false when edge is not connected to focused node', () => {
                    store.setFocusedObject(node3);
                    expect(store.edgeIsConnectedToFocusedNode(edge1)).toBe(false);
                    
                    store.setFocusedObject(node1);
                    expect(store.edgeIsConnectedToFocusedNode(edge2)).toBe(false);
                });

                it('should return false when no node is focused', () => {
                    store.setFocusedObject(null);
                    expect(store.edgeIsConnectedToFocusedNode(edge1)).toBe(false);
                    expect(store.edgeIsConnectedToFocusedNode(edge2)).toBe(false);
                });

                it('should handle null/undefined inputs', () => {
                    store.setFocusedObject(node1);
                    expect(store.edgeIsConnectedToFocusedNode(null)).toBe(false);
                    expect(store.edgeIsConnectedToFocusedNode(undefined)).toBe(false);
                });
            });

            describe('edgeIsConnectedToSelectedNode', () => {
                it('should return true when edge is connected to selected node', () => {
                    store.setSelectedObject(node1);
                    expect(store.edgeIsConnectedToSelectedNode(edge1)).toBe(true);
                    
                    store.setSelectedObject(node2);
                    expect(store.edgeIsConnectedToSelectedNode(edge1)).toBe(true);
                    expect(store.edgeIsConnectedToSelectedNode(edge2)).toBe(true);
                });

                it('should return false when edge is not connected to selected node', () => {
                    store.setSelectedObject(node3);
                    expect(store.edgeIsConnectedToSelectedNode(edge1)).toBe(false);
                    
                    store.setSelectedObject(node1);
                    expect(store.edgeIsConnectedToSelectedNode(edge2)).toBe(false);
                });

                it('should return false when no node is selected', () => {
                    store.setSelectedObject(null);
                    expect(store.edgeIsConnectedToSelectedNode(edge1)).toBe(false);
                    expect(store.edgeIsConnectedToSelectedNode(edge2)).toBe(false);
                });

                it('should handle null/undefined inputs', () => {
                    store.setSelectedObject(node1);
                    expect(store.edgeIsConnectedToSelectedNode(null)).toBe(false);
                    expect(store.edgeIsConnectedToSelectedNode(undefined)).toBe(false);
                });
            });
        });
    });

    describe('Edge Design', () => {
        it('should return selected design for selected edge', () => {
            store.setSelectedObject(mockEdge);
            const design = store.getEdgeDesign(mockEdge);
            expect(design).toBe(store.config.edgeDesign.selected);
        });

        it('should return default design for unrelated edges', () => {
            const sourceNode = new GraphNode({identifier: '3', labels: ['foo']});
            const destinationNode = new GraphNode({identifier: '4', labels: ['bar']});
            const unrelatedEdge = new Edge({
                identifier: 'edge-identifier',
                source_node_identifier: sourceNode.uid, destination_node_identifier: destinationNode.uid,
                sourceNode, destinationNode, labels: ['Edge Label']
            });

            const design = store.getEdgeDesign(unrelatedEdge);
            expect(design).toBe(store.config.edgeDesign.default);
        });
    });

    describe('Property Type Resolution', () => {
        let userNode: typeof GraphNode;
        let postNode: typeof GraphNode;
        let multiLabelNode: typeof GraphNode;

        beforeEach(() => {
            // Create test nodes with different labels
            userNode = new GraphNode({ identifier: 'user1', labels: ['User'] });
            postNode = new GraphNode({ identifier: 'post1', labels: ['Post'] });
            multiLabelNode = new GraphNode({ identifier: 'multi1', labels: ['User', 'Post'] });
        });

        it('should return correct property type for a node', () => {
            const ageType = store.getPropertyType(userNode, 'age');
            const nameType = store.getPropertyType(userNode, 'name');
            
            expect(ageType).toBe('INT64');
            expect(nameType).toBe('STRING');
        });

        it('should return correct property type for a different node type', () => {
            const nameType = store.getPropertyType(postNode, 'name');
            expect(nameType).toBe('STRING');
        });

        it('should handle nodes with multiple labels', () => {
            const nameType = store.getPropertyType(multiLabelNode, 'name');
            const ageType = store.getPropertyType(multiLabelNode, 'age');
            
            expect(nameType).toBe('STRING');
            expect(ageType).toBe('INT64');
        });

        it('should return null for non-existent property', () => {
            const nonExistentType = store.getPropertyType(userNode, 'nonexistent');
            expect(nonExistentType).toBeNull();
        });

        it('should return null for non-existent node label', () => {
            const invalidNode = new GraphNode({ identifier: 'invalid1', labels: ['NonExistentLabel'] });
            const propertyType = store.getPropertyType(invalidNode, 'name');
            expect(propertyType).toBeNull();
        });

        it('should handle null/undefined inputs', () => {
            expect(store.getPropertyType(null, 'name')).toBeNull();
            expect(store.getPropertyType(undefined, 'name')).toBeNull();
            expect(store.getPropertyType(userNode, null)).toBeNull();
            expect(store.getPropertyType(userNode, undefined)).toBeNull();
        });

        it('should handle nodes with no matching property declarations', () => {
            // Create a store with schema data that has no property declarations
            const configWithoutDeclarations = new GraphConfig({
                nodesData: [],
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: {
                    nodeTables: [{
                        name: 'Users',
                        labelNames: ['User'],
                        propertyDefinitions: [{ propertyDeclarationName: 'age' }],
                        keyColumns: ['id'],
                        kind: 'NODE',
                        baseCatalogName: 'test',
                        baseSchemaName: 'test',
                        baseTableName: 'users'
                    }],
                    propertyDeclarations: []
                }
            });
            const storeWithoutDeclarations = new GraphStore(configWithoutDeclarations);
            
            expect(storeWithoutDeclarations.getPropertyType(userNode, 'age')).toBeNull();
        });
    });

    describe('getNodeCount', () => {
        test('returns nodeCount in DEFAULT view mode', () => {
            mockConfig = new GraphConfig({
                nodesData: [],
                edgesData: [],
                colorPalette: {},
                colorScheme: {},
                rowsData: [],
                schemaData: {},
                queryResult: {}
            });
            mockConfig.viewMode = GraphConfig.ViewModes.DEFAULT;
            mockConfig.nodeCount = 5;
            mockConfig.schemaNodeCount = 3;
            
            store = new GraphStore(mockConfig);
            
            expect(store.getNodeCount()).toBe(5);
        });
        
        test('returns schemaNodeCount in SCHEMA view mode', () => {
            mockConfig = new GraphConfig({
                nodesData: [],
                edgesData: [],
                colorPalette: {},
                colorScheme: {},
                rowsData: [],
                schemaData: {},
                queryResult: {}
            });
            mockConfig.viewMode = GraphConfig.ViewModes.SCHEMA;
            mockConfig.nodeCount = 5;
            mockConfig.schemaNodeCount = 3;
            
            store = new GraphStore(mockConfig);
            
            expect(store.getNodeCount()).toBe(3);
        });
    });

    it('should sort edge types correctly with getEdgeTypesOfNodeSorted', () => {
        const mockSchema = {
            nodeTables: [
                {
                    name: 'Person',
                    labelNames: ['Person']
                }
            ],
            edgeTables: [
                {
                    sourceNodeTable: { nodeTableName: 'Person' },
                    destinationNodeTable: { nodeTableName: 'OtherTable' },
                    labelNames: ['KNOWS', 'CREATED']
                },
                {
                    sourceNodeTable: { nodeTableName: 'OtherTable' },
                    destinationNodeTable: { nodeTableName: 'Person' },
                    labelNames: ['FOLLOWS', 'BELONGS_TO']
                }
            ]
        };

        const nodeData = { identifier: 'person1', labels: ['Person'] };

        const testConfig = new GraphConfig({
            nodesData: [nodeData],
            edgesData: [],
            colorScheme: GraphConfig.ColorScheme.LABEL,
            rowsData: [],
            schemaData: mockSchema
        });

        const store = new GraphStore(testConfig);
        const node = testConfig.nodes[nodeData.identifier];

        const sortedEdgeTypes = store.getEdgeTypesOfNodeSorted(node);

        expect(sortedEdgeTypes.length).toBe(4);

        expect(sortedEdgeTypes[0].direction).toBe('INCOMING');
        expect(sortedEdgeTypes[1].direction).toBe('INCOMING');
        expect(sortedEdgeTypes[0].label).toBe('BELONGS_TO');
        expect(sortedEdgeTypes[1].label).toBe('FOLLOWS');

        expect(sortedEdgeTypes[2].direction).toBe('OUTGOING');
        expect(sortedEdgeTypes[3].direction).toBe('OUTGOING');
        expect(sortedEdgeTypes[2].label).toBe('CREATED');
        expect(sortedEdgeTypes[3].label).toBe('KNOWS');

        expect(store.getEdgeTypesOfNodeSorted(null)).toEqual([]);
        expect(store.getEdgeTypesOfNodeSorted(undefined)).toEqual([]);
        expect(store.getEdgeTypesOfNodeSorted({} as any)).toEqual([]);
    });

    describe('Intermediate Node Handling', () => {
        test('should return correct color for intermediate nodes', () => {
            const intermediateNode = new GraphNode({
                identifier: "1",
                labels: ['Person'],
                properties: {},
                intermediate: true
            });

            const color = store.getColorForNodeByLabel(intermediateNode);
            expect(color).toBe('rgb(128, 134, 139)');
        });

        test('should return correct color for non-intermediate nodes', () => {
            const regularNode = new GraphNode({
                identifier: "1",
                labels: ['Person'],
                properties: {}
            });

            // Set up the node color explicitly for the test
            store.config.nodeColors['Person'] = '#FF0000';
            
            const color = store.getColorForNodeByLabel(regularNode);
            expect(color).toBe('#FF0000'); // Now we expect the color we explicitly set
        });

        test('should handle node expansion requests for intermediate nodes', () => {
            const intermediateNode = new GraphNode({
                identifier: "1",
                labels: ['Person'],
                properties: {},
                intermediate: true
            });

            // Mock the event listener
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.NODE_EXPANSION_REQUEST, mockCallback);

            // Request expansion
            store.requestNodeExpansion(intermediateNode, 'OUTGOING', 'CONNECTS_TO');

            // Verify the callback was called with correct parameters
            expect(mockCallback).toHaveBeenCalledWith(
                intermediateNode,
                'OUTGOING',
                'CONNECTS_TO',
                expect.any(Array),
                expect.any(Object)
            );
        });

        test('should handle node expansion requests for non-intermediate nodes', () => {
            const regularNode = new GraphNode({
                identifier: "1",
                labels: ['Person'],
                properties: { name: 'John' }
            });

            // Mock the event listener
            const mockCallback = jest.fn();
            store.addEventListener(GraphStore.EventTypes.NODE_EXPANSION_REQUEST, mockCallback);

            // Request expansion
            store.requestNodeExpansion(regularNode, 'OUTGOING', 'CONNECTS_TO');

            // Verify the callback was called with correct parameters
            expect(mockCallback).toHaveBeenCalledWith(
                regularNode,
                'OUTGOING',
                'CONNECTS_TO',
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'name',
                        value: 'John'
                    })
                ]),
                expect.any(Object)
            );
        });
    });
});