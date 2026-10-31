/**
 * mealy_moore_core.js
 * Formal Bidirectional Conversion Engine between Mealy and Moore Machines.
 * Provides complete step-by-step conversion traces, state-splitting, reachability,
 * and string simulation with equivalence proofs.
 */

class MealyMachine {
    constructor(states, alphabet, outputAlphabet, transitions, outputs, initialState, name = "Mealy Machine") {
        this.type = "Mealy";
        this.states = [...states];
        this.alphabet = [...alphabet];
        this.outputAlphabet = [...outputAlphabet];
        this.transitions = {}; // transitions[state][symbol] = nextState
        this.outputs = {};     // outputs[state][symbol] = outputSymbol
        this.initialState = initialState;
        this.name = name;

        for (const s of states) {
            this.transitions[s] = { ...(transitions[s] || {}) };
            this.outputs[s] = { ...(outputs[s] || {}) };
        }
    }

    validate() {
        if (!this.states.includes(this.initialState)) {
            return { valid: false, error: `Initial state "${this.initialState}" not in states.` };
        }
        for (const s of this.states) {
            for (const a of this.alphabet) {
                const dest = this.transitions[s]?.[a];
                const out = this.outputs[s]?.[a];
                if (dest === undefined || dest === null || dest === "") {
                    return { valid: false, error: `Missing transition from state "${s}" on input "${a}".` };
                }
                if (!this.states.includes(dest)) {
                    return { valid: false, error: `Target state "${dest}" from state "${s}" on input "${a}" does not exist.` };
                }
                if (out === undefined || out === null || out === "") {
                    return { valid: false, error: `Missing output from state "${s}" on input "${a}".` };
                }
                if (!this.outputAlphabet.includes(out)) {
                    return { valid: false, error: `Output "${out}" from state "${s}" on "${a}" not in output alphabet.` };
                }
            }
        }
        return { valid: true };
    }

    run(inputString) {
        let currentState = this.initialState;
        const outputSymbols = [];
        const trace = [];

        for (let i = 0; i < inputString.length; i++) {
            const sym = inputString[i];
            if (!this.alphabet.includes(sym)) {
                throw new Error(`Symbol '${sym}' at position ${i} not in input alphabet [${this.alphabet.join(", ")}].`);
            }
            const nextState = this.transitions[currentState][sym];
            const outSym = this.outputs[currentState][sym];
            trace.push({
                stepIndex: i + 1,
                fromState: currentState,
                symbol: sym,
                toState: nextState,
                output: outSym
            });
            outputSymbols.push(outSym);
            currentState = nextState;
        }

        return {
            outputString: outputSymbols.join(""),
            trace: trace,
            finalState: currentState
        };
    }

    clone() {
        return new MealyMachine(
            [...this.states],
            [...this.alphabet],
            [...this.outputAlphabet],
            JSON.parse(JSON.stringify(this.transitions)),
            JSON.parse(JSON.stringify(this.outputs)),
            this.initialState,
            this.name
        );
    }
}

class MooreMachine {
    constructor(states, alphabet, outputAlphabet, transitions, stateOutputs, initialState, name = "Moore Machine") {
        this.type = "Moore";
        this.states = [...states];
        this.alphabet = [...alphabet];
        this.outputAlphabet = [...outputAlphabet];
        this.transitions = {}; // transitions[state][symbol] = nextState
        this.stateOutputs = { ...stateOutputs }; // stateOutputs[state] = outputSymbol
        this.initialState = initialState;
        this.name = name;

        for (const s of states) {
            this.transitions[s] = { ...(transitions[s] || {}) };
        }
    }

    validate() {
        if (!this.states.includes(this.initialState)) {
            return { valid: false, error: `Initial state "${this.initialState}" not in states.` };
        }
        for (const s of this.states) {
            const out = this.stateOutputs[s];
            if (out === undefined || out === null || out === "") {
                return { valid: false, error: `State "${s}" is missing a designated output.` };
            }
            if (!this.outputAlphabet.includes(out)) {
                return { valid: false, error: `Output "${out}" for state "${s}" not in output alphabet.` };
            }
            for (const a of this.alphabet) {
                const dest = this.transitions[s]?.[a];
                if (dest === undefined || dest === null || dest === "") {
                    return { valid: false, error: `Missing transition from state "${s}" on input "${a}".` };
                }
                if (!this.states.includes(dest)) {
                    return { valid: false, error: `Target state "${dest}" from state "${s}" on input "${a}" does not exist.` };
                }
            }
        }
        return { valid: true };
    }

    run(inputString) {
        let currentState = this.initialState;
        const initialOut = this.stateOutputs[currentState];
        const outputSymbols = [initialOut];
        const trace = [
            {
                stepIndex: 0,
                fromState: null,
                symbol: null,
                toState: currentState,
                output: initialOut,
                note: "Start state output (emitted before any input)"
            }
        ];

        for (let i = 0; i < inputString.length; i++) {
            const sym = inputString[i];
            if (!this.alphabet.includes(sym)) {
                throw new Error(`Symbol '${sym}' at position ${i} not in input alphabet [${this.alphabet.join(", ")}].`);
            }
            const nextState = this.transitions[currentState][sym];
            const outSym = this.stateOutputs[nextState];
            trace.push({
                stepIndex: i + 1,
                fromState: currentState,
                symbol: sym,
                toState: nextState,
                output: outSym
            });
            outputSymbols.push(outSym);
            currentState = nextState;
        }

        return {
            outputString: outputSymbols.join(""),
            initialOutput: initialOut,
            reactionOutput: outputSymbols.slice(1).join(""),
            trace: trace,
            finalState: currentState
        };
    }

    clone() {
        return new MooreMachine(
            [...this.states],
            [...this.alphabet],
            [...this.outputAlphabet],
            JSON.parse(JSON.stringify(this.transitions)),
            { ...this.stateOutputs },
            this.initialState,
            this.name
        );
    }
}

/**
 * Bidirectional Conversion Algorithms
 */
const AutomataConverter = {
    /**
     * Converts Mealy to Moore Machine
     */
    mealyToMoore(mealy, options = { defaultInitialOutput: null, pruneUnreachable: true }) {
        const val = mealy.validate();
        if (!val.valid) throw new Error(val.error);

        const steps = [];

        // 1. Analyze Incoming Transitions
        const incomingOutputs = {};
        const incomingDetails = {};
        for (const s of mealy.states) {
            incomingOutputs[s] = new Set();
            incomingDetails[s] = [];
        }

        for (const s of mealy.states) {
            for (const a of mealy.alphabet) {
                const dest = mealy.transitions[s][a];
                const out = mealy.outputs[s][a];
                incomingOutputs[dest].add(out);
                incomingDetails[dest].push({ from: s, symbol: a, output: out });
            }
        }

        steps.push({
            stepNumber: 1,
            title: "Analyze Incoming Transitions and Output Associations",
            explanation: "In a Mealy machine, output is tied to transitions. In a Moore machine, output is tied to states. We analyze all transitions entering each state to determine which output symbols arrive at that state.",
            type: "incoming_analysis",
            details: {
                incomingOutputs: Object.fromEntries(
                    Object.entries(incomingOutputs).map(([k, v]) => [k, Array.from(v).sort()])
                ),
                incomingDetails: incomingDetails
            }
        });

        // Determine default initial state output
        let initialMooreOut = options.defaultInitialOutput;
        if (!initialMooreOut) {
            if (incomingOutputs[mealy.initialState].size > 0) {
                initialMooreOut = Array.from(incomingOutputs[mealy.initialState]).sort()[0];
            } else {
                initialMooreOut = mealy.outputAlphabet[0] || "0";
            }
        }

        // 2. State Splitting
        const stateSplits = {};
        const mooreStateOutputs = {};
        const newToOriginal = {};
        const splitTable = [];

        for (const s of mealy.states) {
            let outs = new Set(incomingOutputs[s]);
            if (s === mealy.initialState) {
                outs.add(initialMooreOut);
            }
            if (outs.size === 0) {
                outs.add(mealy.outputAlphabet[0] || "0");
            }

            const sortedOuts = Array.from(outs).sort();
            stateSplits[s] = [];

            for (const out of sortedOuts) {
                const newStateName = `${s}_${out}`;
                stateSplits[s].push(newStateName);
                mooreStateOutputs[newStateName] = out;
                newToOriginal[newStateName] = { originalState: s, output: out };
            }

            splitTable.push({
                originalState: s,
                incomingCount: incomingOutputs[s].size,
                incomingOutputs: Array.from(incomingOutputs[s]).sort().join(", ") || "(none)",
                generatedStates: stateSplits[s],
                isInitial: s === mealy.initialState
            });
        }

        const initialMooreState = `${mealy.initialState}_${initialMooreOut}`;

        steps.push({
            stepNumber: 2,
            title: "Split States into Moore Output-Associated States",
            explanation: `For every state q and every distinct incoming output b, we create a new Moore state q_b with fixed output b. The start state '${mealy.initialState}' maps to '${initialMooreState}' with designated initial output '${initialMooreOut}'.`,
            type: "state_splitting",
            details: {
                splitTable: splitTable,
                initialMooreState: initialMooreState,
                initialMooreOutput: initialMooreOut,
                totalMooreStates: Object.keys(mooreStateOutputs).length
            }
        });

        // 3. Construct Moore Transitions
        const allMooreStates = Object.keys(mooreStateOutputs);
        const mooreTransitions = {};
        const transitionLogs = [];

        for (const newS of allMooreStates) {
            mooreTransitions[newS] = {};
            const origS = newToOriginal[newS].originalState;

            for (const a of mealy.alphabet) {
                const nextOrig = mealy.transitions[origS][a];
                const nextOut = mealy.outputs[origS][a];
                const targetMooreState = `${nextOrig}_${nextOut}`;
                mooreTransitions[newS][a] = targetMooreState;

                transitionLogs.push({
                    fromState: newS,
                    input: a,
                    underlyingTransition: `δ(${origS}, ${a}) = ${nextOrig}, λ(${origS}, ${a}) = ${nextOut}`,
                    targetState: targetMooreState,
                    stateOutput: nextOut
                });
            }
        }

        steps.push({
            stepNumber: 3,
            title: "Construct Moore Transition Table",
            explanation: "For each split Moore state (q, b) and input a, the next state is given by (δ_Mealy(q, a), λ_Mealy(q, a)). Notice that transitions depend exclusively on the underlying Mealy state q and symbol a.",
            type: "transition_construction",
            details: {
                transitions: mooreTransitions,
                logs: transitionLogs
            }
        });

        // 4. Reachability Analysis
        const reachable = new Set();
        const queue = [initialMooreState];
        reachable.add(initialMooreState);

        while (queue.length > 0) {
            const curr = queue.shift();
            for (const a of mealy.alphabet) {
                const target = mooreTransitions[curr]?.[a];
                if (target && !reachable.has(target)) {
                    reachable.add(target);
                    queue.push(target);
                }
            }
        }

        const unreachable = allMooreStates.filter(s => !reachable.has(s));
        const prune = options.pruneUnreachable && unreachable.length > 0;

        steps.push({
            stepNumber: 4,
            title: "Reachability & State Minimization Check",
            explanation: `Starting from initial Moore state '${initialMooreState}', we trace all reachable states via BFS. ${reachable.size} states are reachable, and ${unreachable.length} are unreachable.`,
            type: "reachability",
            details: {
                reachable: Array.from(reachable).sort(),
                unreachable: unreachable.sort(),
                pruned: prune
            }
        });

        const finalStates = prune ? Array.from(reachable).sort() : allMooreStates.sort();
        const finalTransitions = {};
        const finalOutputs = {};

        for (const s of finalStates) {
            finalTransitions[s] = {};
            finalOutputs[s] = mooreStateOutputs[s];
            for (const a of mealy.alphabet) {
                if (mooreTransitions[s]?.[a]) {
                    finalTransitions[s][a] = mooreTransitions[s][a];
                }
            }
        }

        const finalMoore = new MooreMachine(
            finalStates,
            mealy.alphabet,
            mealy.outputAlphabet,
            finalTransitions,
            finalOutputs,
            initialMooreState,
            `Equivalent Moore Machine (${mealy.name})`
        );

        steps.push({
            stepNumber: 5,
            title: "Final Moore Machine Synthesis & Equivalence Verification",
            explanation: "Conversion successfully synthesized. The resulting Moore machine is equivalent to the original Mealy machine under the relation: Moore_output(w) = λ_0 · Mealy_output(w).",
            type: "final_synthesis",
            details: {
                machine: finalMoore
            }
        });

        return {
            convertedMachine: finalMoore,
            steps: steps
        };
    },

    /**
     * Converts Moore to Mealy Machine
     */
    mooreToMealy(moore) {
        const val = moore.validate();
        if (!val.valid) throw new Error(val.error);

        const steps = [];

        // 1. Inspect Moore states and outputs
        const stateOverview = moore.states.map(s => ({
            state: s,
            output: moore.stateOutputs[s],
            isInitial: s === moore.initialState
        }));

        steps.push({
            stepNumber: 1,
            title: "Inspect Moore Machine Formal Structure",
            explanation: "Moore to Mealy conversion preserves the exact state set Q, input alphabet Σ, output alphabet Δ, and initial state q0. In Moore machines, outputs are placed on states.",
            type: "inspection",
            details: {
                states: stateOverview,
                alphabet: moore.alphabet,
                outputAlphabet: moore.outputAlphabet
            }
        });

        // 2. Map Moore state output to incoming transitions
        const mealyTransitions = {};
        const mealyOutputs = {};
        const mappingTable = [];

        for (const s of moore.states) {
            mealyTransitions[s] = {};
            mealyOutputs[s] = {};

            for (const a of moore.alphabet) {
                const dest = moore.transitions[s][a];
                const destOutput = moore.stateOutputs[dest];

                mealyTransitions[s][a] = dest;
                mealyOutputs[s][a] = destOutput;

                mappingTable.push({
                    fromState: s,
                    symbol: a,
                    toState: dest,
                    targetStateOutput: destOutput,
                    mealyAssignedOutput: destOutput,
                    explanation: `δ_Mealy(${s}, ${a}) = ${dest}, λ_Mealy(${s}, ${a}) = λ_Moore(${dest}) = ${destOutput}`
                });
            }
        }

        steps.push({
            stepNumber: 2,
            title: "Assign Transition Outputs via Target State Moore Outputs",
            explanation: "For every transition (q, a) leading to state q' = δ(q, a), the Mealy output is assigned as the output of that target state: λ_Mealy(q, a) = λ_Moore(q').",
            type: "output_assignment",
            details: {
                mappingTable: mappingTable
            }
        });

        const mealyMachine = new MealyMachine(
            [...moore.states],
            [...moore.alphabet],
            [...moore.outputAlphabet],
            mealyTransitions,
            mealyOutputs,
            moore.initialState,
            `Equivalent Mealy Machine (${moore.name})`
        );

        steps.push({
            stepNumber: 3,
            title: "Synthesize Equivalent Mealy Machine",
            explanation: "Mealy machine 6-tuple successfully generated. Output behavior is preserved for all non-empty inputs w, where Mealy_output(w) equals the response portion of Moore_output(w).",
            type: "final_synthesis",
            details: {
                machine: mealyMachine
            }
        });

        return {
            convertedMachine: mealyMachine,
            steps: steps
        };
    },

    /**
     * Verifies equivalence on test strings
     */
    verifyEquivalence(mealy, moore, testStrings) {
        const results = [];
        let allPassed = true;

        for (const w of testStrings) {
            try {
                const mealyRes = mealy.run(w);
                const mooreRes = moore.run(w);

                // Check equivalence
                const mooreShifted = mooreRes.outputString.slice(1);
                const isEquivalent = (mooreShifted === mealyRes.outputString);

                if (!isEquivalent) allPassed = false;

                results.push({
                    input: w === "" ? "ε (empty string)" : w,
                    rawInput: w,
                    length: w.length,
                    mealyOutput: mealyRes.outputString || "ε",
                    mooreOutput: mooreRes.outputString,
                    mooreInitialSymbol: mooreRes.initialOutput,
                    mooreReaction: mooreShifted || "ε",
                    isEquivalent: isEquivalent,
                    mealyTrace: mealyRes.trace,
                    mooreTrace: mooreRes.trace
                });
            } catch (err) {
                allPassed = false;
                results.push({
                    input: w,
                    rawInput: w,
                    error: err.message,
                    isEquivalent: false
                });
            }
        }

        return {
            allPassed: allPassed,
            total: testStrings.length,
            passed: results.filter(r => r.isEquivalent).length,
            results: results
        };
    }
};

// Export for browser window or Node/module environments
if (typeof module !== "undefined" && module.exports) {
    module.exports = { MealyMachine, MooreMachine, AutomataConverter };
} else {
    window.MealyMachine = MealyMachine;
    window.MooreMachine = MooreMachine;
    window.AutomataConverter = AutomataConverter;
}

