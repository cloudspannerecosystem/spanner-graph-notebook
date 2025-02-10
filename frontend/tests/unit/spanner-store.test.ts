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
        mockNode1 = new GraphNode({id: '1', labels: ['TestLabel1'], neighborhood: 1});
        mockNode2 = new GraphNode({id: '2', labels: ['TestLabel2'], neighborhood: 2});
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

    describe('Node Color Management', () => {
        it('should get color by label', () => {
            store.config.nodeColors = {'TestLabel1': 'red'};
            const color = store.getColorForNodeByLabel(mockNode1);
            expect(color).toBe('red');
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