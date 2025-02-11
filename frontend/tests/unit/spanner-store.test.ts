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
const GraphStore = require('../../src/spanner-store');
// @ts-ignore
const GraphConfig = require('../../src/spanner-config');
// @ts-ignore
const GraphNode = require('../../src/models/node');
// @ts-ignore
const Edge = require('../../src/models/edge');

describe('GraphStore', () => {
    let store: typeof GraphStore;
    let mockConfig: typeof GraphConfig;
    let mockNode1: typeof GraphNode;
    let mockNode2: typeof GraphNode;
    let mockEdge: typeof Edge;

    beforeEach(() => {
        mockNode1 = new GraphNode({id: '1', uid: '1', labels: ['TestLabel1'], neighborhood: 1});
        mockNode2 = new GraphNode({id: '2', uid: '2', labels: ['TestLabel2'], neighborhood: 2});
        mockEdge = new Edge({source: mockNode1, target: mockNode2, labels: ['testEdgeLabel1']});

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
            propertyDeclarations: mockPropertyDeclarations
        };

        mockConfig = new GraphConfig({
            nodesData: [mockNode1, mockNode2],
            edgesData: [mockEdge],
            colorScheme: GraphConfig.ColorScheme.LABEL,
            rowsData: [],
            schemaData: mockSchemaData
        });

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
                store.addEventListener('INVALID_EVENT' as any, () => {});
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
            const schemaNode1 = new GraphNode({id: '1', uid: '1', labels: ['Users']});
            const schemaNode2 = new GraphNode({id: '2', uid: '2', labels: ['Posts']});
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

        it('should handle various id formats correctly', () => {
            expect((new GraphNode({ id: '123', uid: '1', labels: ['Test'] })).instantiated).toBe(true);
            expect((new GraphNode({ id: 123, uid: '1', labels: ['Test'] })).instantiated).toBe(true);
            expect((new GraphNode({ id: undefined, uid: '1', labels: ['Test'] })).instantiated).toBe(false);
            expect((new GraphNode({ id: NaN, uid: '1', labels: ['Test'] })).instantiated).toBe(false);
            expect((new GraphNode({ id: {}, uid: '1', labels: ['Test'] })).instantiated).toBe(false);
            expect((new GraphNode({ id: 'foo', uid: '1', labels: ['Test'] })).instantiated).toBe(false);
        });

        it('should properly handle uid field', () => {
            const node = new GraphNode({ 
                id: 1, 
                uid: 'custom-uid',
                labels: ['Test']
            });
            expect(node.uid).toBe('custom-uid');
        });

        it('should handle duplicate UIDs in node construction', () => {
            const node1 = new GraphNode({ id: 1, uid: 'same-uid', labels: ['Test1'] });
            const node2 = new GraphNode({ id: 2, uid: 'same-uid', labels: ['Test2'] });
            
            // Create a new config with duplicate UIDs
            const configWithDupes = new GraphConfig({
                nodesData: [node1, node2],
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            // The last node with the same UID should be the one that remains
            expect(Object.keys(configWithDupes.nodes)).toHaveLength(1);
            expect(configWithDupes.nodes['same-uid']).toEqual(node2);
        });

        it('should properly convert node arrays to maps', () => {
            const nodeArray = [
                new GraphNode({ id: 1, uid: 'uid1', labels: ['Test1'] }),
                new GraphNode({ id: 2, uid: 'uid2', labels: ['Test2'] }),
                new GraphNode({ id: 3, uid: 'uid3', labels: ['Test3'] })
            ];

            const configFromArray = new GraphConfig({
                nodesData: nodeArray,
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            // Verify the conversion to map
            expect(Object.keys(configFromArray.nodes)).toHaveLength(3);
            expect(configFromArray.nodes['uid1'].id).toBe(1);
            expect(configFromArray.nodes['uid2'].id).toBe(2);
            expect(configFromArray.nodes['uid3'].id).toBe(3);
        });

        it('should maintain node references when converting between formats', () => {
            // Create nodes and edges with references
            const node1 = new GraphNode({ id: 1, uid: 'uid1', labels: ['Test1'] });
            const node2 = new GraphNode({ id: 2, uid: 'uid2', labels: ['Test2'] });
            const edge = new Edge({ source: node1, target: node2, labels: ['connects'] });

            const config = new GraphConfig({
                nodesData: [node1, node2],
                edgesData: [edge],
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

        it('should maintain consistent node order in different view modes', () => {
            // Create a set of nodes with specific order
            const nodes = Array.from({ length: 5 }, (_, i) => 
                new GraphNode({ 
                    id: i + 1, 
                    uid: `uid${i + 1}`, 
                    labels: [`Test${i + 1}`],
                    properties: { order: i + 1 }
                })
            );

            const config = new GraphConfig({
                nodesData: nodes,
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            const store = new GraphStore(config);

            // Get nodes in default mode and verify order
            store.setViewMode(GraphConfig.ViewModes.DEFAULT);
            const defaultNodes = store.getNodes();
            defaultNodes.forEach((node: typeof GraphNode, index: number) => {
                expect(node.properties.order).toBe(index + 1);
            });

            // Switch view mode and verify order remains consistent
            store.setViewMode(GraphConfig.ViewModes.SCHEMA);
            store.config.schemaNodes = config.nodes; // Set same nodes as schema nodes for testing
            const schemaNodes = store.getNodes();
            schemaNodes.forEach((node: typeof GraphNode, index: number) => {
                expect(node.properties.order).toBe(index + 1);
            });
        });

        it('should handle large node sets efficiently', () => {
            // Create a large set of nodes (1000 nodes)
            const largeNodeSet = Array.from({ length: 1000 }, (_, i) => 
                new GraphNode({ 
                    id: i + 1, 
                    uid: `uid${i + 1}`, 
                    labels: [`Test${i + 1}`] 
                })
            );

            const config = new GraphConfig({
                nodesData: largeNodeSet,
                edgesData: [],
                colorScheme: GraphConfig.ColorScheme.LABEL,
                rowsData: [],
                schemaData: null
            });

            const store = new GraphStore(config);

            // Measure time for node retrieval
            const startTime = performance.now();
            const nodes = store.getNodes();
            const endTime = performance.now();

            // Verify all nodes are present
            expect(nodes).toHaveLength(1000);
            
            // Performance assertion - should take less than 50ms
            // Note: This threshold might need adjustment based on the environment
            expect(endTime - startTime).toBeLessThan(50);
        });
    });

    describe('Graph Navigation', () => {
        /**
         * todo: Presently, this is depending on the node/edge data to have
         * been mutated by ForceGraph.
         */
    });

    describe('Edge Design', () => {
        it('should return selected design for selected edge', () => {
            store.setSelectedObject(mockEdge);
            const design = store.getEdgeDesign(mockEdge);
            expect(design).toBe(store.config.edgeDesign.selected);
        });

        it('should return default design for unrelated edges', () => {
            const unrelatedEdge = new Edge({
                source: new GraphNode({id: '3', labels: ['foo']}),
                target: new GraphNode({id: '4', labels: ['bar']}),
                labels: ['Edge Label']
            });
            const design = store.getEdgeDesign(unrelatedEdge);
            expect(design).toBe(store.config.edgeDesign.default);
        });
    });
});