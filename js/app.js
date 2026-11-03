/**
 * app.js
 * Main Controller for Mealy <-> Moore Automata Simulator.
 * Orchestrates UI tabs, matrix editor, graph visualizers, conversion stepper,
 * string simulation engine, batch testing, and report generation.
 */

class AutomataApp {
    constructor() {
        this.currentMode = "mealy_to_moore"; // or "moore_to_mealy"
        this.sourceMachine = null;
        this.targetMachine = null;
        this.conversionResult = null;
        this.currentStepIndex = 0;

        // Visualizers
        this.sourceVisualizer = null;
        this.targetVisualizer = null;

        // Simulation
        this.simulationEngine = null;

        this.init();
    }

    init() {
        // Initialize Visualizers
        this.sourceVisualizer = new AutomataGraphVisualizer("source-graph-container", {
            title: "Source Machine (Mealy)"
        });
        this.targetVisualizer = new AutomataGraphVisualizer("target-graph-container", {
            title: "Target Converted Machine (Moore)"
        });

        // Initialize Simulation Engine
        this.simulationEngine = new SimulationEngine({
            sourceVisualizer: this.sourceVisualizer,
            targetVisualizer: this.targetVisualizer,
            onStepChange: (status) => this.renderSimulationState(status),
            onSimulationEnd: () => {
                const playBtn = document.getElementById("sim-play-btn");
                if (playBtn) playBtn.innerHTML = "&#9654; Run";
            }
        });

        this.bindNavTabs();
        this.bindModeSwitcher();
        this.bindEditorEvents();
        this.bindStepperEvents();
        this.bindSimulationControls();
        this.bindBatchTesting();
        this.bindExportImport();

        // Load default preset: Sequence Detector 101
        this.loadPreset("seq101_mealy");
    }

    /* ----------------------------------------------------
       Navigation & Tabs
    ---------------------------------------------------- */
    bindNavTabs() {
        document.querySelectorAll(".nav-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                document.querySelectorAll(".nav-tab-btn").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

                btn.classList.add("active");
                const pane = document.getElementById(targetTab);
                if (pane) pane.classList.add("active");

                // Re-render visualizers on tab change to ensure layout sizes are correct
                if (targetTab === "tab-simulator") {
                    setTimeout(() => {
                        this.sourceVisualizer.calculateLayout();
                        this.targetVisualizer.calculateLayout();
                    }, 50);
                }
            });
        });
    }

    /* ----------------------------------------------------
       Mode Switcher (Mealy <-> Moore)
    ---------------------------------------------------- */
    bindModeSwitcher() {
        const btnMealyToMoore = document.getElementById("mode-mealy-to-moore");
        const btnMooreToMealy = document.getElementById("mode-moore-to-mealy");

        btnMealyToMoore.addEventListener("click", () => {
            if (this.currentMode === "mealy_to_moore") return;
            this.setConversionMode("mealy_to_moore");
            this.loadPreset("seq101_mealy");
        });

        btnMooreToMealy.addEventListener("click", () => {
            if (this.currentMode === "moore_to_mealy") return;
            this.setConversionMode("moore_to_mealy");
            this.loadPreset("parity_moore");
        });
    }

    setConversionMode(mode) {
        this.currentMode = mode;
        const btnM2M = document.getElementById("mode-mealy-to-moore");
        const btnM2Mealy = document.getElementById("mode-moore-to-mealy");

        if (mode === "mealy_to_moore") {
            btnM2M.classList.add("active");
            btnM2Mealy.classList.remove("active");
            document.getElementById("source-type-label").innerText = "Mealy Machine";
            document.getElementById("target-type-label").innerText = "Moore Machine";
            this.sourceVisualizer.options.title = "Source Machine (Mealy)";
            this.targetVisualizer.options.title = "Converted Machine (Moore)";
            document.getElementById("mealy-specific-options").style.display = "block";
        } else {
            btnM2Mealy.classList.add("active");
            btnM2M.classList.remove("active");
            document.getElementById("source-type-label").innerText = "Moore Machine";
            document.getElementById("target-type-label").innerText = "Mealy Machine";
            this.sourceVisualizer.options.title = "Source Machine (Moore)";
            this.targetVisualizer.options.title = "Converted Machine (Mealy)";
            document.getElementById("mealy-specific-options").style.display = "none";
        }
        this.populatePresetsDropdown();
    }

    populatePresetsDropdown() {
        const select = document.getElementById("preset-select");
        select.innerHTML = '<option value="">-- Choose a Pre-Configured Automaton --</option>';

        for (const [key, preset] of Object.entries(AUTOMATA_PRESETS)) {
            const matchesMode = (this.currentMode === "mealy_to_moore" && preset.type === "Mealy") ||
                                (this.currentMode === "moore_to_mealy" && preset.type === "Moore");
            if (matchesMode) {
                const opt = document.createElement("option");
                opt.value = key;
                opt.textContent = `${preset.name} (${preset.category})`;
                select.appendChild(opt);
            }
        }
    }

    loadPreset(presetId) {
        const preset = AUTOMATA_PRESETS[presetId];
        if (!preset) return;

        document.getElementById("machine-name").value = preset.name;
        document.getElementById("states-input").value = preset.data.states.join(", ");
        document.getElementById("alphabet-input").value = preset.data.alphabet.join(", ");
        document.getElementById("output-alphabet-input").value = preset.data.outputAlphabet.join(", ");
        document.getElementById("initial-state-select").innerHTML = "";

        if (preset.type === "Mealy") {
            this.sourceMachine = new MealyMachine(
                preset.data.states,
                preset.data.alphabet,
                preset.data.outputAlphabet,
                preset.data.transitions,
                preset.data.outputs,
                preset.data.initialState,
                preset.name
            );
        } else {
            this.sourceMachine = new MooreMachine(
                preset.data.states,
                preset.data.alphabet,
                preset.data.outputAlphabet,
                preset.data.transitions,
                preset.data.stateOutputs,
                preset.data.initialState,
                preset.name
            );
        }

        // Set sample input string
        if (preset.sampleInputs && preset.sampleInputs.length > 0) {
            document.getElementById("sim-input-string").value = preset.sampleInputs[0];
            this.renderSampleInputPills(preset.sampleInputs);
        }

        this.renderEditorFromMachine(this.sourceMachine);
        this.runConversion();
    }

    renderSampleInputPills(samples) {
        const container = document.getElementById("sample-pills-container");
        if (!container) return;
        container.innerHTML = "";
        samples.forEach(str => {
            const pill = document.createElement("button");
            pill.className = "btn btn-outline btn-sm";
            pill.style.fontSize = "0.75rem";
            pill.style.padding = "0.2rem 0.5rem";
            pill.innerText = str;
            pill.addEventListener("click", () => {
                document.getElementById("sim-input-string").value = str;
                this.updateSimulationInput();
            });
            container.appendChild(pill);
        });
    }

    /* ----------------------------------------------------
       Matrix / Table Editor
    ---------------------------------------------------- */
    bindEditorEvents() {
        document.getElementById("preset-select").addEventListener("change", (e) => {
            if (e.target.value) this.loadPreset(e.target.value);
        });

        document.getElementById("btn-apply-definition").addEventListener("click", () => {
            this.parseAndBuildMatrix();
        });

        document.getElementById("btn-add-state").addEventListener("click", () => {
            const statesInput = document.getElementById("states-input");
            const existing = statesInput.value.split(",").map(s => s.trim()).filter(Boolean);
            const nextIdx = existing.length;
            const newName = `q${nextIdx}`;
            if (!existing.includes(newName)) {
                existing.push(newName);
                statesInput.value = existing.join(", ");
                this.parseAndBuildMatrix();
            }
        });

        document.getElementById("btn-convert-trigger").addEventListener("click", () => {
            this.buildMachineFromEditor();
            this.runConversion();
        });
    }

    renderEditorFromMachine(machine) {
        document.getElementById("states-input").value = machine.states.join(", ");
        document.getElementById("alphabet-input").value = machine.alphabet.join(", ");
        document.getElementById("output-alphabet-input").value = machine.outputAlphabet.join(", ");

        // Populate initial state select
        const initSelect = document.getElementById("initial-state-select");
        initSelect.innerHTML = "";
        machine.states.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s;
            if (s === machine.initialState) opt.selected = true;
            initSelect.appendChild(opt);
        });

        this.renderMatrixTable(machine);
    }

    parseAndBuildMatrix() {
        const states = document.getElementById("states-input").value.split(",").map(s => s.trim()).filter(Boolean);
        const alphabet = document.getElementById("alphabet-input").value.split(",").map(s => s.trim()).filter(Boolean);
        const outputAlphabet = document.getElementById("output-alphabet-input").value.split(",").map(s => s.trim()).filter(Boolean);

        if (states.length === 0 || alphabet.length === 0 || outputAlphabet.length === 0) {
            alert("Please specify at least one state, one input symbol, and one output symbol.");
            return;
        }

        const initSelect = document.getElementById("initial-state-select");
        const prevInit = initSelect.value;
        initSelect.innerHTML = "";
        states.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s;
            if (s === prevInit || (!prevInit && s === states[0])) opt.selected = true;
            initSelect.appendChild(opt);
        });

        const initialSelected = initSelect.value || states[0];

        // Create empty or preserved structure
        if (this.currentMode === "mealy_to_moore") {
            const transitions = {};
            const outputs = {};
            states.forEach(s => {
                transitions[s] = {};
                outputs[s] = {};
                alphabet.forEach(a => {
                    transitions[s][a] = this.sourceMachine?.transitions?.[s]?.[a] || states[0];
                    outputs[s][a] = this.sourceMachine?.outputs?.[s]?.[a] || outputAlphabet[0];
                });
            });
            this.sourceMachine = new MealyMachine(states, alphabet, outputAlphabet, transitions, outputs, initialSelected);
        } else {
            const transitions = {};
            const stateOutputs = {};
            states.forEach(s => {
                transitions[s] = {};
                stateOutputs[s] = this.sourceMachine?.stateOutputs?.[s] || outputAlphabet[0];
                alphabet.forEach(a => {
                    transitions[s][a] = this.sourceMachine?.transitions?.[s]?.[a] || states[0];
                });
            });
            this.sourceMachine = new MooreMachine(states, alphabet, outputAlphabet, transitions, stateOutputs, initialSelected);
        }

        this.renderMatrixTable(this.sourceMachine);
        this.runConversion();
    }

    renderMatrixTable(machine) {
        const wrapper = document.getElementById("matrix-table-container");
        wrapper.innerHTML = "";

        const table = document.createElement("table");
        table.className = "matrix-table";

        // Table Header
        const thead = document.createElement("thead");
        let headerRow = `<tr><th>State</th>`;
        if (machine.type === "Moore") {
            headerRow += `<th style="color: var(--color-clay-deep);">State Output (λ)</th>`;
        }
        for (const a of machine.alphabet) {
            headerRow += `<th>Input [${escapeHtml(a)}] Next${machine.type === "Mealy" ? " & Out" : ""}</th>`;
        }
        headerRow += `</tr>`;
        thead.innerHTML = headerRow;
        table.appendChild(thead);

        // Table Body
        const tbody = document.createElement("tbody");
        for (const s of machine.states) {
            const tr = document.createElement("tr");
            let rowHtml = `<td style="font-weight: 700; color: ${s === machine.initialState ? 'var(--color-clay-deep)' : 'var(--color-ink)'};">
                ${s === machine.initialState ? '→ ' : ''}${escapeHtml(s)}
            </td>`;

            if (machine.type === "Moore") {
                const currentOut = machine.stateOutputs[s] || machine.outputAlphabet[0];
                rowHtml += `<td>
                    <select class="matrix-cell-input moore-out-cell" data-state="${s}">
                        ${machine.outputAlphabet.map(o => `<option value="${o}" ${o === currentOut ? "selected" : ""}>${o}</option>`).join("")}
                    </select>
                </td>`;
            }

            for (const a of machine.alphabet) {
                const nextState = machine.transitions[s]?.[a] || machine.states[0];
                if (machine.type === "Mealy") {
                    const outSym = machine.outputs[s]?.[a] || machine.outputAlphabet[0];
                    rowHtml += `<td>
                        <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                            <select class="matrix-cell-input mealy-dest-cell" data-from="${s}" data-sym="${a}">
                                ${machine.states.map(st => `<option value="${st}" ${st === nextState ? "selected" : ""}>${st}</option>`).join("")}
                            </select>
                            <span style="color: var(--color-hairline-dark);">/</span>
                            <select class="matrix-cell-input mealy-out-cell" data-from="${s}" data-sym="${a}" style="width: 55px; color: var(--color-clay-deep); font-weight: 600;">
                                ${machine.outputAlphabet.map(o => `<option value="${o}" ${o === outSym ? "selected" : ""}>${o}</option>`).join("")}
                            </select>
                        </div>
                    </td>`;
                } else {
                    rowHtml += `<td>
                        <select class="matrix-cell-input moore-dest-cell" data-from="${s}" data-sym="${a}">
                            ${machine.states.map(st => `<option value="${st}" ${st === nextState ? "selected" : ""}>${st}</option>`).join("")}
                        </select>
                    </td>`;
                }
            }

            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrapper.appendChild(table);

        // Bind change events inside matrix for instant updates
        table.querySelectorAll("select").forEach(sel => {
            sel.addEventListener("change", () => {
                this.buildMachineFromEditor();
                this.runConversion();
            });
        });
    }

    buildMachineFromEditor() {
        const states = document.getElementById("states-input").value.split(",").map(s => s.trim()).filter(Boolean);
        const alphabet = document.getElementById("alphabet-input").value.split(",").map(s => s.trim()).filter(Boolean);
        const outputAlphabet = document.getElementById("output-alphabet-input").value.split(",").map(s => s.trim()).filter(Boolean);
        const initialState = document.getElementById("initial-state-select").value;
        const name = document.getElementById("machine-name").value || "Custom Machine";

        if (this.currentMode === "mealy_to_moore") {
            const transitions = {};
            const outputs = {};
            states.forEach(s => {
                transitions[s] = {};
                outputs[s] = {};
            });

            document.querySelectorAll(".mealy-dest-cell").forEach(sel => {
                const from = sel.getAttribute("data-from");
                const sym = sel.getAttribute("data-sym");
                transitions[from][sym] = sel.value;
            });

            document.querySelectorAll(".mealy-out-cell").forEach(sel => {
                const from = sel.getAttribute("data-from");
                const sym = sel.getAttribute("data-sym");
                outputs[from][sym] = sel.value;
            });

            this.sourceMachine = new MealyMachine(states, alphabet, outputAlphabet, transitions, outputs, initialState, name);
        } else {
            const transitions = {};
            const stateOutputs = {};
            states.forEach(s => {
                transitions[s] = {};
            });

            document.querySelectorAll(".moore-dest-cell").forEach(sel => {
                const from = sel.getAttribute("data-from");
                const sym = sel.getAttribute("data-sym");
                transitions[from][sym] = sel.value;
            });

            document.querySelectorAll(".moore-out-cell").forEach(sel => {
                const s = sel.getAttribute("data-state");
                stateOutputs[s] = sel.value;
            });

            this.sourceMachine = new MooreMachine(states, alphabet, outputAlphabet, transitions, stateOutputs, initialState, name);
        }
    }

    /* ----------------------------------------------------
       Conversion & Visualization
    ---------------------------------------------------- */
    runConversion() {
        try {
            const pruneUnreachable = document.getElementById("check-prune-unreachable")?.checked ?? true;

            if (this.currentMode === "mealy_to_moore") {
                this.conversionResult = AutomataConverter.mealyToMoore(this.sourceMachine, {
                    pruneUnreachable: pruneUnreachable
                });
                this.targetMachine = this.conversionResult.convertedMachine;
            } else {
                this.conversionResult = AutomataConverter.mooreToMealy(this.sourceMachine);
                this.targetMachine = this.conversionResult.convertedMachine;
            }

            // Update Graph Visualizers
            this.sourceVisualizer.setMachine(this.sourceMachine);
            this.targetVisualizer.setMachine(this.targetMachine);

            // Update Stepper
            this.currentStepIndex = 0;
            this.renderStepperUI();

            // Update Simulation Engine
            this.simulationEngine.setMachines(this.sourceMachine, this.targetMachine);
            this.updateSimulationInput();

            // Run batch verification table
            this.runBatchTests();

        } catch (e) {
            console.error("Conversion error:", e);
            alert("Conversion Error: " + e.message);
        }
    }

    /* ----------------------------------------------------
       Conversion Stepper UI
    ---------------------------------------------------- */
    bindStepperEvents() {
        document.getElementById("btn-step-first").addEventListener("click", () => this.goToStep(0));
        document.getElementById("btn-step-prev").addEventListener("click", () => this.goToStep(this.currentStepIndex - 1));
        document.getElementById("btn-step-next").addEventListener("click", () => this.goToStep(this.currentStepIndex + 1));
        document.getElementById("btn-step-last").addEventListener("click", () => {
            if (this.conversionResult) this.goToStep(this.conversionResult.steps.length - 1);
        });
    }

    goToStep(index) {
        if (!this.conversionResult) return;
        const total = this.conversionResult.steps.length;
        this.currentStepIndex = Math.max(0, Math.min(total - 1, index));
        this.renderStepperUI();
    }

    renderStepperUI() {
        if (!this.conversionResult) return;

        const steps = this.conversionResult.steps;
        const currentStep = steps[this.currentStepIndex];
        const total = steps.length;

        // Render Step Dots
        const dotsContainer = document.getElementById("stepper-dots-container");
        dotsContainer.innerHTML = "";
        steps.forEach((st, idx) => {
            const dot = document.createElement("div");
            dot.className = `step-dot ${idx === this.currentStepIndex ? "active" : ""} ${idx < this.currentStepIndex ? "completed" : ""}`;
            dot.innerText = idx + 1;
            dot.title = st.title;
            dot.addEventListener("click", () => this.goToStep(idx));
            dotsContainer.appendChild(dot);
        });

        // Step Header & Explanation
        document.getElementById("step-title-text").innerText = `Step ${currentStep.stepNumber} of ${total}: ${currentStep.title}`;
        document.getElementById("step-explanation-text").innerText = currentStep.explanation;

        // Step Content Details Table / View
        const detailsContainer = document.getElementById("step-details-container");
        detailsContainer.innerHTML = this.buildStepDetailMarkup(currentStep);
    }

    buildStepDetailMarkup(step) {
        if (step.type === "incoming_analysis") {
            const map = step.details.incomingOutputs;
            let rows = "";
            for (const [st, outs] of Object.entries(map)) {
                rows += `<tr>
                    <td style="font-weight: 700; color: var(--color-ink);">${escapeHtml(st)}</td>
                    <td>${outs.length > 0 ? outs.map(o => `<span class="badge-pass">${o}</span>`).join(" ") : '<span style="color:var(--color-text-muted);">(No incoming transitions)</span>'}</td>
                    <td style="color: var(--color-ink-soft);">${outs.length === 0 ? "Default initial / unreachable" : (outs.length === 1 ? "1 (Single Moore state)" : `${outs.length} (Splits into ${outs.length} states!)`)}</td>
                </tr>`;
            }
            return `
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr><th>State (q)</th><th>Incoming Output Set Out(q)</th><th>Splitting Status</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        if (step.type === "state_splitting") {
            const splits = step.details.splitTable;
            let rows = "";
            splits.forEach(s => {
                rows += `<tr>
                    <td style="font-weight: 700; color: var(--color-ink);">${s.isInitial ? "→ " : ""}${escapeHtml(s.originalState)}</td>
                    <td style="color: var(--color-ink-soft);">${escapeHtml(s.incomingOutputs)}</td>
                    <td>${s.generatedStates.map(ns => `<code style="color: var(--color-clay-deep);">${ns}</code>`).join(", ")}</td>
                </tr>`;
            });
            return `
                <div class="math-banner">
                    Initial Moore State: <strong style="color: var(--color-clay-deep);">${step.details.initialMooreState}</strong> &nbsp;|&nbsp;
                    Total Moore States: <strong style="color: var(--color-ink);">${step.details.totalMooreStates}</strong>
                </div>
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr><th>Original Mealy State</th><th>Incoming Outputs</th><th>Generated Moore States (q_output)</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        if (step.type === "transition_construction") {
            const logs = step.details.logs.slice(0, 12);
            let rows = "";
            logs.forEach(l => {
                rows += `<tr>
                    <td><code>${escapeHtml(l.fromState)}</code></td>
                    <td style="color: var(--color-clay-deep); font-weight: 700;">${escapeHtml(l.input)}</td>
                    <td style="color: var(--color-ink-soft); font-size: 0.8rem;">${escapeHtml(l.underlyingTransition)}</td>
                    <td style="color: var(--color-ink); font-weight: 700;"><code>${escapeHtml(l.targetState)}</code></td>
                    <td><span class="badge-pass">${escapeHtml(l.stateOutput)}</span></td>
                </tr>`;
            });
            return `
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr><th>Moore State (q_b)</th><th>Input (a)</th><th>Rule Applied</th><th>Next Moore State</th><th>Target State Output</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${step.details.logs.length > 12 ? `<p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px;">(Showing 12 of ${step.details.logs.length} transitions)</p>` : ''}
            `;
        }

        if (step.type === "reachability") {
            const r = step.details.reachable.map(s => `<code style="color: var(--color-clay-deep);">${s}</code>`).join(", ");
            const u = step.details.unreachable.length > 0
                ? step.details.unreachable.map(s => `<code style="color: var(--color-text-muted); text-decoration: line-through;">${s}</code>`).join(", ")
                : '<span style="color: var(--color-text-muted);">(None - all states reachable)</span>';
            return `
                <div class="math-banner">
                    Reachable States: ${r}<br/>
                    Unreachable States: ${u}
                </div>
                <p style="font-size: 0.85rem; color: var(--color-ink-soft);">
                    ${step.details.pruned ? "Unreachable states have been automatically pruned from the final machine to ensure minimal representation." : "All states retained."}
                </p>
            `;
        }

        if (step.type === "output_assignment") {
            const map = step.details.mappingTable;
            let rows = "";
            map.forEach(m => {
                rows += `<tr>
                    <td><code>${escapeHtml(m.fromState)}</code></td>
                    <td style="color: var(--color-clay-deep); font-weight: 700;">${escapeHtml(m.symbol)}</td>
                    <td><code>${escapeHtml(m.toState)}</code></td>
                    <td><span class="badge-pass">${escapeHtml(m.targetStateOutput)}</span></td>
                    <td style="color: var(--color-ink); font-weight: 700;">${escapeHtml(m.mealyAssignedOutput)}</td>
                </tr>`;
            });
            return `
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr><th>Source State (q)</th><th>Input (a)</th><th>Target State (q')</th><th>Target Moore Output λ_M(q')</th><th>Assigned Mealy Output λ(q, a)</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        return `
            <div class="math-banner">
                Conversion Step complete. Machine 6-tuple successfully generated.
            </div>
        `;
    }

    /* ----------------------------------------------------
       Interactive String Simulator
    ---------------------------------------------------- */
    bindSimulationControls() {
        const inputField = document.getElementById("sim-input-string");
        inputField.addEventListener("input", () => this.updateSimulationInput());

        const playBtn = document.getElementById("sim-play-btn");
        playBtn.addEventListener("click", () => {
            if (this.simulationEngine.isPlaying) {
                this.simulationEngine.pause();
                playBtn.innerHTML = "&#9654; Run";
            } else {
                this.simulationEngine.play();
                playBtn.innerHTML = "&#10074;&#10074; Pause";
            }
        });

        document.getElementById("sim-step-forward-btn").addEventListener("click", () => {
            this.simulationEngine.pause();
            this.simulationEngine.stepForward();
            playBtn.innerHTML = "&#9654; Run";
        });

        document.getElementById("sim-step-back-btn").addEventListener("click", () => {
            this.simulationEngine.pause();
            this.simulationEngine.stepBackward();
            playBtn.innerHTML = "&#9654; Run";
        });

        document.getElementById("sim-reset-btn").addEventListener("click", () => {
            this.simulationEngine.reset();
            playBtn.innerHTML = "&#9654; Run";
        });

        const speedSlider = document.getElementById("sim-speed-slider");
        const speedValue = document.getElementById("sim-speed-value");
        speedSlider.addEventListener("input", (e) => {
            const ms = parseInt(e.target.value, 10);
            speedValue.innerText = `${(ms / 1000).toFixed(1)}s`;
            this.simulationEngine.setSpeed(ms);
        });
    }

    updateSimulationInput() {
        const inputVal = document.getElementById("sim-input-string").value;
        this.simulationEngine.setInput(inputVal);
    }

    renderSimulationState(status) {
        // Render Input Tape
        const inputTape = document.getElementById("tape-input-cells");
        inputTape.innerHTML = "";
        status.inputChars.forEach((ch, idx) => {
            const cell = document.createElement("div");
            const isCur = (idx === status.currentStep - 1);
            const isPast = (idx < status.currentStep - 1);
            cell.className = `tape-cell ${isCur ? "current" : ""} ${isPast ? "processed" : ""}`;
            cell.innerText = ch;
            inputTape.appendChild(cell);
        });
        if (status.inputChars.length === 0) {
            inputTape.innerHTML = '<span style="color:var(--color-text-muted); font-size:0.825rem; padding: 6px;">ε (Empty String)</span>';
        }

        // Render Mealy & Moore Tapes
        const mealyTape = document.getElementById("tape-mealy-cells");
        const mooreTape = document.getElementById("tape-moore-cells");
        mealyTape.innerHTML = "";
        mooreTape.innerHTML = "";

        const mealyChars = (this.sourceMachine.type === "Mealy" ? status.sourceOutSoFar : status.targetOutSoFar).split("");
        const mooreChars = (this.sourceMachine.type === "Moore" ? status.sourceOutSoFar : status.targetOutSoFar).split("");

        mealyChars.forEach((ch, idx) => {
            const cell = document.createElement("div");
            cell.className = `tape-cell processed`;
            cell.innerText = ch;
            mealyTape.appendChild(cell);
        });
        if (mealyChars.length === 0) {
            mealyTape.innerHTML = '<span style="color:var(--color-text-muted); font-size:0.825rem; padding: 6px;">(No output yet)</span>';
        }

        mooreChars.forEach((ch, idx) => {
            const cell = document.createElement("div");
            cell.className = `tape-cell ${idx === 0 ? "initial-moore" : "processed"}`;
            cell.innerText = ch;
            if (idx === 0) cell.title = "Moore Start State Output λ(q0)";
            mooreTape.appendChild(cell);
        });
        if (mooreChars.length === 0) {
            mooreTape.innerHTML = '<span style="color:var(--color-text-muted); font-size:0.825rem; padding: 6px;">(No output yet)</span>';
        }

        // Equivalence Proof Check
        const eqBanner = document.getElementById("sim-equivalence-banner");
        const mooreReaction = mooreChars.slice(1).join("");
        const mealyStr = mealyChars.join("");

        const isMatch = (mooreReaction === mealyStr);
        if (isMatch) {
            eqBanner.className = "equivalence-banner";
            eqBanner.innerHTML = `
                <div>
                    <span style="font-weight: 700; color: var(--color-sage-ink);">&#10004; EQUIVALENCE VERIFIED</span>
                    <span style="font-size: 0.85rem; color: var(--color-ink-soft); margin-left: 8px;">
                        Moore Reaction Output [<code>${escapeHtml(mooreReaction) || "ε"}</code>] matches Mealy Output [<code>${escapeHtml(mealyStr) || "ε"}</code>]
                    </span>
                </div>
                <span class="badge-pass">PASS</span>
            `;
        } else {
            eqBanner.className = "equivalence-banner fail";
            eqBanner.innerHTML = `
                <div>
                    <span style="font-weight: 700; color: var(--color-clay-deep);">&#10008; MISMATCH DETECTED</span>
                </div>
                <span class="badge-fail">FAIL</span>
            `;
        }

        // Update Step Counter Text
        document.getElementById("sim-step-status-text").innerText = `Step ${status.currentStep} of ${status.totalSteps}`;
    }

    /* ----------------------------------------------------
       Batch Testing
    ---------------------------------------------------- */
    bindBatchTesting() {
        document.getElementById("btn-run-batch-tests").addEventListener("click", () => {
            this.runBatchTests();
        });
    }

    runBatchTests() {
        const inputArea = document.getElementById("batch-test-inputs");
        const customInputs = inputArea.value.split("\n").map(s => s.trim()).filter(s => s.length > 0 || s === "");

        const testStrings = customInputs.length > 0 ? customInputs : ["", "0", "1", "00", "01", "10", "11", "101", "10101", "111000"];

        const mealy = this.sourceMachine.type === "Mealy" ? this.sourceMachine : this.targetMachine;
        const moore = this.sourceMachine.type === "Moore" ? this.sourceMachine : this.targetMachine;

        const report = AutomataConverter.verifyEquivalence(mealy, moore, testStrings);

        const tbody = document.getElementById("batch-results-tbody");
        tbody.innerHTML = "";

        report.results.forEach((r, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><code>${escapeHtml(r.input)}</code></td>
                <td>${r.length}</td>
                <td style="color: var(--color-ink); font-weight: 600;"><code>${escapeHtml(r.mealyOutput)}</code></td>
                <td>
                    <span style="color: var(--color-clay-deep); font-weight: 700;">${escapeHtml(r.mooreInitialSymbol)}</span>
                    <span style="color: var(--color-ink);">${escapeHtml(r.mooreReaction)}</span>
                </td>
                <td>
                    <span class="${r.isEquivalent ? 'badge-pass' : 'badge-fail'}">
                        ${r.isEquivalent ? 'PASS' : 'FAIL'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Summary
        document.getElementById("batch-summary-text").innerHTML = `
            Passed <strong style="color: var(--color-clay-deep);">${report.passed}</strong> of <strong>${report.total}</strong> test cases
            (${((report.passed / report.total) * 100).toFixed(0)}% Equivalence Accuracy).
        `;
    }

    /* ----------------------------------------------------
       JSON Export & Import
    ---------------------------------------------------- */
    bindExportImport() {
        document.getElementById("btn-export-json").addEventListener("click", () => {
            const data = {
                version: "1.0",
                sourceMachine: {
                    type: this.sourceMachine.type,
                    name: this.sourceMachine.name,
                    states: this.sourceMachine.states,
                    alphabet: this.sourceMachine.alphabet,
                    outputAlphabet: this.sourceMachine.outputAlphabet,
                    initialState: this.sourceMachine.initialState,
                    transitions: this.sourceMachine.transitions,
                    outputs: this.sourceMachine.type === "Mealy" ? this.sourceMachine.outputs : undefined,
                    stateOutputs: this.sourceMachine.type === "Moore" ? this.sourceMachine.stateOutputs : undefined
                },
                targetMachine: {
                    type: this.targetMachine.type,
                    name: this.targetMachine.name,
                    states: this.targetMachine.states,
                    alphabet: this.targetMachine.alphabet,
                    outputAlphabet: this.targetMachine.outputAlphabet,
                    initialState: this.targetMachine.initialState,
                    transitions: this.targetMachine.transitions,
                    outputs: this.targetMachine.type === "Mealy" ? this.targetMachine.outputs : undefined,
                    stateOutputs: this.targetMachine.type === "Moore" ? this.targetMachine.stateOutputs : undefined
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${this.sourceMachine.name.toLowerCase().replace(/\s+/g, '_')}_conversion.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        const importInput = document.getElementById("import-json-file");
        document.getElementById("btn-import-json").addEventListener("click", () => {
            importInput.click();
        });

        importInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    const sm = parsed.sourceMachine || parsed;
                    if (sm.type === "Mealy") {
                        this.setConversionMode("mealy_to_moore");
                        this.sourceMachine = new MealyMachine(sm.states, sm.alphabet, sm.outputAlphabet, sm.transitions, sm.outputs, sm.initialState, sm.name);
                    } else {
                        this.setConversionMode("moore_to_mealy");
                        this.sourceMachine = new MooreMachine(sm.states, sm.alphabet, sm.outputAlphabet, sm.transitions, sm.stateOutputs, sm.initialState, sm.name);
                    }
                    this.renderEditorFromMachine(this.sourceMachine);
                    this.runConversion();
                    alert("Automaton successfully loaded from JSON!");
                } catch (err) {
                    alert("Failed to parse JSON file: " + err.message);
                }
            };
            reader.readAsText(file);
        });
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    window.app = new AutomataApp();
});

