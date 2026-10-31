"""
automata_models.py
Formal definition of Mealy and Moore Machines as 6-tuples.

Mealy Machine: M = (Q, Sigma, Delta, delta, lambda_mealy, q0)
- Q: Finite set of states
- Sigma: Finite set of input symbols (Input Alphabet)
- Delta: Finite set of output symbols (Output Alphabet)
- delta: Transition function Q x Sigma -> Q
- lambda_mealy: Output function Q x Sigma -> Delta
- q0: Initial state (q0 in Q)

Moore Machine: M = (Q, Sigma, Delta, delta, lambda_moore, q0)
- Q: Finite set of states
- Sigma: Finite set of input symbols
- Delta: Finite set of output symbols
- delta: Transition function Q x Sigma -> Q
- lambda_moore: Output function Q -> Delta
- q0: Initial state (q0 in Q)
"""

from typing import Dict, Set, Tuple, List, Optional, Any
import json


class MealyMachine:
    def __init__(
        self,
        states: List[str],
        alphabet: List[str],
        output_alphabet: List[str],
        transitions: Dict[str, Dict[str, str]],
        outputs: Dict[str, Dict[str, str]],
        initial_state: str,
        name: str = "Mealy Machine"
    ):
        self.states = list(states)
        self.alphabet = list(alphabet)
        self.output_alphabet = list(output_alphabet)
        # transitions[state][symbol] = next_state
        self.transitions = {s: dict(transitions.get(s, {})) for s in states}
        # outputs[state][symbol] = output_symbol
        self.outputs = {s: dict(outputs.get(s, {})) for s in states}
        self.initial_state = initial_state
        self.name = name
        self.validate()

    def validate(self):
        if self.initial_state not in self.states:
            raise ValueError(f"Initial state '{self.initial_state}' not in states {self.states}")
        for s in self.states:
            for a in self.alphabet:
                if a in self.transitions[s]:
                    dest = self.transitions[s][a]
                    if dest not in self.states:
                        raise ValueError(f"Transition delta({s}, {a}) -> '{dest}' is not in states")
                if a in self.outputs[s]:
                    out = self.outputs[s][a]
                    if out not in self.output_alphabet:
                        raise ValueError(f"Output lambda({s}, {a}) -> '{out}' is not in output alphabet")

    def run(self, input_string: str) -> Tuple[str, List[Tuple[str, str, str, str]]]:
        """
        Processes an input string through the Mealy machine.
        Returns:
            output_string: string of output symbols of length equal to len(input_string)
            trace: list of (current_state, input_symbol, next_state, output_symbol)
        """
        current_state = self.initial_state
        output_symbols = []
        trace = []

        for symbol in input_string:
            if symbol not in self.alphabet:
                raise ValueError(f"Input symbol '{symbol}' not in alphabet {self.alphabet}")
            next_state = self.transitions[current_state].get(symbol)
            out_symbol = self.outputs[current_state].get(symbol)
            if next_state is None or out_symbol is None:
                raise ValueError(f"Undefined transition from state '{current_state}' on symbol '{symbol}'")
            trace.append((current_state, symbol, next_state, out_symbol))
            output_symbols.append(out_symbol)
            current_state = next_state

        return "".join(output_symbols), trace

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Mealy",
            "name": self.name,
            "states": self.states,
            "alphabet": self.alphabet,
            "output_alphabet": self.output_alphabet,
            "initial_state": self.initial_state,
            "transitions": self.transitions,
            "outputs": self.outputs
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MealyMachine":
        return cls(
            states=data["states"],
            alphabet=data["alphabet"],
            output_alphabet=data["output_alphabet"],
            transitions=data["transitions"],
            outputs=data["outputs"],
            initial_state=data["initial_state"],
            name=data.get("name", "Mealy Machine")
        )


class MooreMachine:
    def __init__(
        self,
        states: List[str],
        alphabet: List[str],
        output_alphabet: List[str],
        transitions: Dict[str, Dict[str, str]],
        state_outputs: Dict[str, str],
        initial_state: str,
        name: str = "Moore Machine"
    ):
        self.states = list(states)
        self.alphabet = list(alphabet)
        self.output_alphabet = list(output_alphabet)
        # transitions[state][symbol] = next_state
        self.transitions = {s: dict(transitions.get(s, {})) for s in states}
        # state_outputs[state] = output_symbol
        self.state_outputs = dict(state_outputs)
        self.initial_state = initial_state
        self.name = name
        self.validate()

    def validate(self):
        if self.initial_state not in self.states:
            raise ValueError(f"Initial state '{self.initial_state}' not in states {self.states}")
        for s in self.states:
            if s not in self.state_outputs:
                raise ValueError(f"State '{s}' has no defined output in state_outputs")
            out = self.state_outputs[s]
            if out not in self.output_alphabet:
                raise ValueError(f"Output for state '{s}' is '{out}', not in output alphabet {self.output_alphabet}")
            for a in self.alphabet:
                if a in self.transitions[s]:
                    dest = self.transitions[s][a]
                    if dest not in self.states:
                        raise ValueError(f"Transition delta({s}, {a}) -> '{dest}' is not in states")

    def run(self, input_string: str) -> Tuple[str, List[Tuple[str, Optional[str], Optional[str], str]]]:
        """
        Processes an input string through the Moore machine.
        Returns:
            output_string: string of length len(input_string) + 1, starting with initial state output
            trace: list of (current_state, input_symbol_consumed, next_state, output_emitted)
        """
        current_state = self.initial_state
        output_symbols = [self.state_outputs[current_state]]
        # Initial step trace (state entered, no input, output emitted)
        trace = [(current_state, None, current_state, self.state_outputs[current_state])]

        for symbol in input_string:
            if symbol not in self.alphabet:
                raise ValueError(f"Input symbol '{symbol}' not in alphabet {self.alphabet}")
            next_state = self.transitions[current_state].get(symbol)
            if next_state is None:
                raise ValueError(f"Undefined transition from state '{current_state}' on symbol '{symbol}'")
            out_symbol = self.state_outputs[next_state]
            trace.append((current_state, symbol, next_state, out_symbol))
            output_symbols.append(out_symbol)
            current_state = next_state

        return "".join(output_symbols), trace

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Moore",
            "name": self.name,
            "states": self.states,
            "alphabet": self.alphabet,
            "output_alphabet": self.output_alphabet,
            "initial_state": self.initial_state,
            "transitions": self.transitions,
            "state_outputs": self.state_outputs
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MooreMachine":
        return cls(
            states=data["states"],
            alphabet=data["alphabet"],
            output_alphabet=data["output_alphabet"],
            transitions=data["transitions"],
            state_outputs=data["state_outputs"],
            initial_state=data["initial_state"],
            name=data.get("name", "Moore Machine")
        )

