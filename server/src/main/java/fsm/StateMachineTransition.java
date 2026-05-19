package fsm;

/**
 * Represents a transition in a state machine
 */
public record StateMachineTransition(String from, String to, String label, String cond) {

    public StateMachineTransition(String from, String to, String label) {
        this(from, to, label, null);
    }
}
