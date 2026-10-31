"""
converter.py
Formal Bidirectional Conversion Algorithms between Mealy and Moore Machines.
Includes comprehensive step-by-step computation logs, state splitting, reachability pruning,
and formal equivalence proofs.
"""

from typing import Dict, Set, Tuple, List, Optional, Any
from .automata_models import MealyMachine, MooreMachine


class ConversionStep:
    def __init__(self, step_number: int, title: str, description: str, data: Any = None):
        self.step_number = step_number
        self.title = title
        self.description = description
        self.data = data or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_number": self.step_number,
            "title": self.title,
            "description": self.description,
            "data": self.data
        }


def mealy_to_moore(
    mealy: MealyMachine,
    initial_moore_output: Optional[str] = None,
    prune_unreachable: bool = True
) -> Tuple[MooreMachine, List[ConversionStep]]:
    """
    Converts a Mealy Machine to an equivalent Moore Machine.
    
    Theoretical Basis:
    In a Mealy machine, output is associated with transitions: lambda(q, a).
    In a Moore machine, output is associated with states: lambda(q).
    If a Mealy state q is reached with distinct output symbols b_1, b_2, ...,
    then q must be split into multiple Moore states (q, b_1), (q, b_2), ...
    Each split state (q, b) emits output b.
    
    Initial State Handling:
    The initial state q0 emits an output upon entering the start state before any input is read.
    If q0 has incoming transitions, those outputs will dictate split versions of q0.
    The primary initial state of the Moore machine can be assigned an initial default symbol
    (either specified by user, or the first output symbol in Delta, or from an incoming self-loop).
    """
    steps: List[ConversionStep] = []

    # Step 1: Analyze incoming transitions for each state
    incoming_outputs: Dict[str, Set[str]] = {s: set() for s in mealy.states}
    transition_details: List[Dict[str, str]] = []

    for s in mealy.states:
        for a in mealy.alphabet:
            if a in mealy.transitions[s]:
                dest = mealy.transitions[s][a]
                out = mealy.outputs[s][a]
                incoming_outputs[dest].add(out)
                transition_details.append({
                    "from_state": s,
                    "symbol": a,
                    "to_state": dest,
                    "output": out
                })

    step1_data = {
        "incoming_outputs": {s: sorted(list(outs)) for s, outs in incoming_outputs.items()},
        "transitions": transition_details
    }
    steps.append(ConversionStep(
        step_number=1,
        title="Analyze Incoming Outputs per State",
        description=(
            "Examine all transitions delta(p, a) -> q with output lambda(p, a) = b. "
            "For each state q, find the set of distinct outputs associated with transitions entering q."
        ),
        data=step1_data
    ))

    # Determine default initial output if q0 has no incoming output or needs a designated start output
    if initial_moore_output is not None:
        default_q0_output = initial_moore_output
    elif len(incoming_outputs[mealy.initial_state]) > 0:
        default_q0_output = sorted(list(incoming_outputs[mealy.initial_state]))[0]
    else:
        default_q0_output = mealy.output_alphabet[0] if mealy.output_alphabet else "0"

    # Step 2: State Splitting
    # A state q splits into (q, b) for each b in incoming_outputs[q].
    # For q0, ensure (q0, default_q0_output) exists as the initial Moore state.
    state_mapping: Dict[str, List[str]] = {}  # orig_state -> list of new state names
    moore_state_outputs: Dict[str, str] = {}
    new_to_orig: Dict[str, Tuple[str, str]] = {}  # new_state -> (orig_state, output)

    for s in mealy.states:
        outs = incoming_outputs[s]
        if s == mealy.initial_state:
            # Always ensure default_q0_output is represented
            outs = outs.union({default_q0_output})
        elif len(outs) == 0:
            # Unreachable state or state without incoming transitions
            outs = {mealy.output_alphabet[0] if mealy.output_alphabet else "0"}

        sorted_outs = sorted(list(outs))
        state_mapping[s] = []
        for out in sorted_outs:
            new_name = f"{s}_{out}"
            state_mapping[s].append(new_name)
            moore_state_outputs[new_name] = out
            new_to_orig[new_name] = (s, out)

    initial_moore_state = f"{mealy.initial_state}_{default_q0_output}"

    step2_data = {
        "state_mapping": state_mapping,
        "moore_state_outputs": moore_state_outputs,
        "initial_moore_state": initial_moore_state
    }
    steps.append(ConversionStep(
        step_number=2,
        title="State Splitting & State Output Assignment",
        description=(
            "For each state q, create a new Moore state q_b for each distinct output b that enters q. "
            f"Initial state '{mealy.initial_state}' is mapped to start state '{initial_moore_state}' "
            f"with initial output '{default_q0_output}'."
        ),
        data=step2_data
    ))

    # Step 3: Transition Function Construction
    # For each new state (q, b) and input symbol a:
    # Look up delta(q, a) = next_q and lambda(q, a) = next_out in Mealy machine.
    # In Moore, delta'((q, b), a) = (next_q, next_out).
    moore_transitions: Dict[str, Dict[str, str]] = {}
    all_moore_states = list(moore_state_outputs.keys())
    transition_mapping_logs = []

    for new_s in all_moore_states:
        orig_s, _ = new_to_orig[new_s]
        moore_transitions[new_s] = {}
        for a in mealy.alphabet:
            if a in mealy.transitions[orig_s]:
                next_orig = mealy.transitions[orig_s][a]
                next_out = mealy.outputs[orig_s][a]
                target_moore_state = f"{next_orig}_{next_out}"
                moore_transitions[new_s][a] = target_moore_state
                transition_mapping_logs.append({
                    "moore_from": new_s,
                    "symbol": a,
                    "mealy_rule": f"delta({orig_s}, {a})={next_orig}, lambda({orig_s}, {a})={next_out}",
                    "moore_to": target_moore_state
                })

    step3_data = {
        "transitions": moore_transitions,
        "mapping_logs": transition_mapping_logs
    }
    steps.append(ConversionStep(
        step_number=3,
        title="Construct Moore Transition Table",
        description=(
            "For each Moore state (q, b) and input a, the target state is "
            "(delta(q, a), lambda(q, a)). Transitions depend only on the underlying Mealy state."
        ),
        data=step3_data
    ))

    # Step 4: Reachability Analysis
    reachable: Set[str] = set()
    queue = [initial_moore_state]
    reachable.add(initial_moore_state)

    while queue:
        curr = queue.pop(0)
        for a in mealy.alphabet:
            target = moore_transitions.get(curr, {}).get(a)
            if target and target not in reachable:
                reachable.add(target)
                queue.append(target)

    unreachable = set(all_moore_states) - reachable

    step4_data = {
        "reachable_states": sorted(list(reachable)),
        "unreachable_states": sorted(list(unreachable)),
        "pruned": prune_unreachable and len(unreachable) > 0
    }
    steps.append(ConversionStep(
        step_number=4,
        title="Reachability Analysis",
        description=(
            f"Identified {len(reachable)} reachable state(s) and {len(unreachable)} unreachable state(s) "
            f"starting from '{initial_moore_state}'."
        ),
        data=step4_data
    ))

    # Finalize state set
    final_states = sorted(list(reachable)) if prune_unreachable else all_moore_states
    final_transitions = {
        s: {a: moore_transitions[s][a] for a in mealy.alphabet if a in moore_transitions.get(s, {})}
        for s in final_states
    }
    final_outputs = {s: moore_state_outputs[s] for s in final_states}

    moore_machine = MooreMachine(
        states=final_states,
        alphabet=mealy.alphabet,
        output_alphabet=mealy.output_alphabet,
        transitions=final_transitions,
        state_outputs=final_outputs,
        initial_state=initial_moore_state,
        name=f"Equivalent Moore Machine of {mealy.name}"
    )

    steps.append(ConversionStep(
        step_number=5,
        title="Final Moore Machine Specification",
        description="Conversion complete. Moore Machine 6-tuple successfully generated.",
        data=moore_machine.to_dict()
    ))

    return moore_machine, steps


def moore_to_mealy(
    moore: MooreMachine
) -> Tuple[MealyMachine, List[ConversionStep]]:
    """
    Converts a Moore Machine to an equivalent Mealy Machine.
    
    Theoretical Basis:
    In a Moore machine, output lambda_M(q) depends strictly on the state q.
    In a Mealy machine, output lambda_Mealy(q, a) is associated with the transition.
    Since transition delta_M(q, a) enters state q' = delta_M(q, a),
    the transition in Mealy machine produces the output of that target state:
    lambda_Mealy(q, a) = lambda_Moore(q') = lambda_Moore(delta_Moore(q, a)).
    
    States: Q_Mealy = Q_Moore
    Alphabet: Sigma_Mealy = Sigma_Moore
    Output Alphabet: Delta_Mealy = Delta_Moore
    Initial State: q0_Mealy = q0_Moore
    """
    steps: List[ConversionStep] = []

    # Step 1: Formal Inspection
    step1_data = {
        "states": moore.states,
        "state_outputs": moore.state_outputs,
        "initial_state": moore.initial_state
    }
    steps.append(ConversionStep(
        step_number=1,
        title="Inspect Moore Machine States and Outputs",
        description=(
            "Moore states retain their exact identities in the Mealy machine. "
            "Output of each Moore state is recorded."
        ),
        data=step1_data
    ))

    # Step 2: Assign Mealy Transition Outputs
    mealy_transitions: Dict[str, Dict[str, str]] = {}
    mealy_outputs: Dict[str, Dict[str, str]] = {}
    mapping_details = []

    for s in moore.states:
        mealy_transitions[s] = {}
        mealy_outputs[s] = {}
        for a in moore.alphabet:
            if a in moore.transitions[s]:
                dest = moore.transitions[s][a]
                mealy_transitions[s][a] = dest
                # The output on transition (s, a) is the output of target state dest
                dest_output = moore.state_outputs[dest]
                mealy_outputs[s][a] = dest_output
                mapping_details.append({
                    "from_state": s,
                    "symbol": a,
                    "to_state": dest,
                    "moore_state_output": dest_output,
                    "mealy_transition_output": dest_output
                })

    step2_data = {
        "mapping_details": mapping_details,
        "mealy_transitions": mealy_transitions,
        "mealy_outputs": mealy_outputs
    }
    steps.append(ConversionStep(
        step_number=2,
        title="Construct Mealy Transition & Output Tables",
        description=(
            "For each transition delta_M(q, a) = q', assign Mealy output "
            "lambda_Mealy(q, a) = lambda_Moore(q')."
        ),
        data=step2_data
    ))

    mealy_machine = MealyMachine(
        states=moore.states,
        alphabet=moore.alphabet,
        output_alphabet=moore.output_alphabet,
        transitions=mealy_transitions,
        outputs=mealy_outputs,
        initial_state=moore.initial_state,
        name=f"Equivalent Mealy Machine of {moore.name}"
    )

    steps.append(ConversionStep(
        step_number=3,
        title="Final Mealy Machine Specification",
        description="Conversion complete. Mealy Machine 6-tuple successfully generated.",
        data=mealy_machine.to_dict()
    ))

    return mealy_machine, steps


def verify_equivalence(
    mealy: MealyMachine,
    moore: MooreMachine,
    test_strings: List[str]
) -> Dict[str, Any]:
    """
    Verifies output equivalence between Mealy and Moore machines on a set of test strings.
    
    Theorem:
    For any input string w = a1 a2 ... an:
    Let Moore output be y0 y1 ... yn (length n + 1), where y0 = lambda_Moore(q0).
    Let Mealy output be z1 z2 ... zn (length n).
    The machines are equivalent iff for all w:
    y1 y2 ... yn == z1 z2 ... zn.
    That is: moore_out == moore.state_outputs[moore.initial_state] + mealy_out.
    """
    results = []
    all_passed = True

    for w in test_strings:
        try:
            mealy_out, mealy_trace = mealy.run(w)
            moore_out, moore_trace = moore.run(w)

            # Moore output starts with initial state output
            moore_shifted = moore_out[1:]
            is_match = (moore_shifted == mealy_out)
            if not is_match:
                all_passed = False

            results.append({
                "input": w,
                "input_length": len(w),
                "mealy_output": mealy_out,
                "moore_output": moore_out,
                "moore_initial_symbol": moore_out[0] if moore_out else "",
                "moore_reaction_output": moore_shifted,
                "is_equivalent": is_match,
                "mealy_trace": mealy_trace,
                "moore_trace": moore_trace
            })
        except Exception as e:
            all_passed = False
            results.append({
                "input": w,
                "error": str(e),
                "is_equivalent": False
            })

    return {
        "all_passed": all_passed,
        "total_tests": len(test_strings),
        "passed_tests": sum(1 for r in results if r.get("is_equivalent", False)),
        "results": results
    }

