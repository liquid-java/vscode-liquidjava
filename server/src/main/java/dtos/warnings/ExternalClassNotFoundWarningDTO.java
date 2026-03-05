package dtos.warnings;

import dtos.diagnostics.SourceRangeDTO;
import liquidjava.diagnostics.warnings.ExternalClassNotFoundWarning;

/**
 * DTO for serializing ExternalClassNotFoundWarning instances to JSON
 */
public record ExternalClassNotFoundWarningDTO(String category, String type, String title, String message, String file,
        SourceRangeDTO position, String className) {

    public static ExternalClassNotFoundWarningDTO from(ExternalClassNotFoundWarning warning) {
        return new ExternalClassNotFoundWarningDTO("warning", "external-class-not-found-warning", warning.getTitle(), warning.getMessage(), warning.getFile(),
                SourceRangeDTO.from(warning.getPosition()), warning.getClassName());
    }
}
