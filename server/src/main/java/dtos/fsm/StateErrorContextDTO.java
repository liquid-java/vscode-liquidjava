package dtos.fsm;

import java.util.List;
import java.util.stream.Stream;

import liquidjava.diagnostics.errors.StateErrorContext;

/**
 * DTO for serializing the verifier's states of a rejected call on the diagram of its first state set
 * The verifier names each state by its name in every state set, so a state of the diagram is valid only if the call
 * is accepted in every possible combination with it, and invalid only if it is accepted in none
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

    public static StateErrorContextDTO from(StateErrorContext context, List<String> states) {
        if (context == null) return null;
        String calledMethod = context.method().substring(0, context.method().indexOf('('));
        List<List<String>> possible = context.possibleStates();
        List<String> possibleStates = firstSet(possible, states);
        List<List<String>> accepted = context.acceptedStates();
        if (accepted == null) // nothing can be marked without knowing which states allow the call
            return new StateErrorContextDTO(calledMethod, context.receiver(), possibleStates, List.of(), List.of(),
                    List.of());
        return new StateErrorContextDTO(calledMethod, context.receiver(), possibleStates, firstSet(accepted, states),
                possibleStates.stream().filter(s -> withState(possible, s).allMatch(accepted::contains)).toList(),
                possibleStates.stream().filter(s -> withState(possible, s).noneMatch(accepted::contains)).toList());
    }

    /** The states of the diagram that appear in the first state set of {@code combinations} */
    private static List<String> firstSet(List<List<String>> combinations, List<String> states) {
        return states.stream().filter(s -> withState(combinations, s).findAny().isPresent()).toList();
    }

    private static Stream<List<String>> withState(List<List<String>> combinations, String state) {
        return combinations.stream().filter(c -> c.get(0).equals(state));
    }
}
