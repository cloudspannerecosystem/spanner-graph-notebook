/* # Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
 */

import GraphObject from '../models/graph-object.js';
import GraphEdge from '../models/edge.js';
import GraphNode from '../models/node.js';
import GraphConfig from '../spanner-config.js';
import GraphStore from '../spanner-store.js';

class SidebarConstructor {
    upArrowSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
            <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/>
        </svg>`;

    downArrowSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
        </svg>`;

    closeSvg =
        `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
            <path d="m336-280-56-56 144-144-144-143 56-56 144 144 143-144 56 56-144 143 144 144-56 56-143-144-144 144Z"/>
        </svg>`;

    rightArrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M400-280v-400l200 200-200 200Z"/></svg>';

    leftArrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M560-280 360-480l200-200v400Z"/></svg>';

    incomingEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M320-320q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0 80q-100 0-170-70T80-480q0-100 70-170t170-70q90 0 156.5 57T557-520h323v80H557q-14 86-80.5 143T320-240Zm0-240Z"/></svg>`;

    outgoingEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M640-320q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0 80q-90 0-156.5-57T403-440H80v-80h323q14-86 80.5-143T640-720q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-240Z"/></svg>`;

    /**
     *
     * @type {GraphStore}
     */
    store = null;

    /**
     *
     * @type {HTMLElement}
     */
    container = null;

    /**
     * @type {Object.<string, boolean>}
     */
    sectionCollapseState = null;

    /**
     * Helper method
     * @param {GraphNode} node
     * @param {Boolean} clickable
     * @param {string|null} customLabel
     * @return {HTMLSpanElement}
     */
    _nodeChipHtml(node, clickable = false, customLabel= null) {
        const nodeChip = document.createElement('span');
        nodeChip.style.backgroundColor = this.store.getColorForNode(node);
        nodeChip.className = `node-chip ${clickable ? 'clickable' : ''}`;
        nodeChip.textContent = customLabel || node.getLabels();

        if (clickable) {
            nodeChip.addEventListener('mouseenter', () => {
                if (this.store.config.selectedGraphObject !== node) {
                    this.store.setFocusedObject(node);
                }
            });
            nodeChip.addEventListener('mouseleave', () => {
                this.store.setFocusedObject(null);
            });
            nodeChip.addEventListener('click', (MouseEvent) => {
                this.store.setFocusedObject(null);
                this.store.setSelectedObject(node);
            });
        }

        return nodeChip;
    }

    /**
     * Helper method
     * @param {GraphEdge} edge
     * @param {Boolean} clickable
     * @return {HTMLSpanElement}
     */
    _edgeChipHtml(edge, clickable = false) {
        const edgeChip = document.createElement('span');
        edgeChip.className = `edge-chip ${clickable ? 'clickable' : ''}`;
        edgeChip.textContent = edge.getLabels();

        if (clickable) {
            edgeChip.addEventListener('mouseenter', () => {
                if (this.store.config.selectedGraphObject !== edge) {
                    this.store.setFocusedObject(edge);
                }
            });
            edgeChip.addEventListener('mouseleave', () => {
                this.store.setFocusedObject(null);
            });
            edgeChip.addEventListener('click', (MouseEvent) => {
                this.store.setFocusedObject(null);
                this.store.setSelectedObject(edge);
            });
        }

        return edgeChip;
    }

    /**
     *
     * @return {HTMLButtonElement} button
     * @private
     */
    _initCloseButton() {
        const button = document.createElement('button');
        button.className = 'close-btn';

        button.innerHTML = this.closeSvg;
        button.addEventListener('click', () => {
            this.store.setSelectedObject(null);
        });

        return button;
    }

    /**
     *
     * @param {Array<HTMLElement>} hideElements
     * @param {String} visibleDisplay
     * @return {HTMLButtonElement} button
     * @private
     */
    _initToggleButton(hideElements, visibleDisplay = 'initial') {
        const button = document.createElement('button');
        button.className = 'collapse-btn';

        let visible = true;

        const arrowVisibility = () => {
            if (visible) {
                button.innerHTML = this.upArrowSvg;
            } else {
                button.innerHTML = this.downArrowSvg;
            }

            const display = visible ? visibleDisplay : 'none';
            for (let i = 0; i < hideElements.length; i++) {
                hideElements[i].style.display = display;
            }
        };

        arrowVisibility();
        button.addEventListener('click', () => {
            visible = !visible;
            arrowVisibility()
        });

        return button;
    }

    elements = {
        /**
         * @type {HTMLDivElement}
         */
        container: null,
        /**
         * @type {HTMLDivElement}
         */
        content: null,
        title: {
            /**
             * @type {HTMLDivElement}
             */
            container: null,
            /**
             * @type {HTMLHeadingElement}
             */
            content: null,
            /**
             * @type {HTMLButtonElement}
             */
            button: null,
            /**
             * @type {SVGSVGElement}
             */
            icon: null
        },
        properties: {
            /**
             * @type {HTMLDivElement}
             */
            container: null,
            /**
             * @type {HTMLDivElement}
             */
            header: null,
            /**
             * @type {HTMLHeadingElement}
             */
            title: null,
            /**
             * @type {Array<HTMLDivElement>}
             */
            propertyList: []
        },
        neighbors: {
            /**
             * @type {HTMLDivElement}
             */
            container: null,
            /**
             * @type {HTMLDivElement}
             */
            header: null,
            /**
             * @type {HTMLHeadingElement}
             */
            title: null,
            /**
             * @type {Array<HTMLDivElement>}
             */
            propertyList: []
        },
        schemaChipLists: {
            nodeList: {
                /**
                 * @type {HTMLDivElement}
                 */
                container: null,
                /**
                 * @type {Array<HTMLSpanElement>}
                 */
                nodes: []
            },
            edgeList: {
                /**
                 * @type {HTMLDivElement}
                 */
                container: null,
                /**
                 * @type {Array<HTMLSpanElement>}
                 */
                edges: []
            }
        },
    };

    /**
     * @param {GraphStore} store
     * @param {HTMLElement} mount
     * @param {Object.<string, boolean>} sectionCollapseState
     */
    constructor(store, mount, sectionCollapseState) {
        this.store = store;
        this.elements.mount = mount;
        this.sectionCollapseState = sectionCollapseState;

        this.refresh();
    }

    refresh() {
        this.scaffold();
        this.title();

        if (this.store.config.selectedGraphObject) {
            if (this.store.config.selectedGraphObject instanceof GraphNode) {
                this.properties();
                if (!this.store.config.selectedGraphObject.isIntermediateNode()) {
                    this.expandNode();
                }
                this.neighbors();
            } else {
                this.neighbors();
                this.properties();
            }
        } else if (this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA) {
            this.schemaNodes();
            this.schemaEdges();
        }
    }

    scaffold() {
        this.elements.mount.innerHTML = `
            <style>
                .panel {
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
                    overflow: hidden;
                    width: 360px;
                    position: absolute;
                    left: 16px;
                    top: 16px;
                    max-height: calc(100% - 2rem);
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }
    
                .panel-header {
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #DADCE0;
                }
                
                .schema-header {
                    padding: 16px 16px 10px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .schema-container {
                    padding: 0px 16px 10px 16px;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .schema-container.hide {
                    display: none;
                }
    
                .panel-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 400;
                    display: flex;
                    align-items: center;
                    height: 28px;
                }
                
                .panel-header .panel-header-content {
                    display: flex;
                    align-items: center;
                }
                
                .panel-header .panel-header-content.schema-header-content {
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .panel-header .selected-object-label {
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .schema-header h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 400;
                    display: inline-block;
                }
    
                .node-chip {
                    background-color: #ff5722;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-right: 8px;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    position:relative;
                }
                
                .node-chip.clickable:hover {
                    cursor: pointer;
                    filter: brightness(96%);
                }
                
                .node-chip-text {
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .count {
                    color: #5F6368;
                    font-weight: normal;
                }
    
                .close-btn, .collapse-btn {
                    background: none;
                    border: none;
                    color: #666;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    height: 24px;
                }
    
                .panel-content {
                    padding: 16px 16px 0;
                    overflow: scroll;
                }
    
                .section {
                    margin-bottom: 16px;
                }
    
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    margin-bottom: 12px;
                }
    
                .section-header h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                }
    
                .arrow {
                    font-size: 12px;
                    color: #666;
                    display: flex;
                    padding-right: 6px;
                }
    
                .section-content {
                    margin-top: 8px;
                }
                
                .property {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-top: 1px solid #DADCE0;
                    flex-wrap: nowrap;
                    overflow: hidden;
                }
                
                .property-label {
                    color: #202124;
                    font-size: 13px;
                    font-weight: 600;
                    overflow-wrap: break-word;
                    text-overflow: ellipsis;
                }
                
                .edge-neighbor-type {
                    color: #202124;
                    font-size: 13px;
                    font-weight: 600;
                    flex: 4;
                    width: 40%;
                }
                
                .edge-neighbor-node {
                    color: #202124;
                    font-size: 13px;
                    font-weight: 600;
                    flex: 6;
                    width: 60%;
                }
                
                .edge-neighbor-type {
                    width: calc(40% - 4px);
                    padding-right: 4px;
                    flex: 4;
                }
                
                .edge-neighbor-node {
                    width: 60%;
                    flex: 6;
                }
                
                .property-label.property-label-wrap {
                    width: calc(40% - 4px);
                    padding-right: 4px;
                    flex: 4;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    box-sizing: border-box;
                    overflow: hidden;
                }
    
                .property-value {
                    color: #5F6368;
                    font-size: 13px;
                    font-weight: 400;
                    overflow-wrap: break-word;
                    text-overflow: ellipsis;
                    -webkit-line-clamp: 3;
                }
                
                .property-value.property-value-wrap {
                    width: 60%;
                    flex: 6;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    box-sizing: border-box;
                    overflow: hidden;
                }
    
                .edge-title {
                    background-color: white;
                    border: 1px solid #DADCE0;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-right: 8px;
                    font-size: 14px;
                    font-weight: bold;
                }
                
                .edge-chip {
                    background-color: white;
                    border: 1px solid #DADCE0;
                    color: #3C4043;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-right: 8px;
                    font-size: 12px;
                    font-weight: bold;
                }

                .neighbor-row-edge .edge-chip {
                    margin-right: 0;
                }
                
                .edge-chip.clickable:hover {
                    cursor: pointer;
                    filter: brightness(96%);
                }
    
                .edge-chip.schema {
                    display: inline-block;
                    margin-bottom: 10px;
                }
                
                .neighbor-row {
                    display: flex;
                    align-items: center;
                    padding: 8px 0;
                    border-top: 1px solid #DADCE0;
                }
                
                .neighbor-row-neighbor {
                    display: flex;
                    justify-content: start;
                    align-items: center;
                    cursor: pointer;
                }
                
                .neighbor-row-neighbor * {
                    cursor: pointer;
                }
                
                .neighbor-row-edge {
                    display: flex;
                    flex: 1;
                    justify-content: end;
                    align-items: center;
                }
    
                .neighbor-id {
                    font-weight: 400;
                    color: #333;
                    font-size: 13px;
                }
    
                .neighbor-arrow {
                    height: 24px;
                    padding: 0;
                    border-radius: 4px;
                    margin-right: 8px;
                    
                    display: flex;
                    flex: ;
                }
                
                .neighbor-arrow.left {
                    justify-content: flex-start;
                }
                
                .neighbor-arrow.right {
                    justify-content: flex-end;
                }
                
                .chip-wrap-container {
                    display: flex;
                    flex-wrap: wrap;
                    row-gap: 12px;
                }

                /* Expand button styles */
                .expand-button {
                    display: flex;
                    align-items: center;
                    padding: 8px 10px;
                    margin: 2px 0;
                    border: none;
                    border-radius: 4px;
                    background: none;
                    cursor: pointer;
                    width: 100%;
                    font-size: 13px;
                    color: #3C4043;
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                .expand-button-general {
                    font-weight: 500;
                }
                .expand-button:hover:not(.loading) {
                    background-color: #F1F3F4;
                }
                .expand-button-general:hover:not(.loading) {
                    background-color: #EBEEF0;
                }
                .expand-button.loading {
                    background-color: #F8F9FA;
                    cursor: default;
                    color: #80868B;
                }
                .expand-button.loading svg {
                    opacity: 0.5;
                }
                .expand-button svg {
                    margin-right: 8px;
                    transition: opacity 0.2s;
                }
                .expand-button-text {
                    flex-grow: 1;
                    text-align: left;
                }
                .expand-button-arrow {
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .expand-button:hover .expand-button-arrow {
                    opacity: 1;
                }
                .expand-button.loading .expand-button-arrow {
                    opacity: 0;
                }
                .expand-button::after {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, 
                        rgba(26, 115, 232, 0.2),
                        rgba(26, 115, 232, 1),
                        rgba(26, 115, 232, 1),
                        rgba(26, 115, 232, 0.2)
                    );
                    bottom: 0;
                    left: -100%;
                    transition: none;
                    opacity: 0;
                }
                .expand-button.loading::after {
                    opacity: 1;
                    animation: loading-animation 1s infinite linear;
                    transition: opacity 0.2s;
                }
                @keyframes loading-animation {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                
                /* Expand divider style */
                .expand-divider {
                    height: 1px;
                    background-color: #DADCE0;
                }
            </style>
            <div class="panel">
                <div class="panel-header"></div>
                <div class="panel-content"></div>
            </div>`;

        this.elements.container = this.elements.mount.querySelector('.panel');
        this.elements.content = this.elements.mount.querySelector('.panel-content');
        this.elements.title.container = this.elements.container.querySelector('.panel-header');
        this.elements.title.content = document.createElement('span');
        this.elements.title.content.className = 'panel-header-content';
        this.elements.title.button = document.createElement('button');
        this.elements.properties.container = document.createElement('div');
        this.elements.schemaChipLists.nodeList.container = document.createElement('div');
        this.elements.schemaChipLists.edgeList.container = document.createElement('div');
    }

    title() {
        const selectedObject = this.store.config.selectedGraphObject;
        const {container, content} = this.elements.title;
        let button = this.elements.title.button;
        container.appendChild(content);

        const selectedObjectTitle = () => {
            content.classList.remove('schema-header-content');

            if (selectedObject instanceof GraphNode) {
                content.appendChild(this._nodeChipHtml(selectedObject));

                if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                    const property = document.createElement('span');
                    property.className = 'selected-object-label';
                    property.textContent = selectedObject.identifiers.join(', ');
                    content.appendChild(property);
                }
            }

            if (selectedObject instanceof GraphEdge) {
                content.appendChild(this._edgeChipHtml(selectedObject));
            }

            button = this._initCloseButton();
        };

        const schemaTitle = () => {
            const nodes = this.store.getNodes();
            const edgeNames = this.store.config.schema.getEdgeNames();
            content.textContent = `${nodes.length} nodes, ${edgeNames.length} edges`;
            content.classList.add('schema-header-content');
            container.style.borderBottom = 'none';

            button = this._initToggleButton([
                this.elements.content
            ], 'block');
        };

        if (selectedObject) {
            selectedObjectTitle();
        } else if (this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA) {
            // Show a high level overview of the schema
            // when no graph object is selected
            schemaTitle();
        }

        container.appendChild(button);
    }

    /**
     * Creates a section with a collapsible header
     * @param {String} titleText
     * @param {Array<HTMLElement>} rows
     * @param {boolean} hasHeader
     * @param {Number} marginBottom
     * @returns {{container: HTMLDivElement, button: null, header: null, title: null, content: HTMLDivElement}}
     * @private
     */
    _createSection(titleText, rows, hasHeader, marginBottom = 0) {
        const container = document.createElement('div');
        container.className = 'section';

        if (marginBottom) {
            container.style.marginBottom = `${marginBottom}px`;
        }

        const content = document.createElement('div');
        content.className = 'section-content';

        let header = null;
        let title = null;
        let button = null;

        if (hasHeader) {
            header = document.createElement('div');
            header.className = 'section-header';

            title = document.createElement('h3');
            title.textContent = titleText;

            // Use the stored collapse state or default to expanded
            const isCollapsed = this.sectionCollapseState[titleText] ?? false;
            content.style.display = isCollapsed ? 'none' : 'block';

            button = document.createElement('button');
            button.className = 'collapse-btn';
            button.innerHTML = isCollapsed ? this.downArrowSvg : this.upArrowSvg;
            
            button.addEventListener('click', () => {
                const isCurrentlyCollapsed = content.style.display === 'none';
                content.style.display = isCurrentlyCollapsed ? 'block' : 'none';
                button.innerHTML = isCurrentlyCollapsed ? this.upArrowSvg : this.downArrowSvg;
                // Update the collapse state in the parent
                this.sectionCollapseState[titleText] = !isCurrentlyCollapsed;
            });

            container.appendChild(header);
            header.appendChild(title);
            header.appendChild(button);
        }

        container.appendChild(content);

        for (let i = 0; i < rows.length; i++) {
            content.appendChild(rows[i]);
        }

        return {
            container, header, title, button, content
        };
    }

    properties() {
        const selectedObject = this.store.config.selectedGraphObject;
        if (!selectedObject || !selectedObject.properties) {
            return;
        }

        let labelWrapClass = '';
        let valueWrapClass = '';
        if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
             labelWrapClass = 'property-label-wrap';
             valueWrapClass = 'property-value-wrap';
        }

        const createPropertyRow = (key, value) => {
            /** @type PropertyDeclarationType */
            const arrayPropertyType = 'ARRAY';
            if (this.store.getPropertyType(selectedObject, key) === arrayPropertyType) {
                value = `[${value}]`;
            }

            const property = document.createElement('div');
            property.className = 'property';
            property.innerHTML =
                `<div class="property-label ${labelWrapClass}">${key}</div>
                <div class="property-value ${valueWrapClass}">${value}</div>`;

            return property;
        };

        const properties = Object
            .entries(selectedObject.properties)
            .map(([key, value]) =>
                createPropertyRow(key, value));

        this.elements.properties = this._createSection('Properties', properties, true);
        this.elements.properties.title.innerHTML = `Properties <span class="count">${properties.length}</span>`;
        this.elements.content.appendChild(this.elements.properties.container);
    }

    neighbors() {
        const selectedObject = this.store.config.selectedGraphObject;
        if (!selectedObject || !selectedObject.properties) {
            return;
        }

        /**
         * @type {HTMLElement[]}
         */
        const neighborRowElements = [];
        if (selectedObject instanceof GraphNode) {
            const neighborMap = this.store.getNeighborsOfNode(selectedObject);
            for (const nodeUid of Object.keys(neighborMap)) {
                const node = this.store.getNode(nodeUid);
                if (!(node instanceof GraphNode)) {
                    continue;
                }

                const edge = neighborMap[nodeUid];
                if (!(edge instanceof GraphEdge)) {
                    continue;
                }

                const neighborRowDiv = document.createElement('div');
                neighborRowDiv.className = 'neighbor-row';

                const neighborDiv = document.createElement('div');
                neighborDiv.className = 'neighbor-row-neighbor';

                // Make the entire neighbor area interactive
                neighborDiv.addEventListener('mouseenter', () => {
                    if (this.store.config.selectedGraphObject !== node) {
                        this.store.setFocusedObject(node);
                    }
                });
                neighborDiv.addEventListener('mouseleave', () => {
                    this.store.setFocusedObject(null);
                });
                neighborDiv.addEventListener('click', () => {
                    this.store.setFocusedObject(null);
                    this.store.setSelectedObject(node);
                });

                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'arrow';
                arrowSpan.innerHTML = edge.sourceUid === selectedObject ?
                    this.outgoingEdgeSvg : this.incomingEdgeSvg;
                neighborDiv.appendChild(arrowSpan);


                // Node Neighbor - now without its own click handlers since the parent handles it
                const nodeChip = this._nodeChipHtml(node, false);
                nodeChip.style.marginRight = '8px';
                neighborDiv.appendChild(nodeChip);

                // Node Neighbor ID with background matching node color
                if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                    const idContainer = document.createElement('span');
                    idContainer.className = 'neighbor-id';
                    idContainer.textContent = node.identifiers.join(', ');
                    neighborDiv.appendChild(idContainer);
                }

                const edgeDiv = document.createElement('div');
                edgeDiv.className = 'neighbor-row-edge';

                // Edge connecting the neighbors
                edgeDiv.appendChild(this._edgeChipHtml(edge, true));

                neighborRowDiv.appendChild(neighborDiv);
                neighborRowDiv.appendChild(edgeDiv);

                neighborRowElements.push(neighborRowDiv);
            }
        } else if (selectedObject instanceof GraphEdge) {
            const container = document.createElement('div');
            container.className = 'section';

            const content = document.createElement('div');
            content.className = 'section-content';

            container.appendChild(content);

            this.elements.neighbors = {container, content};

            ['source', 'target'].forEach((neighborType, i) => {
                const neighbor = selectedObject[neighborType];
                if (!neighbor) {
                    return;
                }

                const neighborTypeLabel = neighborType === 'target' ? 'Destination' : 'Source';

                const neighborRow = document.createElement('div');
                neighborRow.className = 'neighbor-row';

                const label = document.createElement('div');
                label.className = 'edge-neighbor-type';
                label.textContent = neighborTypeLabel;
                neighborRow.appendChild(label);

                const value = document.createElement('div');
                value.className = 'edge-neighbor-node';
                value.style.cursor = 'pointer';
                value.style.display = 'flex';
                value.style.alignItems = 'center';
                
                // Make the entire value area interactive
                value.addEventListener('mouseenter', () => {
                    if (this.store.config.selectedGraphObject !== neighbor) {
                        this.store.setFocusedObject(neighbor);
                    }
                });
                value.addEventListener('mouseleave', () => {
                    this.store.setFocusedObject(null);
                });
                value.addEventListener('click', () => {
                    this.store.setFocusedObject(null);
                    this.store.setSelectedObject(neighbor);
                });

                // Node chip without its own click handlers
                const nodeChip = this._nodeChipHtml(neighbor, false);
                nodeChip.style.marginRight = '8px';
                value.appendChild(nodeChip);

                if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                    const idContainer = document.createElement('span');
                    idContainer.className = 'neighbor-id';
                    idContainer.textContent = neighbor.identifiers.join(', ');
                    value.appendChild(idContainer);
                }

                neighborRow.appendChild(value);

                if (i === 0) {
                    neighborRow.style.borderTop = 'none';
                }

                content.appendChild(neighborRow);
            });
        }

        if (selectedObject instanceof GraphNode) {
            this.elements.neighbors = this._createSection(
                `Neighbors`, neighborRowElements,
                true);
            this.elements.neighbors.title.innerHTML = `Neighbors <span class="count">${neighborRowElements.length}</span>`;
        }
        this.elements.content.appendChild(this.elements.neighbors.container);
    }

    schemaNodes() {
        this.elements.content.style.paddingTop = '0';
        const chipWrapContainer = document.createElement('div');
        chipWrapContainer.className = 'chip-wrap-container';

        const nodes = this.store.getNodes();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodeChip = this._nodeChipHtml(node, true);
            chipWrapContainer.appendChild(nodeChip);
        }

        const nodeList = this._createSection('', [chipWrapContainer], false, 28);
        this.elements.content.appendChild(nodeList.container);
    }

    schemaEdges() {
        const chipWrapContainer = document.createElement('div');
        chipWrapContainer.className = 'chip-wrap-container';

        const edges = this.store.getEdges();
        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            const edgeChip = this._edgeChipHtml(edge, true);
            chipWrapContainer.appendChild(edgeChip);
        }

        const edgeList = this._createSection('', [chipWrapContainer], false);
        this.elements.content.appendChild(edgeList.container);
    }

    expandNode() {
        const selectedNode = this.store.config.selectedGraphObject;
        if (!selectedNode || !(selectedNode instanceof GraphNode)) {
            return;
        }

        // Don't show expand section in schema mode
        if (this.store.config.viewMode === GraphConfig.ViewModes.SCHEMA) {
            return;
        }

        // Create expand buttons container
        const expandButtons = document.createElement('div');
        expandButtons.className = 'section-content';

        // Helper function to create expand buttons
        const createExpandButton = (text, icon, onClick, isGeneral = false) => {
            const button = document.createElement('button');
            button.className = `expand-button ${isGeneral ? 'expand-button-general' : ''}`;
            button.innerHTML = `
                ${icon}
                <span class="expand-button-text">${text}</span>
                <svg class="expand-button-arrow" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#5f6368">
                    <path d="M530-481 332-679l43-43 241 241-241 241-43-43 198-198Z"/>
                </svg>
            `;

            // Track loading state
            let isLoading = false;

            button.addEventListener('click', async () => {
                if (isLoading) return; // Prevent multiple clicks while loading
                
                // Set loading state
                isLoading = true;
                button.classList.add('loading');
                
                try {
                    // Call the expansion function
                    selectedNode.fx = selectedNode.x;
                    selectedNode.fy = selectedNode.y;
                    await onClick();
                } catch (error) {
                    console.error('Error expanding node:', error);
                } finally {
                    // Reset loading state after a minimum duration to prevent flashing
                    setTimeout(() => {
                        isLoading = false;
                        button.classList.remove('loading');
                    }, 500);
                }
            });
            
            return button;
        };

        // Add "All incoming edges" button
        expandButtons.appendChild(createExpandButton(
            'All incoming edges',
            this.incomingEdgeSvg,
            () => this.store.requestNodeExpansion(selectedNode, GraphEdge.Direction.INCOMING.description),
            true
        ));

        // Add "All outgoing edges" button
        expandButtons.appendChild(createExpandButton(
            'All outgoing edges',
            this.outgoingEdgeSvg,
            () => this.store.requestNodeExpansion(selectedNode, GraphEdge.Direction.OUTGOING.description),
            true
        ));

        // Add a divider between general and specific edge options
        const divider = document.createElement('div');
        divider.className = 'expand-divider';
        expandButtons.appendChild(divider);

        // Add individual edge type buttons
        const edgeTypes = this.store.getEdgeTypesOfNodeSorted(selectedNode);
        edgeTypes.forEach(({label, direction}) => {
            const icon = direction === GraphEdge.Direction.INCOMING.description ? this.incomingEdgeSvg : this.outgoingEdgeSvg;
            expandButtons.appendChild(createExpandButton(
                label,
                icon,
                () => this.store.requestNodeExpansion(selectedNode, direction, label)
            ));
        });

        // Create and add the section
        const section = this._createSection('Expand Node', [expandButtons], true);
        section.title.innerHTML = `Expand Node <span class="count">${2 + edgeTypes.length} options</span>`;
        this.elements.content.appendChild(section.container);
    }
}

class Sidebar {
    /**
     * The graph store that this visualization is based on.
     * @type {GraphStore}
     */
    store;

    /**
     * The DOM element that the graph will be rendered in.
     * @type {HTMLElement}
     */
    mount;

    /**
     * @type {SidebarConstructor}
     */
    domConstructor;

    /**
     * Stores the collapse state of each section
     * @type {Object.<string, boolean>}
     * @private
     */
    _sectionCollapseState = {};

    constructor(inStore, inMount) {
        this.store = inStore;
        this.mount = inMount;
        this.constructSidebar();

        this.initializeEvents(this.store);
    }

    constructSidebar() {
        const sidebar = this.mount;
        sidebar.className = 'sidebar';

        if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
            if (!this.selectedObject) {
                sidebar.style.display = 'none';
            } else {
                sidebar.style.display = 'initial';
            }
        } else {
            sidebar.style.display = 'initial';
        }

        this.domConstructor = new SidebarConstructor(this.store, sidebar, this._sectionCollapseState);
    }

    /**
     * Registers callbacks for GraphStore events.
     * @param {GraphStore} store
     */
    initializeEvents(store) {
        if (!(store instanceof GraphStore)) {
            throw Error('Store must be an instance of GraphStore');
        }

        store.addEventListener(GraphStore.EventTypes.GRAPH_DATA_UPDATE,
            (currentGraph, updates, config) => {
                if (this.domConstructor) {
                    this.domConstructor.refresh();
                }
            });

        store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE,
            (viewMode, config) => {
                this.selectedObject = config.selectedGraphObject;

                // Clean up sidebar
                this.mount.innerHTML = '';
                this.mount.textContent = '';

                if (viewMode === GraphConfig.ViewModes.TABLE) {
                    return;
                }

                this.constructSidebar();
            });

        store.addEventListener(GraphStore.EventTypes.SELECT_OBJECT,
            (object, config) => {
                this.selectedObject = object;

                // Clean up sidebar
                this.mount.innerHTML = '';
                this.mount.textContent = '';
                this.constructSidebar();
            });
    }
}

export { Sidebar, SidebarConstructor };