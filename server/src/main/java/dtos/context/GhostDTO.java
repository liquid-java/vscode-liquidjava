package dtos.context;

import java.util.List;
import java.util.regex.Pattern;
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
    String refinement,
    boolean isState,
    String file
) {
    private static final Pattern STATE_REFINEMENT_PATTERN = Pattern.compile("^state\\d+\\(_\\) == \\d+$");

    public static GhostDTO from(GhostState ghostState) {
        String refinement = ghostState.getRefinement() != null ? ghostState.getRefinement().toString() : null;
        boolean isState = refinement != null && STATE_REFINEMENT_PATTERN.matcher(refinement).matches();

        return new GhostDTO(
            ghostState.getName(),
            ghostState.getQualifiedName(),
            ContextHistoryDTO.stringifyType(ghostState.getReturnType()),
            ghostState.getParametersTypes().stream().map(ContextHistoryDTO::stringifyType).collect(Collectors.toList()),
            refinement,
            isState,
            ghostState.getFile()
        );
    }
}