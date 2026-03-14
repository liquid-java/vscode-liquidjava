package dtos.errors;

import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.TranslationTableDTO;
import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.rj_language.opt.derivation_node.ValDerivationNode;

/**
 * DTO for serializing RefinementError instances to JSON
 */
public record RefinementErrorDTO(String category, String type, String title, String message, String file, SourcePositionDTO position,
        TranslationTableDTO translationTable, ValDerivationNode expected, ValDerivationNode found, String customMessage, String counterexample) {

    public static RefinementErrorDTO from(RefinementError error) {
        return new RefinementErrorDTO("error", "refinement-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourcePositionDTO.from(error.getPosition()), TranslationTableDTO.from(error.getTranslationTable()), error.getExpected(), error.getFound(), error.getCustomMessage(), error.getCounterExampleString());
    }
}
