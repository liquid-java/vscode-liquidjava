package dtos.warnings;

import liquidjava.diagnostics.warnings.ExternalClassNotFoundWarning;

/**
 * DTO for serializing ExternalClassNotFoundWarning instances to JSON
 */
public class ExternalClassNotFoundWarningDTO extends LJWarningDTO {

    public final String className;

    public ExternalClassNotFoundWarningDTO(ExternalClassNotFoundWarning warning) {
        super("external-class-not-found-warning", warning);
        this.className = warning.getClassName();
    }

    public static ExternalClassNotFoundWarningDTO from(ExternalClassNotFoundWarning warning) {
        return new ExternalClassNotFoundWarningDTO(warning);
    }
}
