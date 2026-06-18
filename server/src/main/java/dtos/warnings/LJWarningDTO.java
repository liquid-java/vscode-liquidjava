package dtos.warnings;

import dtos.diagnostics.LJDiagnosticDTO;
import liquidjava.diagnostics.warnings.LJWarning;

/**
 * DTO for serializing LJWarning instances to JSON
 */
public class LJWarningDTO extends LJDiagnosticDTO {

    public LJWarningDTO(String type, LJWarning warning) {
        super("warning", type, warning);
    }

    protected LJWarningDTO(String category, String type, LJWarning warning) {
        super(category, type, warning);
    }

    public static LJWarningDTO from(LJWarning warning) {
        return new LJWarningDTO(null, warning);
    }
}
