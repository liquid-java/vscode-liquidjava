package dtos.warnings;

import liquidjava.diagnostics.warnings.CustomWarning;

/**
 * DTO for serializing CustomError instances to JSON
 */
public class CustomWarningDTO extends LJWarningDTO {

    public CustomWarningDTO(CustomWarning warning) {
        super("custom-warning", warning);
    }

    public static CustomWarningDTO from(CustomWarning warning) {
        return new CustomWarningDTO(warning);
    }
}
