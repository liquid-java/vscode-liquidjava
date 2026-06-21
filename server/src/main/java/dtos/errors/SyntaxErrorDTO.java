package dtos.errors;

import liquidjava.diagnostics.errors.SyntaxError;

/**
 * DTO for serializing SyntaxError instances to JSON
 */
public class SyntaxErrorDTO extends LJErrorDTO {

    public final String refinement;

    public SyntaxErrorDTO(SyntaxError error) {
        super("syntax-error", error);
        this.refinement = error.getRefinement();
    }

    public static SyntaxErrorDTO from(SyntaxError error) {
        return new SyntaxErrorDTO(error);
    }
}
