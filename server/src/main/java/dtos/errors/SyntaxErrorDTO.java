package dtos.errors;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.errors.SyntaxError;

/**
 * DTO for serializing SyntaxError instances to JSON
 */
public record SyntaxErrorDTO(String category, String type, String title, String message, String file, SourcePositionDTO position,
        String refinement) {

    public static SyntaxErrorDTO from(SyntaxError error) {
        return new SyntaxErrorDTO("error", "syntax-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourcePositionDTO.from(error.getPosition()), error.getRefinement());
    }
}
