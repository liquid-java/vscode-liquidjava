package dtos.errors;

import dtos.diagnostics.VCSimplificationResultDTO;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public class StateRefinementErrorDTO extends LJErrorDTO {

    public final String expected;
    public final VCSimplificationResultDTO found;
    public final String customMessage;

    public StateRefinementErrorDTO(StateRefinementError error) {
        super("state-refinement-error", error);
        this.expected = error.getExpected() == null ? null : ExpressionFormatter.format(error.getExpected());
        this.found = VCSimplificationResultDTO.from(error.getFoundSimplification());
        this.customMessage = error.getCustomMessage();
    }

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO(error);
    }
}
