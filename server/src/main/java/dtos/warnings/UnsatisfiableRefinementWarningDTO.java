package dtos.warnings;

import liquidjava.diagnostics.warnings.UnsatisfiableRefinementWarning;

/**
 * DTO for serializing UnsatisfiableRefinementWarning instances to JSON
 */
public class UnsatisfiableRefinementWarningDTO extends LJWarningDTO {

    public final String refinement;

    public UnsatisfiableRefinementWarningDTO(UnsatisfiableRefinementWarning warning) {
        super("unsatisfiable-refinement-warning", warning);
        this.refinement = warning.getRefinement();
    }

    public static UnsatisfiableRefinementWarningDTO from(UnsatisfiableRefinementWarning warning) {
        return new UnsatisfiableRefinementWarningDTO(warning);
    }
}
