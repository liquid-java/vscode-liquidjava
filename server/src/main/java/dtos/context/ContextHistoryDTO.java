package dtos.context;

import java.util.List;
import java.util.Map;

import spoon.reflect.reference.CtTypeReference;

/**
 * DTO for serializing ContextHistory instances to JSON.
 */
public record ContextHistoryDTO(
    Map<String, Map<String, List<VariableDTO>>> vars,
    List<VariableDTO> instanceVars,
    List<VariableDTO> globalVars,
    Map<String, List<GhostDTO>> ghosts,
    List<AliasDTO> aliases
) {
    public static String stringifyType(CtTypeReference<?> typeReference) {
        if (typeReference == null)
            return "";
        String qualifiedName = typeReference.getQualifiedName();
        return qualifiedName == null || qualifiedName.isBlank() ? typeReference.toString() : qualifiedName;
    }
}
