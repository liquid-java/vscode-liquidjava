package dtos.diagnostics;

import liquidjava.processor.VCImplication;
import liquidjava.rj_language.ast.formatter.VariableFormatter;
import liquidjava.utils.Utils;

/**
 * DTO for serializing the binder part of a VC implication node.
 */
public record VCBinderDTO(String name, String type) {

    public static VCBinderDTO from(VCImplication implication) {
        if (implication == null || !implication.hasBinder())
            return null;

        String qualifiedType = implication.getType().getQualifiedName();
        String simpleType = qualifiedType.contains(".") ? Utils.getSimpleName(qualifiedType) : qualifiedType;
        return new VCBinderDTO(VariableFormatter.format(implication.getName()), simpleType);
    }
}
