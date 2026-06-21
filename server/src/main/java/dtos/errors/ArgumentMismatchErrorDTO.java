package dtos.errors;

import liquidjava.diagnostics.errors.ArgumentMismatchError;

/**
 * DTO for serializing ArgumentMismatchErrorDTO instances to JSON
 */
public class ArgumentMismatchErrorDTO extends LJErrorDTO {

    public ArgumentMismatchErrorDTO(ArgumentMismatchError error) {
        super("argument-mismatch-error", error);
    }

    public static ArgumentMismatchErrorDTO from(ArgumentMismatchError error) {
        return new ArgumentMismatchErrorDTO(error);
    }
}
