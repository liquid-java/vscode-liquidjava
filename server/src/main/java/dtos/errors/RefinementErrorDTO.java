package dtos.errors;

import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.rj_language.opt.derivation_node.ValDerivationNode;

/**
 * DTO for serializing RefinementError instances to JSON
 */
public class RefinementErrorDTO extends LJErrorDTO {

    public final ValDerivationNode expected;
    public final ValDerivationNode found;
    public final String customMessage;
    public final String counterexample;

    public RefinementErrorDTO(RefinementError error) {
        super("refinement-error", error);
        this.expected = error.getExpected();
        this.found = error.getFound();
        this.customMessage = error.getCustomMessage();
        this.counterexample = error.getCounterExampleString();
    }

    public static RefinementErrorDTO from(RefinementError error) {
        return new RefinementErrorDTO(error);
    }
}
