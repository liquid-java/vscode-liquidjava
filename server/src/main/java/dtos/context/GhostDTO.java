package dtos.context;

import java.util.List;
import java.util.stream.Collectors;

import liquidjava.processor.context.GhostFunction;
import liquidjava.processor.context.GhostState;
import liquidjava.utils.constants.Formats;

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
    String stateSet,
    String file
) {
    public static GhostDTO from(GhostState ghostState) {
        GhostFunction set = ghostState.getParent();
        // a state of a set with a generated name, such as state1, is written as the state alone
        boolean isNamedSet = set != null && !set.getName().matches(Formats.STATE_SET_NAMES);

        return new GhostDTO(
            ghostState.getName(),
            ghostState.getQualifiedName(),
            ContextHistoryDTO.stringifyType(ghostState.getReturnType()),
            ghostState.getParametersTypes().stream().map(ContextHistoryDTO::stringifyType).collect(Collectors.toList()),
            ghostState.getRefinement() != null ? ghostState.getRefinement().toString() : null,
            set != null,
            isNamedSet ? set.getName() : null,
            ghostState.getFile()
        );
    }
}