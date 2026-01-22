package fsm;

import java.util.List;

/**
 * Represents a state machine
 */
public record StateMachine(
    String className,
    String initial,
    List<String> states,
    List<StateMachineTransition> transitions
) { }
