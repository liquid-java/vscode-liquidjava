package dtos.fsm;

import java.util.List;

import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.fsm.StateMachine;
import liquidjava.fsm.StateMachineInitialTransition;
import liquidjava.fsm.StateMachineTransition;

/**
 * DTO for serializing the state machine diagram of one state set, with the state error shown on it
 *
 * @param stateSet the index of the state set among the class's StateSet annotations
 * @param errorContext the state error on this diagram, or null if the call does not involve this state set
 */
public record StateMachineDTO(
        String className,
        int stateSet,
        List<String> states,
        List<StateMachineTransition> transitions,
        List<StateMachineInitialTransition> initialTransitions,
        StateErrorContextDTO errorContext) {

    public static StateMachineDTO from(StateMachine sm, StateErrorContext context) {
        if (sm == null) return null;
        return new StateMachineDTO(sm.className(), sm.stateSet(), sm.states(), sm.transitions(),
                sm.initialTransitions(), StateErrorContextDTO.from(context, sm.states(), sm.stateSet()));
    }

    /**
     * The diagrams of every state set of a class, with the state error only on those of the state sets the called
     * method changes or requires, or on all of them if the called method is in none
     */
    public static List<StateMachineDTO> from(List<StateMachine> sms, StateErrorContext context) {
        String calledMethod = context == null ? null : StateErrorContextDTO.calledMethod(context);
        boolean anyHasMethod = calledMethod != null && sms.stream().anyMatch(sm -> hasMethod(sm, calledMethod));
        return sms.stream()
                .map(sm -> from(sm, !anyHasMethod || hasMethod(sm, calledMethod) ? context : null))
                .toList();
    }

    private static boolean hasMethod(StateMachine sm, String method) {
        return sm.transitions().stream().anyMatch(t -> t.label().equals(method));
    }
}
