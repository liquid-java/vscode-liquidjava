package dtos.errors;

import dtos.diagnostics.VCSimplificationResultDTO;
import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing RefinementError instances to JSON
 */
public class RefinementErrorDTO extends LJErrorDTO {

    public final String expected;
    public final VCSimplificationResultDTO found;
    public final String customMessage;
    public final String counterexample;

    public RefinementErrorDTO(RefinementError error) {
        super("refinement-error", error);
        this.expected = error.getExpected() == null ? null : ExpressionFormatter.format(error.getExpected());
        this.found = VCSimplificationResultDTO.from(error.getFound());
        this.customMessage = error.getCustomMessage();
        this.counterexample = error.getCounterExampleString();
    }

    public static RefinementErrorDTO from(RefinementError error) {
        return new RefinementErrorDTO(error);
    }
}
