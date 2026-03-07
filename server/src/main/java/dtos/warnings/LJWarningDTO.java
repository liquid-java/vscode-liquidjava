package dtos.warnings;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.warnings.LJWarning;

/**
 * DTO for serializing LJWarning instances to JSON
 */
public record LJWarningDTO(String title, String message, String file, SourcePositionDTO position) {

    public static LJWarningDTO from(LJWarning warning) {
        return new LJWarningDTO(warning.getTitle(), warning.getMessage(), warning.getFile(), SourcePositionDTO.from(warning.getPosition()));
    }
}
