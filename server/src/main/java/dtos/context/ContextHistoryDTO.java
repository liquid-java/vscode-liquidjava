package dtos.context;

import java.util.List;
import java.util.Map;

import dtos.diagnostics.SourcePositionDTO;
import spoon.reflect.reference.CtTypeReference;

/**
 * DTO for serializing ContextHistory instances to JSON.
 */
public record ContextHistoryDTO(
    List<VariableDTO> localVars,
    List<VariableDTO> globalVars,
    List<GhostDTO> ghosts,
    List<AliasDTO> aliases,
    List<MethodDTO> methods,
    Map<String, List<SourcePositionDTO>> fileScopes
) {
    public static String stringifyType(CtTypeReference<?> typeReference) {
        if (typeReference == null)
            return "";
        String qualifiedName = typeReference.getQualifiedName();
        return qualifiedName == null || qualifiedName.isBlank() ? typeReference.toString() : qualifiedName;
    }
}
