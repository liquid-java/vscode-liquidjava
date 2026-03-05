package dtos.warnings;

import dtos.diagnostics.SourceRangeDTO;
import liquidjava.diagnostics.warnings.CustomWarning;

/**
 * DTO for serializing CustomError instances to JSON
 */
public record CustomWarningDTO(String category, String type, String title, String message, String file, SourceRangeDTO position) {

    public static CustomWarningDTO from(CustomWarning warning) {
        return new CustomWarningDTO("warning", "custom-warning", warning.getTitle(), warning.getMessage(), warning.getFile(),
                SourceRangeDTO.from(warning.getPosition()));
    }
}
