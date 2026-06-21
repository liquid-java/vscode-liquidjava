package dtos.diagnostics;

import liquidjava.rj_language.Predicate;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing refinement predicates.
 */
public record RefinementDTO(String predicate) {

    public static RefinementDTO from(Predicate refinement) {
        if (refinement == null)
            return null;

        return new RefinementDTO(ExpressionFormatter.format(refinement));
    }
}
