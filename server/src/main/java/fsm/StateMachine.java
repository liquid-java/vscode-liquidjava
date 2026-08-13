package fsm;

import java.util.List;

/**
 * Represents a state machine
 */
public record StateMachine(
    String className,
    List<String> states,
    List<StateMachineTransition> transitions,
    List<StateMachineInitialTransition> initialTransitions,
    StateMachineErrorContext errorContext
) { }
