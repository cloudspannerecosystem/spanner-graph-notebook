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

    incomingEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#5f6368"><path d="M320-320q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0 80q-100 0-170-70T80-480q0-100 70-170t170-70q90 0 156.5 57T557-520h323v80H557q-14 86-80.5 143T320-240Zm0-240Z"/></svg>`;

    outgoingEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#5f6368"><path d="M640-320q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0 80q-90 0-156.5-57T403-440H80v-80h323q14-86 80.5-143T640-720q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-240Z"/></svg>`;

    circularEdgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#5f6368"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;

    overflowSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>`;

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
     * Gets or creates the tooltip element
     * @returns {HTMLElement} The tooltip element
     * @private
     */
    _getTooltipElement() {
        let tooltip = document.getElementById('custom-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'custom-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.backgroundColor = '#3b4043';
            tooltip.style.color = 'white';
            tooltip.style.padding = '6px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '14px';
            tooltip.style.maxWidth = '300px';
            tooltip.style.zIndex = '1000';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.whiteSpace = 'normal';
            tooltip.style.wordWrap = 'break-word';
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }
    
    /**
     * Helper method to create and position tooltips
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} tooltipText - Text to display in tooltip
     * @private
     */
    _createTooltip(element, tooltipText) {
        element.setAttribute('data-tooltip', tooltipText);
        
        element.addEventListener('mouseenter', (e) => {
            // Get or create tooltip element
            const tooltip = this._getTooltipElement();
            
            tooltip.textContent = element.getAttribute('data-tooltip');
            // Display the tooltip so we can measure its dimensions
            tooltip.style.display = 'block';
            
            // Position the tooltip after a small delay to ensure it's rendered and has dimensions
            setTimeout(() => {
                // Position tooltip above the element
                const rect = element.getBoundingClientRect();
                tooltip.style.left = `${rect.left}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                
                // Make sure the tooltip doesn't go off-screen on the left
                if (parseFloat(tooltip.style.left) < 5) {
                    tooltip.style.left = '5px';
                }
                
                // Make sure the tooltip doesn't go off-screen on the right
                const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                if (rightEdge > window.innerWidth - 5) {
                    tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                }
                
                // Make sure the tooltip doesn't go off-screen on the top
                if (parseFloat(tooltip.style.top) < 5) {
                    tooltip.style.top = `${rect.bottom + 5}px`;
                }
            }, 0);
        });
        
        element.addEventListener('mouseleave', () => {
            let tooltip = document.getElementById('custom-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    }

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

        const labelString = customLabel || node.getLabels();
        nodeChip.textContent = labelString;
        
        // Create tooltip for node chip - but only if text is truncated
        // We'll check this on mouseenter
        nodeChip.setAttribute('data-tooltip', labelString);
        
        // Add hover event listeners for focus
        nodeChip.addEventListener('mouseenter', () => {
            if (this.store.config.selectedGraphObject !== node) {
                this.store.setFocusedObject(node);
            }
            
            // Check if text is truncated (scrollWidth > clientWidth means text is truncated)
            if (nodeChip.scrollWidth > nodeChip.clientWidth) {
                // Text is truncated, show tooltip
                const tooltip = this._getTooltipElement();
                
                tooltip.textContent = nodeChip.getAttribute('data-tooltip');
                tooltip.style.display = 'block';
                
                // Position the tooltip
                setTimeout(() => {
                    const rect = nodeChip.getBoundingClientRect();
                    tooltip.style.left = `${rect.left}px`;
                    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                    
                    // Make sure the tooltip doesn't go off-screen
                    if (parseFloat(tooltip.style.left) < 5) {
                        tooltip.style.left = '5px';
                    }
                    
                    const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                    if (rightEdge > window.innerWidth - 5) {
                        tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                    }
                    
                    if (parseFloat(tooltip.style.top) < 5) {
                        tooltip.style.top = `${rect.bottom + 5}px`;
                    }
                }, 0);
            }
        });
        
        nodeChip.addEventListener('mouseleave', () => {
            this.store.setFocusedObject(null);
            
            // Hide tooltip regardless of whether it was shown
            let tooltip = document.getElementById('custom-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });

        if (clickable) {
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
        button.className = 'close-btn circular-hover-effect';

        button.innerHTML = this.closeSvg;
        button.addEventListener('click', () => {
            this.store.setSelectedObject(null);
        });

        return button;
    }

    /**
     *
     * @return {HTMLButtonElement} button
     * @private
     */
    _initOverflowButton() {
        const button = document.createElement('button');
        button.className = 'overflow-btn circular-hover-effect';
        button.innerHTML = this.overflowSvg;

        button.addEventListener('click', () => {
            const selectedNode = this.store.config.selectedGraphObject;
            if (selectedNode instanceof GraphNode) {
                const menu = this.store.createNodeExpansionMenu(selectedNode, (direction, edgeLabel) => {
                    // Fix node position during expansion
                    selectedNode.fx = selectedNode.x;
                    selectedNode.fy = selectedNode.y;

                    this.store.requestNodeExpansion(selectedNode, direction, edgeLabel);
                });

                // Position the menu below the button
                const buttonRect = button.getBoundingClientRect();
                menu.style.left = buttonRect.left + 'px';
                menu.style.top = buttonRect.bottom + 'px';

                // Add the menu to the document body
                document.body.appendChild(menu);
            }
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
            closeButton: null,
            /**
             * @type {HTMLButtonElement}
             */
            overflowButton: null,
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
                    overflow: hidden;
                }
                
                .panel-header-buttons {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: auto;
                    min-width: 60px;
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
                    max-width: 100%;
                    overflow: hidden;
                }

                .panel-header .node-chip {
                    max-width: 35%;
                    min-width: 24px;
                }
                
                .panel-header .panel-header-content {
                    display: flex;
                    align-items: center;
                    flex: 1;
                    max-width: 75%;
                    overflow: hidden;
                }
                
                .panel-header .panel-header-content.schema-header-content {
                    font-size: 14px;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .panel-header .selected-object-label {
                    font-size: 16px;
                    font-weight: 600;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 100%;
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
                    position: relative;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    overflow: hidden;
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
    
                .close-btn, .collapse-btn, .overflow-btn, .edge-direction-btn {
                    background: none;
                    border: none;
                    color: #666;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    height: 24px;
                }
                
                .edge-direction-btn {
                    height: auto;
                    font-size: initial;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 4px;
                    margin-right: 8px;
                }
                
                /* Style for the SVG inside the edge direction button */
                .edge-direction-btn svg {
                    width: 18px;
                    height: 18px;
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
                    transition: background-color 0.2s ease;
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
                
                /* New styles for the two-column layout */
                .neighbor-column-left {
                    display: flex;
                    align-items: center;
                    width: 40%;
                    cursor: pointer;
                }
                
                .neighbor-column-right {
                    width: 60%;
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                .schema-row .neighbor-column-left {
                    width: auto;
                }
                
                .schema-row .neighbor-column-right {
                    flex: 1;
                }
                
                .schema-row .neighbor-column-left, .schema-row .neighbor-column-right {
                    overflow: initial;
                    text-overflow: initial;
                    cursor: initial;
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
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: block;
                    width: 100%;
                }
    
                .chip-wrap-container {
                    display: flex;
                    flex-wrap: wrap;
                    row-gap: 12px;
                    column-gap: 4px;
                }

                /* Circular hover effect class */
                .circular-hover-effect {
                    border-radius: 50%;
                    transition: background-color 0.2s ease;
                }
                
                .circular-hover-effect:hover {
                    background-color: rgba(95, 99, 104, 0.1);
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
        this.elements.title.closeButton = document.createElement('button');
        this.elements.properties.container = document.createElement('div');
        this.elements.schemaChipLists.nodeList.container = document.createElement('div');
        this.elements.schemaChipLists.edgeList.container = document.createElement('div');
    }

    title() {
        const selectedObject = this.store.config.selectedGraphObject;
        const {container, content} = this.elements.title;
        let closeButton = this.elements.title.closeButton;
        let overflowButton;

        // Clear the container first
        container.innerHTML = '';

        // Create a container for the buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'panel-header-buttons';

        container.appendChild(content);

        const selectedObjectTitle = () => {
            content.classList.remove('schema-header-content');

            if (selectedObject instanceof GraphNode) {
                content.appendChild(this._nodeChipHtml(selectedObject));

                if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                    const property = document.createElement('span');
                    property.className = 'selected-object-label';
                    property.textContent = this.store.getKeyProperties(selectedObject);
                    
                    // Add tooltip functionality if text is truncated
                    property.addEventListener('mouseenter', () => {
                        if (property.scrollWidth > property.clientWidth) {
                            // Text is truncated, show tooltip
                            const tooltip = this._getTooltipElement();
                            tooltip.textContent = property.textContent;
                            tooltip.style.display = 'block';
                            
                            // Position the tooltip
                            setTimeout(() => {
                                const rect = property.getBoundingClientRect();
                                tooltip.style.left = `${rect.left}px`;
                                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                                
                                // Make sure the tooltip doesn't go off-screen
                                if (parseFloat(tooltip.style.left) < 5) {
                                    tooltip.style.left = '5px';
                                }
                                
                                const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                                if (rightEdge > window.innerWidth - 5) {
                                    tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                                }
                                
                                if (parseFloat(tooltip.style.top) < 5) {
                                    tooltip.style.top = `${rect.bottom + 5}px`;
                                }
                            }, 0);
                        }
                    });
                    
                    property.addEventListener('mouseleave', () => {
                        let tooltip = document.getElementById('custom-tooltip');
                        if (tooltip) {
                            tooltip.style.display = 'none';
                        }
                    });
                    
                    // Add click-to-copy functionality
                    property.style.cursor = 'pointer';  // Show pointer cursor to indicate clickability
                    property.addEventListener('click', () => {
                        // Copy value to clipboard
                        navigator.clipboard.writeText(property.textContent).then(() => {
                            // Show copied confirmation
                            const originalBackgroundColor = property.style.backgroundColor;
                            const originalBorderRadius = property.style.borderRadius;
                            
                            // Visual feedback - briefly highlight the element
                            property.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                            property.style.borderRadius = '4px';
                            
                            // Show tooltip with "Copied!" message
                            const tooltip = this._getTooltipElement();
                            tooltip.textContent = 'copied to clipboard';
                            tooltip.style.display = 'block';
                            
                            // Position the tooltip
                            const rect = property.getBoundingClientRect();
                            tooltip.style.left = `${rect.left}px`;
                            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                            
                            // Hover background
                            setTimeout(() => {
                                property.style.backgroundColor = originalBackgroundColor;
                                property.style.borderRadius = originalBorderRadius;
                            }, 200);

                            // Clear the tooltip
                            setTimeout(() => {
                                tooltip.style.display = 'none';
                            }, 1000);
                        }).catch(err => {
                            console.error('Could not copy text: ', err);
                        });
                    });
                    
                    content.appendChild(property);

                    overflowButton = this._initOverflowButton();
                }
            }

            if (selectedObject instanceof GraphEdge) {
                content.appendChild(this._edgeChipHtml(selectedObject));
            }

            closeButton = this._initCloseButton();
        };

        const schemaTitle = () => {
            const nodes = this.store.getNodes();
            const edgeNames = this.store.config.schema.getEdgeNames();
            content.textContent = `${nodes.length} nodes, ${edgeNames.length} edges`;
            content.classList.add('schema-header-content');
            container.style.borderBottom = 'none';

            closeButton = this._initToggleButton([
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

        // Add buttons to the buttons container
        if (overflowButton) {
            buttonsContainer.appendChild(overflowButton);
        }
        if (closeButton) {
            buttonsContainer.appendChild(closeButton);
        }

        // Add the buttons container to the main container
        container.appendChild(buttonsContainer);
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
            const property = document.createElement('div');
            property.className = 'property';
            
            // Create label element
            const labelDiv = document.createElement('div');
            labelDiv.className = `property-label ${labelWrapClass}`;
            labelDiv.textContent = key;
            
            // Check for label truncation and add tooltip if needed
            labelDiv.addEventListener('mouseenter', () => {
                // For labels with -webkit-line-clamp, we need to check differently
                // by comparing scrollHeight > clientHeight
                if (labelDiv.scrollHeight > labelDiv.clientHeight) {
                    const tooltip = this._getTooltipElement();
                    tooltip.textContent = key;
                    tooltip.style.display = 'block';
                    
                    // Position the tooltip
                    setTimeout(() => {
                        const rect = labelDiv.getBoundingClientRect();
                        tooltip.style.left = `${rect.left}px`;
                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                        
                        // Make sure the tooltip doesn't go off-screen
                        if (parseFloat(tooltip.style.left) < 5) {
                            tooltip.style.left = '5px';
                        }
                        
                        const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                        if (rightEdge > window.innerWidth - 5) {
                            tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                        }
                        
                        if (parseFloat(tooltip.style.top) < 5) {
                            tooltip.style.top = `${rect.bottom + 5}px`;
                        }
                    }, 0);
                }
            });
            
            labelDiv.addEventListener('mouseleave', () => {
                let tooltip = document.getElementById('custom-tooltip');
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
            });
            
            // Create value element
            const valueDiv = document.createElement('div');
            valueDiv.className = `property-value ${valueWrapClass}`;
            valueDiv.textContent = value;
            valueDiv.style.cursor = 'pointer';  // Show pointer cursor to indicate clickability
            
            // Show tooltip on hover if text is truncated
            valueDiv.addEventListener('mouseenter', () => {
                // For values with -webkit-line-clamp, we need to check differently
                // by comparing scrollHeight > clientHeight
                if (valueDiv.scrollHeight > valueDiv.clientHeight) {
                    const tooltip = this._getTooltipElement();
                    tooltip.textContent = value;
                    tooltip.style.display = 'block';
                    
                    // Position the tooltip
                    setTimeout(() => {
                        const rect = valueDiv.getBoundingClientRect();
                        tooltip.style.left = `${rect.left}px`;
                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                        
                        // Make sure the tooltip doesn't go off-screen
                        if (parseFloat(tooltip.style.left) < 5) {
                            tooltip.style.left = '5px';
                        }
                        
                        const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                        if (rightEdge > window.innerWidth - 5) {
                            tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                        }
                        
                        if (parseFloat(tooltip.style.top) < 5) {
                            tooltip.style.top = `${rect.bottom + 5}px`;
                        }
                    }, 0);
                }
            });
            
            valueDiv.addEventListener('mouseleave', () => {
                let tooltip = document.getElementById('custom-tooltip');
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
            });
            
            // Add click-to-copy functionality
            valueDiv.addEventListener('click', () => {
                // Copy value to clipboard
                navigator.clipboard.writeText(value).then(() => {
                    // Show copied confirmation
                    const originalBackgroundColor = valueDiv.style.backgroundColor;
                    const originalBorderRadius = valueDiv.style.borderRadius;
                    
                    // Visual feedback - briefly highlight the element
                    valueDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                    valueDiv.style.borderRadius = '4px';
                    
                    // Show tooltip with "Copied!" message
                    const tooltip = this._getTooltipElement();
                    tooltip.textContent = 'copied to clipboard';
                    tooltip.style.display = 'block';
                    
                    // Position the tooltip
                    const rect = valueDiv.getBoundingClientRect();
                    tooltip.style.left = `${rect.left}px`;
                    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                    
                    // Hover background
                    setTimeout(() => {
                        valueDiv.style.backgroundColor = originalBackgroundColor;
                        valueDiv.style.borderRadius = originalBorderRadius;
                    }, 200);

                    // Clear the tooltip
                    setTimeout(() => {
                        tooltip.style.display = 'none';
                    }, 1000);
                }).catch(err => {
                    console.error('Could not copy text: ', err);
                });
            });
            
            // Add both elements to the property container
            property.appendChild(labelDiv);
            property.appendChild(valueDiv);
            
            return property;
        }

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
            const edges = this.store.getEdgesOfNodeSorted(selectedObject);

            // When rendering neighbors of a node in the default graph,
            // each row corresponds to a single edge. This means if the selected node
            // has multiple edges connecting it to a single neighbor, there will be multiple
            // rows for that particular neighbor.
            if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                for (const edge of edges) {
                    const node = this.store.getNode(edge.sourceUid === selectedObject.uid ? edge.destinationUid : edge.sourceUid);
                    const neighborRowDiv = document.createElement('div');
                    neighborRowDiv.className = 'neighbor-row';

                    const leftColumn = document.createElement('div');
                    leftColumn.className = 'neighbor-column-left';

                    const rightColumn = document.createElement('div');
                    rightColumn.className = 'neighbor-column-right';

                    const edgeDirectionIcon = document.createElement('button');
                    edgeDirectionIcon.className = 'edge-direction-btn circular-hover-effect';
                    edgeDirectionIcon.innerHTML = edge.sourceUid === selectedObject.uid ?
                        this.outgoingEdgeSvg : this.incomingEdgeSvg;

                    const isSource = edge.sourceUid === selectedObject.uid;
                    const tooltipText = isSource ?
                        `Destination edge: ${edge.getLabels()}` :
                        `Source edge: ${edge.getLabels()}`;

                    this._createTooltip(edgeDirectionIcon, tooltipText);

                    edgeDirectionIcon.addEventListener('mouseenter', () => {
                        if (this.store.config.selectedGraphObject !== edge) {
                            this.store.setFocusedObject(edge);
                        }
                    });
                    edgeDirectionIcon.addEventListener('mouseleave', () => {
                        this.store.setFocusedObject(null);
                    });
                    edgeDirectionIcon.addEventListener('click', () => {
                        this.store.setFocusedObject(null);
                        this.store.setSelectedObject(edge);
                    });

                    leftColumn.appendChild(edgeDirectionIcon);

                    const nodeChip = this._nodeChipHtml(node, false);
                    nodeChip.addEventListener('mouseenter', () => {
                        if (this.store.config.selectedGraphObject !== node) {
                            this.store.setFocusedObject(node);
                        }
                    });
                    nodeChip.addEventListener('mouseleave', () => {
                        this.store.setFocusedObject(null);
                    });
                    nodeChip.addEventListener('click', () => {
                        this.store.setFocusedObject(null);
                        this.store.setSelectedObject(node);
                    });

                    leftColumn.appendChild(nodeChip);
                    rightColumn.addEventListener('mouseenter', () => {
                        if (this.store.config.selectedGraphObject !== node) {
                            this.store.setFocusedObject(node);
                        }
                    });
                    rightColumn.addEventListener('mouseleave', () => {
                        this.store.setFocusedObject(null);
                    });
                    rightColumn.addEventListener('click', () => {
                        this.store.setFocusedObject(null);
                        this.store.setSelectedObject(node);
                    });

                    // Node Neighbor ID with background matching node color
                    const idContainer = document.createElement('span');
                    idContainer.className = 'neighbor-id';
                    const identifiersText = this.store.getKeyProperties(node);
                    idContainer.textContent = identifiersText;

                    // Set up the container to check for truncation and show tooltip if needed
                    idContainer.addEventListener('mouseenter', () => {
                        // Check if text is truncated (scrollWidth > clientWidth means text is truncated)
                        if (idContainer.scrollWidth > idContainer.clientWidth) {
                            // Text is truncated, show tooltip
                            const tooltip = this._getTooltipElement();
                            tooltip.textContent = identifiersText;
                            tooltip.style.display = 'block';

                            // Position the tooltip
                            setTimeout(() => {
                                const rect = idContainer.getBoundingClientRect();
                                tooltip.style.left = `${rect.left}px`;
                                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;

                                // Make sure the tooltip doesn't go off-screen
                                if (parseFloat(tooltip.style.left) < 5) {
                                    tooltip.style.left = '5px';
                                }

                                const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                                if (rightEdge > window.innerWidth - 5) {
                                    tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                                }

                                if (parseFloat(tooltip.style.top) < 5) {
                                    tooltip.style.top = `${rect.bottom + 5}px`;
                                }
                            }, 0);
                        }
                    });

                    idContainer.addEventListener('mouseleave', () => {
                        let tooltip = document.getElementById('custom-tooltip');
                        if (tooltip) {
                            tooltip.style.display = 'none';
                        }
                    });

                    rightColumn.appendChild(idContainer);

                    neighborRowDiv.appendChild(leftColumn);
                    neighborRowDiv.appendChild(rightColumn);

                    neighborRowElements.push(neighborRowDiv);
                }
            } else {
                // When rendering neighbors of a node in the schema view,
                // each row is grouped by neighbor and edge direction.
                // It has all associated edges with that neighbor of that
                // direction type in that particular row.
                /** @type {Object.<NodeUID, Array<Edge>>} */
                const neighborMap = {};

                for (const edge of edges) {
                    const neighbor = this.store.getNode(edge.sourceUid === selectedObject.uid ? edge.destinationUid : edge.sourceUid);
                    if (!neighborMap[neighbor.uid]) {
                        neighborMap[neighbor.uid] = [];
                    }

                    neighborMap[neighbor.uid].push(edge);
                }

                for (const neighborUid of Object.keys(neighborMap)) {
                    const neighbor = this.store.getNode(neighborUid);
                    const edges = neighborMap[neighborUid];

                    const incomingEdges = edges.filter(edge => edge.destinationUid === selectedObject.uid && edge.sourceUid !== selectedObject.uid);
                    const outgoingEdges = edges.filter(edge => edge.sourceUid === selectedObject.uid && edge.destinationUid !== selectedObject.uid);
                    const circularEdges = edges.filter(edge => edge.sourceUid === selectedObject.uid && edge.destinationUid === selectedObject.uid);

                    /**
                     * @param {Array<Edge>} edges
                     * @param {'source'|'destination'|'circular'} direction
                     * @returns {HTMLElement}
                     */
                    const createSchemaNeighborRow = (edges, direction) => {
                        const neighborRowDiv = document.createElement('div');
                        neighborRowDiv.className = 'neighbor-row schema-row';

                        const leftColumn = document.createElement('div');
                        leftColumn.className = 'neighbor-column-left';

                        const rightColumn = document.createElement('div');
                        rightColumn.className = 'neighbor-column-right';

                        const edgeDirectionIcon = document.createElement('button');
                        edgeDirectionIcon.className = 'edge-direction-btn circular-hover-effect';
                        switch (direction) {
                            case 'source':
                                edgeDirectionIcon.innerHTML = this.outgoingEdgeSvg;
                                break;
                            case 'destination':
                                edgeDirectionIcon.innerHTML = this.incomingEdgeSvg;
                                break;
                            case 'circular':
                                edgeDirectionIcon.innerHTML = this.circularEdgeSvg;
                                break;
                        }
                        leftColumn.appendChild(edgeDirectionIcon);

                        const nodeChip = this._nodeChipHtml(neighbor, true);
                        rightColumn.appendChild(nodeChip);

                        for (const edge of edges) {
                            const edgeChip = this._edgeChipHtml(edge, true);
                            rightColumn.appendChild(edgeChip);
                        }

                        neighborRowDiv.appendChild(leftColumn);
                        neighborRowDiv.appendChild(rightColumn);

                        return neighborRowDiv
                    }

                    if (outgoingEdges.length) {
                        const neighborRowDiv = createSchemaNeighborRow(outgoingEdges, 'source');
                        neighborRowElements.push(neighborRowDiv);
                    }

                    if (incomingEdges.length) {
                        const neighborRowDiv = createSchemaNeighborRow(incomingEdges, 'destination');
                        neighborRowElements.push(neighborRowDiv);
                    }

                    if (circularEdges.length) {
                        const neighborRowDiv = createSchemaNeighborRow(incomingEdges, 'circular');
                        neighborRowElements.push(neighborRowDiv);
                    }
                }
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

                const leftColumn = document.createElement('div');
                leftColumn.className = 'neighbor-column-left';
                
                // Add edge direction button for visual indication
                const edgeDirectionIcon = document.createElement('button');
                edgeDirectionIcon.className = 'edge-direction-btn circular-hover-effect';
                edgeDirectionIcon.innerHTML = neighborType === 'target' ? 
                    this.outgoingEdgeSvg : this.incomingEdgeSvg;
                
                // Add tooltip for the edge direction button
                const tooltipText = neighborType === 'target' ? 
                    `Destination edge: ${selectedObject.getLabels()}` : 
                    `Source edge: ${selectedObject.getLabels()}`;
                
                this._createTooltip(edgeDirectionIcon, tooltipText);
                
                leftColumn.appendChild(edgeDirectionIcon);
                
                const nodeChip = this._nodeChipHtml(neighbor, false);
                leftColumn.appendChild(nodeChip);
                
                leftColumn.addEventListener('mouseenter', () => {
                    if (this.store.config.selectedGraphObject !== neighbor) {
                        this.store.setFocusedObject(neighbor);
                    }
                });
                leftColumn.addEventListener('mouseleave', () => {
                    this.store.setFocusedObject(null);
                });
                leftColumn.addEventListener('click', () => {
                    this.store.setFocusedObject(null);
                    this.store.setSelectedObject(neighbor);
                });
                
                const rightColumn = document.createElement('div');
                rightColumn.className = 'neighbor-column-right';
                
                if (this.store.config.viewMode === GraphConfig.ViewModes.DEFAULT) {
                    const idContainer = document.createElement('span');
                    idContainer.className = 'neighbor-id';
                    const identifiersText = this.store.getKeyProperties(neighbor);
                    idContainer.textContent = identifiersText;
                    
                    // Set up the container to check for truncation and show tooltip if needed
                    idContainer.addEventListener('mouseenter', () => {
                        // Check if text is truncated (scrollWidth > clientWidth means text is truncated)
                        if (idContainer.scrollWidth > idContainer.clientWidth) {
                            // Text is truncated, show tooltip
                            const tooltip = this._getTooltipElement();
                            tooltip.textContent = identifiersText;
                            tooltip.style.display = 'block';
                            
                            // Position the tooltip
                            setTimeout(() => {
                                const rect = idContainer.getBoundingClientRect();
                                tooltip.style.left = `${rect.left}px`;
                                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                                
                                // Make sure the tooltip doesn't go off-screen
                                if (parseFloat(tooltip.style.left) < 5) {
                                    tooltip.style.left = '5px';
                                }
                                
                                const rightEdge = parseFloat(tooltip.style.left) + tooltip.offsetWidth;
                                if (rightEdge > window.innerWidth - 5) {
                                    tooltip.style.left = `${window.innerWidth - tooltip.offsetWidth - 5}px`;
                                }
                                
                                if (parseFloat(tooltip.style.top) < 5) {
                                    tooltip.style.top = `${rect.bottom + 5}px`;
                                }
                            }, 0);
                        }
                    });
                    
                    idContainer.addEventListener('mouseleave', () => {
                        let tooltip = document.getElementById('custom-tooltip');
                        if (tooltip) {
                            tooltip.style.display = 'none';
                        }
                    });
                    
                    rightColumn.appendChild(idContainer);
                }
                
                // Make right column interactive
                rightColumn.addEventListener('mouseenter', () => {
                    if (this.store.config.selectedGraphObject !== neighbor) {
                        this.store.setFocusedObject(neighbor);
                    }
                });
                rightColumn.addEventListener('mouseleave', () => {
                    this.store.setFocusedObject(null);
                });
                rightColumn.addEventListener('click', () => {
                    this.store.setFocusedObject(null);
                    this.store.setSelectedObject(neighbor);
                });
                
                neighborRow.appendChild(leftColumn);
                neighborRow.appendChild(rightColumn);

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