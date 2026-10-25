package dtos.fsm;

import java.util.List;

import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.fsm.StateMachine;
import liquidjava.fsm.StateMachineInitialTransition;
import liquidjava.fsm.StateMachineTransition;

/**
 * DTO for serializing a state machine diagram, with the state error shown on it
 */
public record StateMachineDTO(
        String className,
        List<String> states,
        List<StateMachineTransition> transitions,
        List<StateMachineInitialTransition> initialTransitions,
        StateErrorContextDTO errorContext) {

    public static StateMachineDTO from(StateMachine sm, StateErrorContext context) {
        if (sm == null) return null;
        return new StateMachineDTO(sm.className(), sm.states(), sm.transitions(), sm.initialTransitions(),
                StateErrorContextDTO.from(context, sm.states()));
    }
}
