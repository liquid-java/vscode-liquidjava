package dtos.errors;

import dtos.diagnostics.SourceRangeDTO;
import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.errors.StateConflictError;

/**
 * DTO for serializing StateConflictError instances to JSON
 */
public record StateConflictErrorDTO(String category, String type, String title, String message, String file, SourceRangeDTO position,
        TranslationTableDTO translationTable, String state) {

    public static StateConflictErrorDTO from(StateConflictError error) {
        return new StateConflictErrorDTO("error", "state-conflict-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourceRangeDTO.from(error.getPosition()), TranslationTableDTO.from(error.getTranslationTable()), error.getState());
    }
}
