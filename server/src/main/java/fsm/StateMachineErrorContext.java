package fsm;

import java.util.List;

/**
 * Describes the verification error overlaid on a state machine diagram.
 */
public record StateMachineErrorContext(
        String calledMethod,
        List<String> expectedStates,
        List<String> actualStates) {}
