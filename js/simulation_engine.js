/**
 * simulation_engine.js
 * Synchronized Interactive String Simulator for Mealy and Moore Machines.
 * Provides play, pause, step-forward, step-back, speed control, tape rendering,
 * and synchronized graph animation.
 */

class SimulationEngine {
    constructor(options = {}) {
        this.sourceMachine = null;
        this.targetMachine = null;
        this.sourceVisualizer = options.sourceVisualizer || null;
        this.targetVisualizer = options.targetVisualizer || null;

        this.inputString = "";
        this.currentStep = 0; // 0 is initial state, 1..N are transitions
        this.sourceTrace = [];
        this.targetTrace = [];
        this.isPlaying = false;
        this.timer = null;
        this.speedMs = options.speedMs || 800;

        // Callback hooks for UI updates
        this.onStepChange = options.onStepChange || (() => {});
        this.onSimulationEnd = options.onSimulationEnd || (() => {});
    }

    setMachines(sourceMachine, targetMachine) {
        this.pause();
        this.sourceMachine = sourceMachine;
        this.targetMachine = targetMachine;
        this.reset();
    }

    setInput(inputString) {
        this.pause();
        this.inputString = inputString.trim();
        this.computeFullTraces();
        this.reset();
    }

    computeFullTraces() {
        if (!this.sourceMachine || !this.targetMachine) {
            this.sourceTrace = [];
            this.targetTrace = [];
            return;
        }

        try {
            const sRes = this.sourceMachine.run(this.inputString);
            const tRes = this.targetMachine.run(this.inputString);
            this.sourceTrace = sRes.trace;
            this.targetTrace = tRes.trace;
            this.sourceFullOutput = sRes.outputString;
            this.targetFullOutput = tRes.outputString;
        } catch (e) {
            console.error("Simulation trace error:", e);
            this.sourceTrace = [];
            this.targetTrace = [];
        }
    }

    reset() {
        this.pause();
        this.currentStep = 0;
        this.updateVisualizers();
        this.notifyStepChange();
    }

    play() {
        if (this.isPlaying) return;
        if (this.currentStep >= this.inputString.length) {
            this.currentStep = 0;
        }
        this.isPlaying = true;
        this.scheduleNextTick();
        this.notifyStepChange();
    }

    pause() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.notifyStepChange();
    }

    setSpeed(ms) {
        this.speedMs = Math.max(100, Math.min(3000, ms));
        if (this.isPlaying) {
            clearTimeout(this.timer);
            this.scheduleNextTick();
        }
    }

    scheduleNextTick() {
        if (!this.isPlaying) return;
        this.timer = setTimeout(() => {
            if (!this.isPlaying) return;
            const hasMore = this.stepForward();
            if (hasMore) {
                this.scheduleNextTick();
            } else {
                this.pause();
                this.onSimulationEnd();
            }
        }, this.speedMs);
    }

    stepForward() {
        if (this.currentStep < this.inputString.length) {
            this.currentStep++;
            this.updateVisualizers();
            this.notifyStepChange();
            return this.currentStep < this.inputString.length;
        }
        return false;
    }

    stepBackward() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateVisualizers();
            this.notifyStepChange();
            return true;
        }
        return false;
    }

    jumpToStep(step) {
        this.pause();
        this.currentStep = Math.max(0, Math.min(this.inputString.length, step));
        this.updateVisualizers();
        this.notifyStepChange();
    }

    updateVisualizers() {
        if (!this.sourceMachine || !this.targetMachine) return;

        // At step 0: highlight initial states
        if (this.currentStep === 0) {
            if (this.sourceVisualizer) {
                this.sourceVisualizer.clearHighlights();
                this.sourceVisualizer.highlightState(this.sourceMachine.initialState);
            }
            if (this.targetVisualizer) {
                this.targetVisualizer.clearHighlights();
                this.targetVisualizer.highlightState(this.targetMachine.initialState);
            }
            return;
        }

        // Steps 1..N:
        // In Mealy, step i corresponds to sourceTrace[i - 1]
        // In Moore, step i corresponds to trace item with stepIndex = i
        const sStep = this.sourceMachine.type === "Mealy"
            ? this.sourceTrace[this.currentStep - 1]
            : this.sourceTrace[this.currentStep];

        const tStep = this.targetMachine.type === "Mealy"
            ? this.targetTrace[this.currentStep - 1]
            : this.targetTrace[this.currentStep];

        if (this.sourceVisualizer && sStep) {
            this.sourceVisualizer.highlightTransition(sStep.fromState, sStep.toState);
        }
        if (this.targetVisualizer && tStep) {
            this.targetVisualizer.highlightTransition(tStep.fromState, tStep.toState);
        }
    }

    getCurrentStatus() {
        const total = this.inputString.length;
        const currentInputChar = (this.currentStep > 0 && this.currentStep <= total)
            ? this.inputString[this.currentStep - 1]
            : null;

        // Current outputs emitted up to this step
        let sourceOutSoFar = "";
        let targetOutSoFar = "";

        if (this.sourceMachine) {
            if (this.sourceMachine.type === "Mealy") {
                sourceOutSoFar = this.sourceTrace.slice(0, this.currentStep).map(t => t.output).join("");
            } else {
                sourceOutSoFar = this.targetTrace.length > 0
                    ? this.sourceTrace.slice(0, this.currentStep + 1).map(t => t.output).join("")
                    : "";
            }
        }

        if (this.targetMachine) {
            if (this.targetMachine.type === "Mealy") {
                targetOutSoFar = this.targetTrace.slice(0, this.currentStep).map(t => t.output).join("");
            } else {
                targetOutSoFar = this.targetTrace.slice(0, this.currentStep + 1).map(t => t.output).join("");
            }
        }

        return {
            totalSteps: total,
            currentStep: this.currentStep,
            isPlaying: this.isPlaying,
            currentChar: currentInputChar,
            inputChars: this.inputString.split(""),
            sourceOutSoFar: sourceOutSoFar,
            targetOutSoFar: targetOutSoFar,
            sourceFullOutput: this.sourceFullOutput || "",
            targetFullOutput: this.targetFullOutput || "",
            isComplete: this.currentStep === total
        };
    }

    notifyStepChange() {
        this.onStepChange(this.getCurrentStatus());
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SimulationEngine };
} else {
    window.SimulationEngine = SimulationEngine;
}

