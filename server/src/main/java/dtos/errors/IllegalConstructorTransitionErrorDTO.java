package dtos.errors;

import dtos.diagnostics.SourceRangeDTO;
import liquidjava.diagnostics.errors.IllegalConstructorTransitionError;

/**
 * DTO for serializing IllegalConstructorTransitionError instances to JSON
 */
public record IllegalConstructorTransitionErrorDTO(String category, String type, String title, String message, String file,
        SourceRangeDTO position) {

    public static IllegalConstructorTransitionErrorDTO from(IllegalConstructorTransitionError error) {
        return new IllegalConstructorTransitionErrorDTO("error", "illegal-constructor-transition-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourceRangeDTO.from(error.getPosition()));
    }
}
