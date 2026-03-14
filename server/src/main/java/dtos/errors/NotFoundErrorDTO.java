package dtos.errors;

import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.errors.NotFoundError;

/**
 * DTO for serializing NotFoundError instances to JSON
 */
public record NotFoundErrorDTO(String category, String type, String title, String message, String file, SourcePositionDTO position,
        TranslationTableDTO translationTable, String name, String kind) {

    public static NotFoundErrorDTO from(NotFoundError error) {
        return new NotFoundErrorDTO("error", "not-found-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourcePositionDTO.from(error.getPosition()), TranslationTableDTO.from(error.getTranslationTable()), error.getName(), error.getKind());
    }
}
