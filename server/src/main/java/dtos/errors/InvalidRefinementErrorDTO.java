package dtos.errors;

import dtos.diagnostics.SourceRangeDTO;
import liquidjava.diagnostics.errors.InvalidRefinementError;

/**
 * DTO for serializing InvalidRefinementError instances to JSON
 */
public record InvalidRefinementErrorDTO(String category, String type, String title, String message, String file,
        SourceRangeDTO position, String refinement) {

    public static InvalidRefinementErrorDTO from(InvalidRefinementError error) {
        return new InvalidRefinementErrorDTO("error", "invalid-refinement-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourceRangeDTO.from(error.getPosition()), error.getRefinement());
    }
}
