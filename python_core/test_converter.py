"""
test_converter.py
Comprehensive test suite validating:
1. Mealy -> Moore conversion
2. Moore -> Mealy conversion
3. Equivalence theorem: Moore_output = Initial_Output + Mealy_output
4. Canonical textbook examples:
   - 2's Complement Generator
   - Sequence Detector "101"
   - Parity Bit Generator
   - Single state inversion (1's complement)
"""

import pytest
from python_core.automata_models import MealyMachine, MooreMachine
from python_core.converter import mealy_to_moore, moore_to_mealy, verify_equivalence


def test_ones_complement_mealy_to_moore():
    # 1's complement Mealy machine: 1 state q0, 0->1, 1->0
    mealy = MealyMachine(
        states=["q0"],
        alphabet=["0", "1"],
        output_alphabet=["0", "1"],
        transitions={"q0": {"0": "q0", "1": "q0"}},
        outputs={"q0": {"0": "1", "1": "0"}},
        initial_state="q0"
    )

    moore, steps = mealy_to_moore(mealy)
    assert len(steps) == 5

    # Test equivalence on several strings
    test_cases = ["", "0", "1", "00", "01", "10", "11", "1010110", "0000"]
    verification = verify_equivalence(mealy, moore, test_cases)
    assert verification["all_passed"] is True


def test_sequence_detector_101():
    # Detects substring "101", outputs 1 upon detection, otherwise 0
    mealy = MealyMachine(
        states=["q0", "q1", "q2"],
        alphabet=["0", "1"],
        output_alphabet=["0", "1"],
        transitions={
            "q0": {"0": "q0", "1": "q1"},
            "q1": {"0": "q2", "1": "q1"},
            "q2": {"0": "q0", "1": "q1"}
        },
        outputs={
            "q0": {"0": "0", "1": "0"},
            "q1": {"0": "0", "1": "0"},
            "q2": {"0": "0", "1": "1"}
        },
        initial_state="q0",
        name="101 Sequence Detector (Mealy)"
    )

    moore, steps = mealy_to_moore(mealy)

    test_cases = [
        "101",
        "10101",
        "000",
        "1111",
        "1010101",
        "100101",
        "0101"
    ]

    verification = verify_equivalence(mealy, moore, test_cases)
    assert verification["all_passed"] is True

    # Check specific output for "10101":
    # Mealy output should be "00101"
    out_mealy, _ = mealy.run("10101")
    assert out_mealy == "00101"
    out_moore, _ = moore.run("10101")
    # Moore output has initial state output prefixed
    assert out_moore[1:] == "00101"


def test_moore_to_mealy_roundtrip():
    # Define a Moore machine for Parity Generator
    moore = MooreMachine(
        states=["EVEN", "ODD"],
        alphabet=["0", "1"],
        output_alphabet=["0", "1"],
        transitions={
            "EVEN": {"0": "EVEN", "1": "ODD"},
            "ODD": {"0": "ODD", "1": "EVEN"}
        },
        state_outputs={"EVEN": "0", "ODD": "1"},
        initial_state="EVEN",
        name="Parity Bit Generator (Moore)"
    )

    mealy, steps = moore_to_mealy(moore)
    assert len(steps) == 3

    test_cases = ["0", "1", "11", "101", "1110", "10101", "0000"]
    verification = verify_equivalence(mealy, moore, test_cases)
    assert verification["all_passed"] is True


def test_twos_complement_mealy():
    # 2's complement of a binary number read LSB to MSB:
    # State A (copy until first 1): 0->0 (stay A), 1->1 (go to B)
    # State B (invert all subsequent): 0->1 (stay B), 1->0 (stay B)
    mealy = MealyMachine(
        states=["A", "B"],
        alphabet=["0", "1"],
        output_alphabet=["0", "1"],
        transitions={
            "A": {"0": "A", "1": "B"},
            "B": {"0": "B", "1": "B"}
        },
        outputs={
            "A": {"0": "0", "1": "1"},
            "B": {"0": "1", "1": "0"}
        },
        initial_state="A",
        name="2's Complement Generator (LSB First)"
    )

    moore, steps = mealy_to_moore(mealy)
    test_cases = ["000", "010", "110", "1001", "1010", "000100"]
    verification = verify_equivalence(mealy, moore, test_cases)
    assert verification["all_passed"] is True

