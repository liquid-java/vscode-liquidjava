package dtos.warnings;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.warnings.CustomWarning;

/**
 * DTO for serializing CustomError instances to JSON
 */
public record CustomWarningDTO(String category, String type, String title, String message, String file, SourcePositionDTO position) {

    public static CustomWarningDTO from(CustomWarning warning) {
        return new CustomWarningDTO("warning", "custom-warning", warning.getTitle(), warning.getMessage(), warning.getFile(),
                SourcePositionDTO.from(warning.getPosition()));
    }
}
