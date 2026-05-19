package fsm;

/**
 * Represents an initial transition in a state machine
 */
public record StateMachineInitialTransition(String to, String postCond) {

    public StateMachineInitialTransition(String to) {
        this(to, null);
    }
}
