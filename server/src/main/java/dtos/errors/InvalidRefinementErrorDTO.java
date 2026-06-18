package dtos.errors;

import liquidjava.diagnostics.errors.InvalidRefinementError;

/**
 * DTO for serializing InvalidRefinementError instances to JSON
 */
public class InvalidRefinementErrorDTO extends LJErrorDTO {

    public final String refinement;

    public InvalidRefinementErrorDTO(InvalidRefinementError error) {
        super("invalid-refinement-error", error);
        this.refinement = error.getRefinement();
    }

    public static InvalidRefinementErrorDTO from(InvalidRefinementError error) {
        return new InvalidRefinementErrorDTO(error);
    }
}
