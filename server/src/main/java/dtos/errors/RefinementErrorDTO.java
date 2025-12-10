package dtos.errors;

import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.ErrorPosition;
import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.rj_language.opt.derivation_node.ValDerivationNode;

/**
 * DTO for serializing RefinementError instances to JSON
 */
public record RefinementErrorDTO(String category, String type, String title, String message, String file, ErrorPosition position,
        TranslationTableDTO translationTable, ValDerivationNode expected, ValDerivationNode found) {

    public static RefinementErrorDTO from(RefinementError error) {
        return new RefinementErrorDTO("error", "refinement-error", error.getTitle(), error.getMessage(), error.getFile(),
                error.getPosition(), TranslationTableDTO.from(error.getTranslationTable()), error.getExpected(), error.getFound());
    }
}
