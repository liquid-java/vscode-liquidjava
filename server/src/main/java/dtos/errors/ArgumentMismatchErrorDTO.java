package dtos.errors;

import liquidjava.diagnostics.ErrorPosition;
import liquidjava.diagnostics.errors.ArgumentMismatchError;

/**
 * DTO for serializing ArgumentMismatchErrorDTO instances to JSON
 */
public record ArgumentMismatchErrorDTO(String category, String type, String title, String message, String file,
        ErrorPosition position) {

    public static ArgumentMismatchErrorDTO from(ArgumentMismatchError error) {
        return new ArgumentMismatchErrorDTO("error", "argument-mismatch-error", error.getTitle(), error.getMessage(), error.getFile(),
                error.getPosition());
    }
}
