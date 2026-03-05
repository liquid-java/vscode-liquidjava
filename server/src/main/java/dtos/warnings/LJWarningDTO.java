package dtos.warnings;

import dtos.diagnostics.SourceRangeDTO;
import liquidjava.diagnostics.warnings.LJWarning;

/**
 * DTO for serializing LJWarning instances to JSON
 */
public record LJWarningDTO(String title, String message, String file, SourceRangeDTO position) {

    public static LJWarningDTO from(LJWarning warning) {
        return new LJWarningDTO(warning.getTitle(), warning.getMessage(), warning.getFile(), SourceRangeDTO.from(warning.getPosition()));
    }
}
