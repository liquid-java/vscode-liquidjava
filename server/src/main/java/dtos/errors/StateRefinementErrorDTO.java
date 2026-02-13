package dtos.errors;

import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.ErrorPosition;
import liquidjava.diagnostics.errors.StateRefinementError;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public record StateRefinementErrorDTO(String category, String type, String title, String message, String file, ErrorPosition position,
        TranslationTableDTO translationTable, String expected, String found, String customMessage) {

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO("error", "state-refinement-error", error.getTitle(), error.getMessage(), error.getFile(),
                error.getPosition(), TranslationTableDTO.from(error.getTranslationTable()), error.getExpected(),
                error.getFound(), error.getCustomMessage());
    }
}
