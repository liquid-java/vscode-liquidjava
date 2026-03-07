package dtos.warnings;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.warnings.ExternalClassNotFoundWarning;

/**
 * DTO for serializing ExternalClassNotFoundWarning instances to JSON
 */
public record ExternalClassNotFoundWarningDTO(String category, String type, String title, String message, String file,
        SourcePositionDTO position, String className) {

    public static ExternalClassNotFoundWarningDTO from(ExternalClassNotFoundWarning warning) {
        return new ExternalClassNotFoundWarningDTO("warning", "external-class-not-found-warning", warning.getTitle(), warning.getMessage(), warning.getFile(),
                SourcePositionDTO.from(warning.getPosition()), warning.getClassName());
    }
}
