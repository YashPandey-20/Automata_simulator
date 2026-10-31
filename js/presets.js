/**
 * presets.js
 * Pre-configured classic and edge-case Automata for Mealy <-> Moore conversion.
 */

const AUTOMATA_PRESETS = {
    // Preset 1: Sequence Detector 101 (Mealy)
    seq101_mealy: {
        id: "seq101_mealy",
        name: "Sequence Detector '101' (Mealy)",
        category: "Mealy to Moore",
        description: "Detects the pattern '101' with overlapping support. Emits '1' exactly when the substring '101' is completed, otherwise '0'.",
        type: "Mealy",
        data: {
            states: ["q0", "q1", "q2"],
            alphabet: ["0", "1"],
            outputAlphabet: ["0", "1"],
            initialState: "q0",
            transitions: {
                "q0": { "0": "q0", "1": "q1" },
                "q1": { "0": "q2", "1": "q1" },
                "q2": { "0": "q0", "1": "q1" }
            },
            outputs: {
                "q0": { "0": "0", "1": "0" },
                "q1": { "0": "0", "1": "0" },
                "q2": { "0": "0", "1": "1" }
            }
        },
        sampleInputs: ["101", "10101", "00101101", "111000", "1010101"]
    },

    // Preset 2: 2's Complement Generator (Mealy)
    twos_complement_mealy: {
        id: "twos_complement_mealy",
        name: "2's Complement Generator (LSB to MSB, Mealy)",
        category: "Mealy to Moore",
        description: "Computes 2's complement of a binary number processed from Least Significant Bit (LSB) to MSB. Copies bits until the first '1' is encountered, then inverts all remaining bits.",
        type: "Mealy",
        data: {
            states: ["A", "B"],
            alphabet: ["0", "1"],
            outputAlphabet: ["0", "1"],
            initialState: "A",
            transitions: {
                "A": { "0": "A", "1": "B" },
                "B": { "0": "B", "1": "B" }
            },
            outputs: {
                "A": { "0": "0", "1": "1" },
                "B": { "0": "1", "1": "0" }
            }
        },
        sampleInputs: ["0010", "1010", "1100", "0001", "1111"]
    },

    // Preset 3: 1's Complement Generator (Mealy)
    ones_complement_mealy: {
        id: "ones_complement_mealy",
        name: "1's Complement Bit Inverter (Mealy)",
        category: "Mealy to Moore",
        description: "Single-state Mealy machine that flips every input bit: '0' becomes '1', and '1' becomes '0'.",
        type: "Mealy",
        data: {
            states: ["q0"],
            alphabet: ["0", "1"],
            outputAlphabet: ["0", "1"],
            initialState: "q0",
            transitions: {
                "q0": { "0": "q0", "1": "q0" }
            },
            outputs: {
                "q0": { "0": "1", "1": "0" }
            }
        },
        sampleInputs: ["1010", "110011", "0000", "1111"]
    },

    // Preset 4: Even/Odd Parity Bit Generator (Moore)
    parity_moore: {
        id: "parity_moore",
        name: "Parity Checker / Bit Generator (Moore)",
        category: "Moore to Mealy",
        description: "Maintains running parity of input bits. Emits '0' if even number of 1's have been seen, and '1' if odd number of 1's have been seen.",
        type: "Moore",
        data: {
            states: ["EVEN", "ODD"],
            alphabet: ["0", "1"],
            outputAlphabet: ["0", "1"],
            initialState: "EVEN",
            stateOutputs: {
                "EVEN": "0",
                "ODD": "1"
            },
            transitions: {
                "EVEN": { "0": "EVEN", "1": "ODD" },
                "ODD": { "0": "ODD", "1": "EVEN" }
            }
        },
        sampleInputs: ["101", "110", "1111", "10101", "000"]
    },

    // Preset 5: Modulo 3 Binary Divisibility (Moore)
    mod3_moore: {
        id: "mod3_moore",
        name: "Binary Modulo-3 Counter (Moore)",
        category: "Moore to Mealy",
        description: "Calculates the remainder of a binary number processed MSB-to-LSB modulo 3. State S0 represents rem 0, S1 represents rem 1, S2 represents rem 2.",
        type: "Moore",
        data: {
            states: ["S0", "S1", "S2"],
            alphabet: ["0", "1"],
            outputAlphabet: ["0", "1", "2"],
            initialState: "S0",
            stateOutputs: {
                "S0": "0",
                "S1": "1",
                "S2": "2"
            },
            transitions: {
                "S0": { "0": "S0", "1": "S1" },
                "S1": { "0": "S2", "1": "S0" },
                "S2": { "0": "S1", "1": "S2" }
            }
        },
        sampleInputs: ["0", "11", "110", "1001", "1010", "1111"]
    },

    // Preset 6: Multi-Output State Splitting Challenge (Mealy)
    multi_split_mealy: {
        id: "multi_split_mealy",
        name: "Multi-Split State Challenge (Mealy)",
        category: "Mealy to Moore",
        description: "Illustrates complex state splitting where state Q2 is entered with three distinct outputs ('0', '1', and '2'), splitting Q2 into Q2_0, Q2_1, and Q2_2.",
        type: "Mealy",
        data: {
            states: ["Q0", "Q1", "Q2"],
            alphabet: ["a", "b"],
            outputAlphabet: ["0", "1", "2"],
            initialState: "Q0",
            transitions: {
                "Q0": { "a": "Q1", "b": "Q2" },
                "Q1": { "a": "Q2", "b": "Q0" },
                "Q2": { "a": "Q2", "b": "Q1" }
            },
            outputs: {
                "Q0": { "a": "0", "b": "1" },
                "Q1": { "a": "2", "b": "0" },
                "Q2": { "a": "0", "b": "1" }
            }
        },
        sampleInputs: ["ab", "aba", "babab", "aaaa", "bbbb"]
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { AUTOMATA_PRESETS };
} else {
    window.AUTOMATA_PRESETS = AUTOMATA_PRESETS;
}

