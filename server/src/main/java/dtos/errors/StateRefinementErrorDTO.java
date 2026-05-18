package dtos.errors;

import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.rj_language.opt.derivation_node.ValDerivationNode;

/**
 * DTO for serializing StateRefinementError instances to JSON
 */
public record StateRefinementErrorDTO(String category, String type, String title, String message, String file, SourcePositionDTO position,
        TranslationTableDTO translationTable, ValDerivationNode expected, ValDerivationNode found, String customMessage) {

    public static StateRefinementErrorDTO from(StateRefinementError error) {
        return new StateRefinementErrorDTO("error", "state-refinement-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourcePositionDTO.from(error.getPosition()), TranslationTableDTO.from(error.getTranslationTable()), error.getExpected(),
                error.getFound(), error.getCustomMessage());
    }
}
