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

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    GraphStore = require('../spanner-store');
}

class SpannerMenu {
    svg = {
        bubble: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M580-120q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-80q17 0 28.5-11.5T620-240q0-17-11.5-28.5T580-280q-17 0-28.5 11.5T540-240q0 17 11.5 28.5T580-200Zm80-200q-92 0-156-64t-64-156q0-92 64-156t156-64q92 0 156 64t64 156q0 92-64 156t-156 64Zm0-80q59 0 99.5-40.5T800-620q0-59-40.5-99.5T660-760q-59 0-99.5 40.5T520-620q0 59 40.5 99.5T660-480ZM280-240q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T360-400q0-33-23.5-56.5T280-480q-33 0-56.5 23.5T200-400q0 33 23.5 56.5T280-320Zm300 80Zm80-380ZM280-400Z"/></svg>`,
        table: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm240-240H200v160h240v-160Zm80 0v160h240v-160H520Zm-80-80v-160H200v160h240Zm80 0h240v-160H520v160ZM200-680h560v-80H200v80Z"/></svg>`,
        schema: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M160-40v-240h100v-80H160v-240h100v-80H160v-240h280v240H340v80h100v80h120v-80h280v240H560v-80H440v80H340v80h100v240H160Zm80-80h120v-80H240v80Zm0-320h120v-80H240v80Zm400 0h120v-80H640v80ZM240-760h120v-80H240v80Zm60-40Zm0 320Zm400 0ZM300-160Z"/></svg>`,
        enterFullScreen: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M120-120v-200h80v120h120v80H120Zm520 0v-80h120v-120h80v200H640ZM120-640v-200h200v80H200v120h-80Zm640 0v-120H640v-80h200v200h-80Z"/></svg>`,
        exitFullScreen: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M240-120v-120H120v-80h200v200h-80Zm400 0v-200h200v80H720v120h-80ZM120-640v-80h120v-120h80v200H120Zm520 0v-200h80v120h120v80H640Z"/></svg>`
    };

    elements = {
        views: {
            /**
             * @type {HTMLElement}
             */
            container: null,
            /**
             * @type {Array<HTMLButtonElement>}
             */
            buttons: [],
        },
        layout: {
            /**
             * @type {HTMLElement}
             */
            container: null,
            /**
             * @type {HTMLElement}
             */
            title: null,
            /**
             * @type {Array<HTMLElement>}
             */
            buttons: [],
            /**
             * @type {HTMLElement}
             */
            content: null,
        },
        /**
         * @type {HTMLElement}
         */
        nodeEdgeCount: null,
        showLabels: {
            /**
             * @type {HTMLElement}
             */
            container: null,
            /**
             * @type {HTMLInputElement}
             */
            switch: null,
        },
        /**
         * @type {HTMLButtonElement}
         */
        fullscreen: null
    };

    constructor(inStore, inMount) {
        this.store = inStore;
        this.mount = inMount;

        this.scaffold();
        this.initializeEvents();
    }

    scaffold() {
        this.mount.innerHTML = `
            <style>
                header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .menu-bar {
                    align-items: center;
                    border-bottom: 1px solid #DADCE0;
                    box-sizing: border-box;
                    color: #3C4043;
                    display: flex;
                    padding: 16px 24px 16px 16px;
                    width: 100%;
                    background: #fff;
                }
                .menu-item {
                    display: flex;
                    margin-right: 16px;
                }
                .menu-bar .hidden {
                    visibility: hidden;
                }
                .fullscreen-container.remove {
                    display: none;
                }
                .toggle-container {
                    display: flex;
                    align-items: center;
                    height: 100%;
                    margin-left: 10px;
                }
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                    flex-shrink: 0;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                    margin: 0;
                    padding: 0;
                }
                .hidden .toggle-slider {
                    transition: 0ms;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #e9ecef;
                    transition: .4s;
                    border-radius: 24px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background-color: #228be6;
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(22px);
                }
                .toggle-label {
                    margin-left: 8px;
                    color: #202124;
                    line-height: 24px;
                    font-size: .9rem;
                }
                .graph-element-tooltip {
                    font: 12px 'Google Sans', 'Roboto', sans-serif;
                    position: absolute;
                    padding: 4px 8px;
                    box-sizing: border-box;
                    pointer-events: none;
                    transition: opacity 0.2s ease-in-out;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }
                
                /* Ensure .graph-tooltip built-in from force-graph does not interfere */
                .graph-tooltip {
                    background: none !important;
                    border: none !important;
                    padding: 0 !important;
                }

                .menu-bar .dropdown {
                    margin-right: 16px;
                    position: relative;
                }

                .dropdown-toggle {
                    appearance: none;
                    background: url("data:image/svg+xml;utf8,<svg fill='rgba(73, 80, 87, 1)' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>") no-repeat;
                    background-position: right 10px center;
                    background-color: white;
                    padding: 12px 40px 12px 16px;
                    border: 1px solid #80868B;
                    border-radius: 4px;
                    color: #3C4043;
                    cursor: pointer;
                    text-align: left;
                    
                    width: 220px;

                    font-family: inherit;
                    font-size: .9rem;
                }
                
                .dropdown-toggle.disabled {
                    background: url("data:image/svg+xml;utf8,<svg fill='rgba(73, 80, 87, .6)' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>") no-repeat;
                    background-position: right 10px center;
                    background-color: #EBEBE4;
                    border: 1px solid #EBEBE4;
                    cursor: default;
                }

                .arrow-down {
                    margin-left: 5px;
                    font-size: 10px;
                }

                .menu-bar .dropdown .dropdown-content {
                    display: none;
                    position: absolute;
                    background-color: #fff;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    z-index: 1;
                    top: 100%;
                    left: 0;
                    padding: 8px 0;
                }

                .menu-bar .dropdown:hover .dropdown-content:not(.disabled) {
                    display: block;
                }

                .menu-bar .dropdown .dropdown-item {
                    color: #495057;
                    padding: 8px 32px 8px 8px;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                }

                .menu-bar .dropdown .dropdown-item.selected {
                    background: url("data:image/svg+xml;utf8,<svg height='24' viewBox='0 0 24 24' width='24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M2 6L5 9L10 3' stroke='rgba(73, 80, 87, 1)' stroke-width='2' stroke-linecap='square'/></svg>") no-repeat;
                    background-position: left 15px top 100%;
                }

                .menu-bar .dropdown .dropdown-item:hover {
                    background-color: #f8f9fa;
                }

                .checkmark {
                    width: 20px;
                    margin-right: 8px;
                }

                .element-count {
                    color: #000;
                    display: flex;
                    flex: 1;
                    font-weight: 500;
                }

                .item-text {
                    flex: 1;
                    font-size: .9rem;
                }
                
                #graph-tools {
                    position: absolute;
                    bottom: 16px;
                    right: 16px;
                }
        
                #graph-tools button {
                    display: block;
                    width: 40px;
                    height: 40px;
                    background-color: transparent;
                    border: none;
                    border-radius: 20px;
                    cursor: pointer;
                }
        
                #graph-tools button:hover {
                    background-color: rgba(26, 115, 232, .08);
                }
                
                .view-toggle-group,
                .fullscreen-container {
                    display: flex;
                    align-items: center;
                    margin-right: 16px;
                    border: 1px solid #DADCE0;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .view-toggle-group .view-toggle-button,
                .fullscreen-container .fullscreen-button {
                    background: none;
                    border: none;
                    padding: 8px;
                    display: flex;
                    cursor: pointer;
                    align-items: center;
                    justify-content: center;
                    border-radius: 0;
                }
                
                .view-toggle-button.disabled {
                    cursor: default;
                    opacity: 0.5;
                    background-color: rgba(0, 0, 0, .03);
                }

                .view-toggle-button:not(:last-child) {
                    border-right: 1px solid #DADCE0;
                }

                .view-toggle-button:hover:not(.view-toggle-button.disabled, .view-toggle-button.active),
                .fullscreen-button:hover {
                    background-color: rgba(0, 0, 0, 0.04);
                }

                .view-toggle-button.active {
                    background-color: #E8F0FE;
                }

                .view-toggle-button.active svg {
                    fill: #1A73E8;
                }
            </style>
            <div class="menu-bar">
                <div class="view-toggle-group">
                    <button class="view-toggle-button active" id="view-default" data-view="${GraphConfig.ViewModes.DEFAULT.description}" title="Graph View">
                        ${this.svg.bubble}
                    </button>
                    <button class="view-toggle-button" id="view-table" data-view="${GraphConfig.ViewModes.TABLE.description}" title="Table View">
                        ${this.svg.table}
                    </button>
                    <button class="view-toggle-button" id="view-schema" data-view="${GraphConfig.ViewModes.SCHEMA.description}" title="Schema View">
                        ${this.svg.schema}
                    </button>
                </div>
                
                <div class="dropdown">
                    <button class="dropdown-toggle">
                        Force layout
                    </button>
                    <div class="dropdown-content">
                        <a href="#" class="dropdown-item selected" data-layout="${GraphConfig.LayoutModes.FORCE.description}">
                            <span class="checkmark"></span>
                            <span class="item-text">Force layout</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="${GraphConfig.LayoutModes.TOP_DOWN.description}">
                            <span class="checkmark"></span>
                            <span class="item-text">Top-down</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="${GraphConfig.LayoutModes.LEFT_RIGHT.description}">
                            <span class="checkmark"></span>
                            <span class="item-text">Left-to-right</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="${GraphConfig.LayoutModes.RADIAL_IN.description}">
                            <span class="checkmark"></span>
                            <span class="item-text">Radial inward</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="${GraphConfig.LayoutModes.RADIAL_OUT.description}">
                            <span class="checkmark"></span>
                            <span class="item-text">Radial outward</span>
                        </a>
                    </div>
                </div>
                
                <div class="element-count"></div>
                
                <div class="toggle-container" id="show-labels-container">
                    <label class="toggle-switch">
                        <input id="show-labels" type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">Show labels</span>
                </div>
                
                <div class="fullscreen-container remove">
                    <button class="fullscreen-button">
                        ${this.svg.enterFullScreen}
                    </button>
                </div>
            </div>`;

        this.elements.views.container = this.mount.querySelector('.view-toggle-group');
        this.elements.views.default = this.mount.querySelector('#view-default');
        this.elements.views.table = this.mount.querySelector('#view-table');
        this.elements.views.schema = this.mount.querySelector('#view-schema');

        this.elements.layout.container = this.mount.querySelector('.dropdown');
        this.elements.layout.buttons = this.mount.querySelectorAll('.dropdown-item');
        this.elements.layout.title = this.mount.querySelector('.dropdown-toggle');
        this.elements.layout.content = this.mount.querySelector('.dropdown-content');

        this.elements.nodeEdgeCount = this.mount.querySelector('.element-count');
        this.elements.showLabels.container = this.mount.querySelector('#show-labels-container');
        this.elements.showLabels.switch = this.mount.querySelector('#show-labels');

        this.elements.fullscreen = this.mount.querySelector('.fullscreen-button');

        this.refreshNodeEdgeCount();
    }

    refreshNodeEdgeCount() {
        if (!this.elements.nodeEdgeCount) {
            return;
        }

        this.elements.nodeEdgeCount.textContent = `${Object.keys(this.store.config.nodes).length} nodes, ${Object.keys(this.store.config.edges).length} edges`;
    }

    initializeEvents() {
        // View Modes
        this.elements.views.buttons = this.mount.querySelectorAll('.view-toggle-button');
        this.elements.views.buttons.forEach(button => {
            switch (button.dataset.view) {
                case GraphConfig.ViewModes.DEFAULT.description:
                    if (Object.keys(this.store.config.nodes).length) {
                        button.addEventListener('click', () => this.store.setViewMode(GraphConfig.ViewModes[button.dataset.view]));
                    } else {
                        button.classList.add('disabled');
                    }
                    break;
                case GraphConfig.ViewModes.TABLE.description:
                    if (this.store.config.queryResult instanceof Object) {
                        button.addEventListener('click', () => this.store.setViewMode(GraphConfig.ViewModes[button.dataset.view]));
                    } else {
                        button.classList.add('disabled');
                    }
                    break;
                case GraphConfig.ViewModes.SCHEMA.description:
                    if (this.store.config.schema && this.store.config.schema.rawSchema) {
                        button.addEventListener('click', () => this.store.setViewMode(GraphConfig.ViewModes[button.dataset.view]));
                    } else {
                        button.classList.add('disabled');
                    }
                    break;
            }
        });

        this.store.addEventListener(GraphStore.EventTypes.VIEW_MODE_CHANGE, (viewMode) => {
            this.elements.views.buttons.forEach(button => {
               if (button.dataset.view === viewMode.description) {
                    button.classList.add('active');
               } else {
                    button.classList.remove('active');
               }
            });

            switch (viewMode) {
                case GraphConfig.ViewModes.DEFAULT:
                    // visibility: [view modes] [layout dropdown] [node-edge count] [show labels]
                    this.elements.layout.container.classList.remove('hidden');
                    this.elements.nodeEdgeCount.classList.remove('hidden');
                    this.elements.showLabels.container.classList.remove('hidden');
                    if (typeof google === 'undefined') {
                        this.elements.fullscreen.parentElement.classList.add('remove');
                    }
                    break;
                case GraphConfig.ViewModes.TABLE:
                    // visibility: [view modes] [fullscreen]
                    this.elements.layout.container.classList.add('hidden');
                    this.elements.nodeEdgeCount.classList.add('hidden');
                    this.elements.showLabels.container.classList.add('hidden');
                    if (typeof google === 'undefined') {
                        this.elements.fullscreen.parentElement.classList.remove('remove');
                    }
                    break;
                case GraphConfig.ViewModes.SCHEMA:
                    // visibility: [view modes]
                    this.elements.layout.container.classList.add('hidden');
                    this.elements.nodeEdgeCount.classList.add('hidden');
                    this.elements.showLabels.container.classList.add('hidden');
                    if (typeof google === 'undefined') {
                        this.elements.fullscreen.parentElement.classList.add('remove');
                    }
                    break;
            }
        });

        // Layouts
        this.elements.layout.content.addEventListener('click', e => {
            e.preventDefault();

            const layoutButton = e.target.closest('.dropdown-item');
            if (!layoutButton) return;

            this.store.setLayoutMode(GraphConfig.LayoutModes[layoutButton.dataset.layout]);
        });

        this.store.addEventListener(GraphStore.EventTypes.LAYOUT_MODE_CHANGE, (layoutMode) => {
            this.elements.layout.buttons.forEach(button => {
                if (button.dataset.layout === layoutMode.description) {
                    button.classList.add('selected');
                    this.elements.layout.title.textContent = button.textContent;
                } else {
                    button.classList.remove('selected');
                }
            });
        });

        // Show Labels
        this.elements.showLabels.switch.addEventListener('change', () => {
            this.store.showLabels(this.elements.showLabels.switch.checked);
        });

        this.store.addEventListener(GraphStore.EventTypes.SHOW_LABELS, (visible) => {
           this.elements.showLabels.switch.checked = visible;
        });

        // Update node and edge count after node expansion
        this.store.addEventListener(GraphStore.EventTypes.GRAPH_DATA_UPDATE, (currentGraph, updates, config) => {
            this.refreshNodeEdgeCount();
        });

        // Toggle Fullscreen
        if (typeof google === 'undefined') {
            const debounce = (callback, timeout = 300) => {
                let timer = 0;
                return (...args) => {
                    window.clearTimeout(timer);
                    timer = window.setTimeout(() => {
                        callback.apply(this, args);
                    }, timeout);
                }
            }

            const fullscreenMount = this.mount.parentElement;
            window.addEventListener('fullscreenchange', debounce((e) => {
                if (fullscreenMount !== e.target) {
                    return;
                }

                if (!document.fullscreenElement) {
                    this.elements.fullscreen.innerHTML = this.svg.enterFullScreen;
                } else {
                    this.elements.fullscreen.innerHTML = this.svg.exitFullScreen;
                }
            }));

            this.elements.fullscreen.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    this.elements.fullscreen.innerHTML = this.svg.exitFullScreen;
                    if (fullscreenMount.requestFullscreen) {
                        fullscreenMount.requestFullscreen();
                    } else if (fullscreenMount.mozRequestFullScreen) { // Firefox
                        fullscreenMount.mozRequestFullScreen();
                    } else if (fullscreenMount.webkitRequestFullscreen) { // Chrome, Safari and Opera
                        fullscreenMount.webkitRequestFullscreen();
                    } else if (fullscreenMount.msRequestFullscreen) { // IE/Edge
                        fullscreenMount.msRequestFullscreen();
                    }
                } else {
                    this.elements.fullscreen.innerHTML = this.svg.enterFullScreen;
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                }
            });
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpannerMenu;
}