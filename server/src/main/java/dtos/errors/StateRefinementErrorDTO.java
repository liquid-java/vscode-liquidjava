package dtos.errors;

import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.rj_language.opt.derivation_node.ValDerivationNode;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public class StateRefinementErrorDTO extends LJErrorDTO {

    public final ValDerivationNode expected;
    public final ValDerivationNode found;
    public final String customMessage;

    public StateRefinementErrorDTO(StateRefinementError error) {
        super("state-refinement-error", error);
        this.expected = error.getExpected();
        this.found = error.getFound();
        this.customMessage = error.getCustomMessage();
    }

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO(error);
    }
}
