package dtos.fsm;

import java.util.List;
import java.util.stream.Stream;

import liquidjava.diagnostics.errors.StateErrorContext;

/**
 * DTO for serializing the verifier's states of a rejected call on the diagram of one state set
 * The verifier names each state by its name in every state set, so a state of the diagram is valid only if the call
 * is accepted in every possible combination with it, and invalid only if no accepted state has it, so that a state is
 * not blamed for a call rejected because of another state set
 *
 * @param calledMethod the name of the called method, as in the diagram's transitions
 * @param receiver the receiver of the call as written in the code
 * @param possibleStates the states the receiver can be in before the call
 * @param acceptedStates the states that allow the call, empty if they depend on more than the receiver's state,
 *                       in which case no state is marked valid or invalid
 * @param validStates the possible states that allow the call
 * @param invalidStates the possible states that do not allow the call
 */
public record StateErrorContextDTO(
        String calledMethod,
        String receiver,
        List<String> possibleStates,
        List<String> acceptedStates,
        List<String> validStates,
        List<String> invalidStates) {

    public static StateErrorContextDTO from(StateErrorContext context, List<String> states, int stateSet) {
        if (context == null) return null;
        String calledMethod = calledMethod(context);
        List<List<String>> possible = context.possibleStates();
        List<String> possibleStates = inStateSet(possible, states, stateSet);
        List<List<String>> accepted = context.acceptedStates();
        if (accepted == null) // nothing can be marked without knowing which states allow the call
            return new StateErrorContextDTO(calledMethod, context.receiver(), possibleStates, List.of(), List.of(),
                    List.of());
        List<String> acceptedStates = inStateSet(accepted, states, stateSet);
        return new StateErrorContextDTO(calledMethod, context.receiver(), possibleStates, acceptedStates,
                possibleStates.stream()
                        .filter(s -> withState(possible, s, stateSet).allMatch(accepted::contains)).toList(),
                possibleStates.stream().filter(s -> !acceptedStates.contains(s)).toList());
    }

    /** The name of the called method, as in the diagram's transitions */
    public static String calledMethod(StateErrorContext context) {
        return context.method().substring(0, context.method().indexOf('('));
    }

    /** The states of the diagram that appear in the given state set of {@code combinations} */
    private static List<String> inStateSet(List<List<String>> combinations, List<String> states, int stateSet) {
        return states.stream().filter(s -> withState(combinations, s, stateSet).findAny().isPresent()).toList();
    }

    private static Stream<List<String>> withState(List<List<String>> combinations, String state, int stateSet) {
        return combinations.stream().filter(c -> stateSet < c.size() && c.get(stateSet).equals(state));
    }
}
