package dtos.warnings;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.warnings.UnsatisfiableRefinementWarning;

/**
 * DTO for serializing UnsatisfiableRefinementWarning instances to JSON
 */
public record UnsatisfiableRefinementWarningDTO(String category, String type, String title, String message, String file,
        SourcePositionDTO position, String refinement) {

    public static UnsatisfiableRefinementWarningDTO from(UnsatisfiableRefinementWarning warning) {
        return new UnsatisfiableRefinementWarningDTO("warning", "unsatisfiable-refinement-warning", warning.getTitle(),
                warning.getMessage(), warning.getFile(), SourcePositionDTO.from(warning.getPosition()),
                warning.getRefinement());
    }
}
