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
 *
 *
 */

import GraphStore from '../../../src/spanner-store';
import GraphConfig from '../../../src/spanner-config';
import GraphNode from '../../../src/models/node';
import Edge from '../../../src/models/edge';
import {Sidebar, SidebarConstructor} from '../../../src/visualization/spanner-sidebar';
import mockData from '../../mock-data.json';

// Helper function to convert hex to rgb
function hexToRgb(hex) {
    // Remove the hash if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgb(${r}, ${g}, ${b})`;
}

describe('Sidebar', () => {
    let store;
    let mockConfig;
    let mockNode1;
    let mockNode2;
    let mockEdge;
    let mockMount;
    let sidebar;

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
        sidebar = new Sidebar(store, mockMount);
    });

    afterEach(() => {
        document.body.removeChild(mockMount);
    });

    describe('Initialization', () => {
        it('should properly initialize with store and mount element', () => {
            expect(sidebar.store).toBe(store);
            expect(sidebar.mount).toBe(mockMount);
        });

        it('should be hidden initially in DEFAULT view mode with no selection', () => {
            expect(mockMount.style.display).toBe('none');
        });

        it('should be visible in SCHEMA view mode', () => {
            store.setViewMode(GraphConfig.ViewModes.SCHEMA);
            expect(mockMount.style.display).toBe('initial');
        });

        it('should be hidden in TABLE view mode', () => {
            store.setViewMode(GraphConfig.ViewModes.TABLE);
            expect(mockMount.style.display).toBe('none');
        });

        it('should throw error if initialized without valid store', () => {
            expect(() => new Sidebar(null, mockMount)).toThrow();
        });
    });

    describe('Schema View', () => {
        beforeEach(() => {
            store.setViewMode(GraphConfig.ViewModes.SCHEMA);
        });

        it('should display all nodes in schema view', () => {
            const nodeChips = mockMount.querySelectorAll('.node-chip');
            expect(nodeChips.length).toBe(store.getNodes().length);
        });

        it('should display all edges in schema view', () => {
            const edgeChips = mockMount.querySelectorAll('.edge-chip');
            expect(edgeChips.length).toBe(store.getEdges().length);
        });
    });
});

describe('SidebarConstructor', () => {
    let store;
    let mockConfig;
    let mockNode1;
    let mockNode2;
    let mockEdge;
    let mockMount;
    let sidebarConstructor;

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
        sidebarConstructor = new SidebarConstructor(store, mockMount);
    });

    afterEach(() => {
        document.body.removeChild(mockMount);
    });

    describe('Helper Methods', () => {
        it('should create a node chip with correct styling', () => {
            const nodeChip = sidebarConstructor._nodeChipHtml(mockNode1, false);
            const expectedColor = hexToRgb(store.getColorForNode(mockNode1));
            expect(nodeChip.tagName).toBe('SPAN');
            expect(nodeChip.className).toBe('node-chip ');
            expect(nodeChip.style.backgroundColor).toBe(expectedColor);
            expect(nodeChip.textContent).toBe(mockNode1.getLabels());
        });

        it('should create a clickable node chip', () => {
            const nodeChip = sidebarConstructor._nodeChipHtml(mockNode1, true);
            expect(nodeChip.className).toBe('node-chip clickable');
        });

        it('should create an edge chip with correct styling', () => {
            const edgeChip = sidebarConstructor._edgeChipHtml(mockEdge, false);
            expect(edgeChip.tagName).toBe('SPAN');
            expect(edgeChip.className).toBe('edge-chip ');
            expect(edgeChip.textContent).toBe(mockEdge.getLabels());
        });

        it('should create a clickable edge chip', () => {
            const edgeChip = sidebarConstructor._edgeChipHtml(mockEdge, true);
            expect(edgeChip.className).toBe('edge-chip clickable');
        });
    });

    describe('Button Creation', () => {
        it('should create a close button with correct attributes', () => {
            const closeButton = sidebarConstructor._initCloseButton();
            expect(closeButton.tagName).toBe('BUTTON');
            expect(closeButton.className).toBe('close-btn circular-hover-effect');
            expect(closeButton.innerHTML).toContain('svg');
        });

        it('should create an overflow button with correct attributes', () => {
            const overflowButton = sidebarConstructor._initOverflowButton();
            expect(overflowButton.tagName).toBe('BUTTON');
            expect(overflowButton.className).toBe('overflow-btn circular-hover-effect');
            expect(overflowButton.innerHTML).toContain('svg');
        });

        it('should create a toggle button with correct attributes', () => {
            const elements = [document.createElement('div')];
            const toggleButton = sidebarConstructor._initToggleButton(elements);
            expect(toggleButton.tagName).toBe('BUTTON');
            expect(toggleButton.className).toBe('collapse-btn');
            expect(toggleButton.innerHTML).toContain('svg');
        });
    });

    describe('Schema View', () => {
        beforeEach(() => {
            store.setViewMode(GraphConfig.ViewModes.SCHEMA);
        });

        it('should display schema nodes correctly', () => {
            sidebarConstructor.schemaNodes();
            const nodeChips = mockMount.querySelectorAll('.node-chip');
            expect(nodeChips.length).toBe(store.getNodes().length);
        });

        it('should display schema edges correctly', () => {
            sidebarConstructor.schemaEdges();
            const edgeChips = mockMount.querySelectorAll('.edge-chip');
            expect(edgeChips.length).toBe(store.getEdges().length);
        });
    });
});
