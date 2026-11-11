package dtos.diagnostics;

import liquidjava.processor.VCImplication;
import liquidjava.rj_language.ast.formatter.DisplayNames;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;
import liquidjava.utils.Utils;

/**
 * DTO for serializing a complete VC implication chain.
 */
public record VCImplicationDTO(String name, String type, String predicate, VCImplicationDTO next) {

    public static VCImplicationDTO from(VCImplication implication, DisplayNames names) {
        if (implication == null)
            return null;

        String name = null;
        String type = null;
        if (implication.hasBinder()) {
            name = names.get(implication.getName());
            type = Utils.getSimpleName(implication.getType().getQualifiedName());
        }
        return new VCImplicationDTO(
                name,
                type,
                ExpressionFormatter.format(implication.getRefinement().getExpression(), names),
                from(implication.getNext(), names));
    }
}
