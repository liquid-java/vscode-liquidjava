package fsm;

/**
 * Represents a transition in a state machine
 */
public record StateMachineTransition(String from, String to, String on) {}