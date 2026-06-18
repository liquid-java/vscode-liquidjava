package dtos.errors;

import liquidjava.diagnostics.errors.StateConflictError;

/**
 * DTO for serializing StateConflictError instances to JSON
 */
public class StateConflictErrorDTO extends LJErrorDTO {

    public final String state;

    public StateConflictErrorDTO(StateConflictError error) {
        super("state-conflict-error", error);
        this.state = error.getState();
    }

    public static StateConflictErrorDTO from(StateConflictError error) {
        return new StateConflictErrorDTO(error);
    }
}
