/**
 * graph_visualizer.js
 * High-performance, interactive SVG State Diagram Visualizer.
 * Supports:
 * - Circular & Force-directed layout
 * - Draggable nodes
 * - Clean curved transitions, self-loops, and bidirectional curves
 * - Visual differentiation between Mealy (edge: in/out) and Moore (node: state/out, edge: in)
 * - Initial state indicator arrow
 * - Real-time step highlighting (nodes & edges)
 * - Zoom & Pan with reset
 * - SVG export
 */

class AutomataGraphVisualizer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found.`);
            return;
        }

        this.options = {
            width: options.width || 600,
            height: options.height || 450,
            nodeRadius: options.nodeRadius || 30,
            theme: options.theme || "dark",
            title: options.title || "State Diagram",
            ...options
        };

        this.machine = null;
        this.nodes = [];
        this.edges = [];
        this.activeNodeId = null;
        this.activeEdgeKey = null;

        // Pan and Zoom state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.draggedNode = null;
        this.startMouseX = 0;
        this.startMouseY = 0;

        this.initDOM();
    }

    initDOM() {
        this.container.innerHTML = "";
        this.container.style.position = "relative";
        this.container.style.overflow = "hidden";
        this.container.style.userSelect = "none";

        // Create Header Toolbar
        const toolbar = document.createElement("div");
        toolbar.className = "graph-toolbar";
        toolbar.innerHTML = `
            <div class="graph-title font-semibold text-xs uppercase tracking-wider text-slate-400">
                ${this.options.title}
            </div>
            <div class="graph-controls flex gap-1">
                <button class="btn-icon" data-action="zoom-in" title="Zoom In">+</button>
                <button class="btn-icon" data-action="zoom-out" title="Zoom Out">-</button>
                <button class="btn-icon" data-action="reset" title="Reset View">&#x21bb;</button>
                <button class="btn-icon" data-action="layout" title="Re-arrange Layout">&#x25A6;</button>
                <button class="btn-icon" data-action="export" title="Export SVG">&#x21e9;</button>
            </div>
        `;
        this.container.appendChild(toolbar);

        // SVG element
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.svg.setAttribute("viewBox", `0 0 ${this.options.width} ${this.options.height}`);
        this.svg.style.cursor = "grab";
        this.svg.style.display = "block";

        // Defs (Arrowheads)
        this.defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        this.defs.innerHTML = `
            <marker id="arrow-${this.container.id}" viewBox="0 0 10 10" refX="22" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3d3d3a" />
            </marker>
            <marker id="arrow-active-${this.container.id}" viewBox="0 0 10 10" refX="22" refY="5"
                    markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97757" />
            </marker>
            <marker id="start-arrow-${this.container.id}" viewBox="0 0 10 10" refX="20" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#141413" />
            </marker>
        `;
        this.svg.appendChild(this.defs);

        // Graph Root Group (for zoom & pan)
        this.rootGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.rootGroup.setAttribute("class", "graph-root");
        this.svg.appendChild(this.rootGroup);

        // Subgroups for proper layering: Edges below Nodes, Labels on top
        this.edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.edgesGroup.setAttribute("class", "edges-layer");
        this.rootGroup.appendChild(this.edgesGroup);

        this.nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.nodesGroup.setAttribute("class", "nodes-layer");
        this.rootGroup.appendChild(this.nodesGroup);

        this.container.appendChild(this.svg);

        this.bindEvents();
    }

    bindEvents() {
        // Toolbar actions
        this.container.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            if (action === "zoom-in") this.setZoom(this.zoom * 1.2);
            if (action === "zoom-out") this.setZoom(this.zoom / 1.2);
            if (action === "reset") this.resetView();
            if (action === "layout") this.calculateLayout();
            if (action === "export") this.exportSVG();
        });

        // Wheel Zoom
        this.svg.addEventListener("wheel", (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            this.setZoom(this.zoom * factor);
        }, { passive: false });

        // Pan and Node Dragging
        this.svg.addEventListener("mousedown", (e) => {
            const nodeTarget = e.target.closest(".node-group");
            if (nodeTarget) {
                const nodeId = nodeTarget.getAttribute("data-id");
                this.draggedNode = this.nodes.find(n => n.id === nodeId);
                this.svg.style.cursor = "grabbing";
            } else {
                this.isPanning = true;
                this.startMouseX = e.clientX - this.panX;
                this.startMouseY = e.clientY - this.panY;
                this.svg.style.cursor = "grabbing";
            }
        });

        window.addEventListener("mousemove", (e) => {
            if (this.draggedNode) {
                const rect = this.svg.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left - this.panX) / this.zoom;
                const mouseY = (e.clientY - rect.top - this.panY) / this.zoom;
                this.draggedNode.x = mouseX;
                this.draggedNode.y = mouseY;
                this.render();
            } else if (this.isPanning) {
                this.panX = e.clientX - this.startMouseX;
                this.panY = e.clientY - this.startMouseY;
                this.updateTransform();
            }
        });

        window.addEventListener("mouseup", () => {
            this.draggedNode = null;
            this.isPanning = false;
            this.svg.style.cursor = "grab";
        });
    }

    setZoom(newZoom) {
        this.zoom = Math.max(0.3, Math.min(3.5, newZoom));
        this.updateTransform();
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.calculateLayout();
        this.updateTransform();
    }

    updateTransform() {
        this.rootGroup.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }

    setMachine(machine, title = null) {
        this.machine = machine;
        if (title) {
            const titleEl = this.container.querySelector(".graph-title");
            if (titleEl) titleEl.innerText = title;
        }
        this.calculateLayout();
        this.render();
    }

    calculateLayout() {
        if (!this.machine || !this.machine.states || this.machine.states.length === 0) {
            this.nodes = [];
            this.edges = [];
            this.render();
            return;
        }

        const stateList = this.machine.states;
        const count = stateList.length;
        const cx = this.options.width / 2;
        const cy = this.options.height / 2;
        const radius = Math.min(cx, cy) * 0.65;

        // Place nodes in a clean circle
        this.nodes = stateList.map((state, i) => {
            const angle = (2 * Math.PI * i / count) - (Math.PI / 2);
            return {
                id: state,
                label: state,
                output: this.machine.type === "Moore" ? this.machine.stateOutputs[state] : null,
                isInitial: state === this.machine.initialState,
                x: count === 1 ? cx : cx + radius * Math.cos(angle),
                y: count === 1 ? cy : cy + radius * Math.sin(angle)
            };
        });

        // Group transitions between same source and destination
        // key = from -> to
        const edgeMap = new Map();

        for (const from of stateList) {
            for (const sym of this.machine.alphabet) {
                const to = this.machine.transitions[from]?.[sym];
                if (!to) continue;

                const key = `${from}-->${to}`;
                const outSym = this.machine.type === "Mealy" ? this.machine.outputs[from]?.[sym] : null;

                if (!edgeMap.has(key)) {
                    edgeMap.set(key, {
                        from: from,
                        to: to,
                        labels: [],
                        isSelfLoop: from === to
                    });
                }
                const labelText = this.machine.type === "Mealy" ? `${sym}/${outSym}` : `${sym}`;
                edgeMap.get(key).labels.push(labelText);
            }
        }

        this.edges = Array.from(edgeMap.values());
        this.render();
    }

    render() {
        if (!this.rootGroup) return;

        // Clear existing
        this.edgesGroup.innerHTML = "";
        this.nodesGroup.innerHTML = "";

        if (this.nodes.length === 0) {
            this.nodesGroup.innerHTML = `
                <text x="${this.options.width / 2}" y="${this.options.height / 2}"
                      fill="#5e5d59" text-anchor="middle" font-size="14" font-family="'Space Grotesk', sans-serif">
                    No automaton loaded
                </text>
            `;
            return;
        }

        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

        // Render Start Arrow (for Initial State)
        const initialNode = this.nodes.find(n => n.isInitial);
        if (initialNode) {
            const startG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            startG.setAttribute("class", "start-arrow-group");

            const arrowLen = 45;
            const sx = initialNode.x - arrowLen;
            const sy = initialNode.y;

            startG.innerHTML = `
                <path d="M ${sx} ${sy} L ${initialNode.x - 2} ${initialNode.y}"
                      stroke="#141413" stroke-width="2" stroke-linecap="round"
                      marker-end="url(#start-arrow-${this.container.id})" />
                <text x="${sx - 6}" y="${sy + 4}" fill="#141413" font-size="10.5" font-family="'Space Grotesk', sans-serif" font-weight="700" text-anchor="end">
                    START
                </text>
            `;
            this.edgesGroup.appendChild(startG);
        }

        // Render Edges
        for (const edge of this.edges) {
            const u = nodeMap.get(edge.from);
            const v = nodeMap.get(edge.to);
            if (!u || !v) continue;

            const edgeKey = `${edge.from}->${edge.to}`;
            const isActive = (this.activeEdgeKey === edgeKey);

            // Check if reverse edge exists for dual arc curvature
            const reverseKey = `${edge.to}-->${edge.from}`;
            const hasReverse = edgeMapHasReverse(this.edges, edge);

            const edgeEl = this.createEdgeElement(u, v, edge, hasReverse, isActive);
            this.edgesGroup.appendChild(edgeEl);
        }

        // Render Nodes
        for (const node of this.nodes) {
            const isActive = (this.activeNodeId === node.id);
            const nodeEl = this.createNodeElement(node, isActive);
            this.nodesGroup.appendChild(nodeEl);
        }
    }

    createNodeElement(node, isActive) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", `node-group ${isActive ? "active" : ""}`);
        g.setAttribute("data-id", node.id);
        g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
        g.style.cursor = "pointer";

        const r = this.options.nodeRadius;
        const strokeColor = isActive ? "#d97757" : (node.isInitial ? "#141413" : "#3d3d3a");
        const fillColor = isActive ? "rgba(217, 119, 87, 0.12)" : "#ffffff";

        // Determine labels
        let labelMarkup = "";
        if (this.machine.type === "Moore") {
            // Display state name and output, e.g. "q0 / 0"
            labelMarkup = `
                <text y="-4" fill="#141413" font-size="13" font-weight="bold" font-family="'Space Grotesk', sans-serif" text-anchor="middle">
                    ${escapeXml(node.label)}
                </text>
                <line x1="${-r + 8}" y1="2" x2="${r - 8}" y2="2" stroke="#d1cfc5" stroke-width="1" />
                <text y="16" fill="#a6482d" font-size="11" font-weight="600" font-family="'IBM Plex Mono', monospace" text-anchor="middle">
                    ${escapeXml(node.output || "")}
                </text>
            `;
        } else {
            // Mealy: Display state name inside circle
            labelMarkup = `
                <text y="5" fill="#141413" font-size="13.5" font-weight="bold" font-family="'Space Grotesk', sans-serif" text-anchor="middle">
                    ${escapeXml(node.label)}
                </text>
            `;
        }

        g.innerHTML = `
            <circle r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isActive ? 3 : 2}" />
            ${labelMarkup}
        `;

        return g;
    }

    createEdgeElement(u, v, edge, hasReverse, isActive) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", `edge-group ${isActive ? "active-edge" : ""}`);

        const markerId = isActive ? `arrow-active-${this.container.id}` : `arrow-${this.container.id}`;
        const strokeColor = isActive ? "#d97757" : "#3d3d3a";
        const strokeWidth = isActive ? 2.6 : 1.6;
        const labelsText = edge.labels.join(", ");

        let pathD = "";
        let labelX = 0;
        let labelY = 0;

        if (edge.isSelfLoop) {
            // Self loop arc above node
            const r = this.options.nodeRadius;
            const x1 = u.x - r * 0.5;
            const y1 = u.y - r * 0.85;
            const x2 = u.x + r * 0.5;
            const y2 = u.y - r * 0.85;
            const loopHeight = 55;

            pathD = `M ${x1} ${y1} C ${u.x - 35} ${u.y - loopHeight}, ${u.x + 35} ${u.y - loopHeight}, ${x2} ${y2}`;
            labelX = u.x;
            labelY = u.y - loopHeight - 2;
        } else {
            const dx = v.x - u.x;
            const dy = v.y - u.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Unit direction vector
            const ux = dx / dist;
            const uy = dy / dist;

            // Perpendicular vector for curvature
            const px = -uy;
            const py = ux;

            const curveFactor = hasReverse ? 26 : 0;

            const midX = (u.x + v.x) / 2 + px * curveFactor;
            const midY = (u.y + v.y) / 2 + py * curveFactor;

            pathD = `M ${u.x} ${u.y} Q ${midX} ${midY} ${v.x} ${v.y}`;
            labelX = midX;
            labelY = midY;
        }

        g.innerHTML = `
            <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"
                  marker-end="url(#${markerId})" />
            <g transform="translate(${labelX}, ${labelY})">
                <rect x="${-labelsText.length * 4.2 - 6}" y="-11"
                      width="${labelsText.length * 8.4 + 12}" height="20" rx="4"
                      fill="#ffffff" stroke="${isActive ? '#d97757' : '#d1cfc5'}" stroke-width="${isActive ? 1.5 : 1}" />
                <text y="3" fill="${isActive ? '#a6482d' : '#141413'}"
                      font-size="11" font-weight="600" font-family="'IBM Plex Mono', monospace" text-anchor="middle">
                    ${escapeXml(labelsText)}
                </text>
            </g>
        `;

        return g;
    }

    highlightState(stateId) {
        this.activeNodeId = stateId;
        this.render();
    }

    highlightTransition(fromState, toState) {
        this.activeEdgeKey = `${fromState}->${toState}`;
        this.activeNodeId = toState;
        this.render();
    }

    clearHighlights() {
        this.activeNodeId = null;
        this.activeEdgeKey = null;
        this.render();
    }

    exportSVG() {
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(this.svg);
        const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${this.machine?.name || "automaton"}_diagram.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function edgeMapHasReverse(edges, edge) {
    if (edge.isSelfLoop) return false;
    return edges.some(e => e.from === edge.to && e.to === edge.from);
}

function escapeXml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe).replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { AutomataGraphVisualizer };
} else {
    window.AutomataGraphVisualizer = AutomataGraphVisualizer;
}

