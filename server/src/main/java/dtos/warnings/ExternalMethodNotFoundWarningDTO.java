package dtos.warnings;

import liquidjava.diagnostics.warnings.ExternalMethodNotFoundWarning;

/**
 * DTO for serializing ExternalMethodNotFoundWarning instances to JSON
 */
public class ExternalMethodNotFoundWarningDTO extends LJWarningDTO {

    public final String signature;
    public final String className;
    public final String[] overloads;

    public ExternalMethodNotFoundWarningDTO(ExternalMethodNotFoundWarning warning) {
        super("external-method-not-found-warning", warning);
        this.signature = warning.getSignature();
        this.className = warning.getClassName();
        this.overloads = warning.getOverloads();
    }

    public static ExternalMethodNotFoundWarningDTO from(ExternalMethodNotFoundWarning warning) {
        return new ExternalMethodNotFoundWarningDTO(warning);
    }
}
