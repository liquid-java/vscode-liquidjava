package dtos.warnings;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.warnings.ExternalMethodNotFoundWarning;

/**
 * DTO for serializing ExternalMethodNotFoundWarning instances to JSON
 */
public record ExternalMethodNotFoundWarningDTO(String category, String type, String title, String message, String file,
        SourcePositionDTO position, String methodName, String className, String[] overloads) {

    public static ExternalMethodNotFoundWarningDTO from(ExternalMethodNotFoundWarning warning) {
        return new ExternalMethodNotFoundWarningDTO("warning", "external-method-not-found-warning", warning.getTitle(), warning.getMessage(), warning.getFile(),
                SourcePositionDTO.from(warning.getPosition()), warning.getMethodName(), warning.getClassName(), warning.getOverloads());
    }
}
