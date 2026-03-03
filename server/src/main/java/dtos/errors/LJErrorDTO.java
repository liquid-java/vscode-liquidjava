package dtos.errors;

import dtos.diagnostics.SourceRangeDTO;
import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.errors.LJError;

/**
 * DTO for serializing LJError instances to JSON
 */
public record LJErrorDTO(String title, String message, String file, SourceRangeDTO position,
        TranslationTableDTO translationTable) {

    public static LJErrorDTO from(LJError error) {
        return new LJErrorDTO(error.getTitle(), error.getMessage(), error.getFile(),
                SourceRangeDTO.from(error.getPosition()), TranslationTableDTO.from(error.getTranslationTable()));
    }
}
