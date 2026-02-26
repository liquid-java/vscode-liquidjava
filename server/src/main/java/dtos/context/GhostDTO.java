package dtos.context;

import java.util.List;
import java.util.stream.Collectors;

import liquidjava.processor.context.GhostState;

/**
 * DTO for serializing GhostState instances to JSON.
 */
public record GhostDTO(
    String name,
    String qualifiedName,
    String returnType,
    List<String> parameterTypes,
    String refinement
) {
    public static GhostDTO from(GhostState ghostState) {
        return new GhostDTO(
            ghostState.getName(),
            ghostState.getQualifiedName(),
            ContextHistoryDTO.stringifyType(ghostState.getReturnType()),
            ghostState.getParametersTypes().stream().map(ContextHistoryDTO::stringifyType).collect(Collectors.toList()),
            ghostState.getRefinement() != null ? ghostState.getRefinement().toString() : null
        );
    }
}