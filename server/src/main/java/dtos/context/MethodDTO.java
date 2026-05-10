package dtos.context;

import java.util.List;
import java.util.stream.Collectors;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.ObjectState;
import liquidjava.processor.context.PlacementInCode;
import liquidjava.processor.context.RefinedFunction;
import liquidjava.rj_language.Predicate;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing RefinedFunction instances to JSON.
 */
public record MethodDTO(
    String name,
    String signature,
    String targetClass,
    String returnType,
    String returnRefinement,
    List<VariableDTO> parameters,
    List<StateRefinementDTO> stateRefinements,
    SourcePositionDTO position,
    SourcePositionDTO annotationPosition
) {
    public static MethodDTO from(RefinedFunction refinedFunction) {
        PlacementInCode placement = refinedFunction.getPlacementInCode();
        if (placement == null) return null;
        return new MethodDTO(
            refinedFunction.getName(),
            refinedFunction.getSignature(),
            refinedFunction.getTargetClass(),
            ContextHistoryDTO.stringifyType(refinedFunction.getType()),
            format(refinedFunction.getRefReturn()),
            refinedFunction.getArguments().stream().map(VariableDTO::from).filter(v -> v != null).collect(Collectors.toList()),
            refinedFunction.getAllStates().stream().map(StateRefinementDTO::from).collect(Collectors.toList()),
            SourcePositionDTO.from(placement.getPosition()),
            SourcePositionDTO.from(placement.getAnnotationPosition())
        );
    }

    public record StateRefinementDTO(String from, String to, String message) {
        public static StateRefinementDTO from(ObjectState state) {
            return new StateRefinementDTO(
                state.hasFrom() ? format(state.getFrom()) : null,
                state.hasTo() ? format(state.getTo()) : null,
                state.getMessage()
            );
        }
    }

    private static String format(Predicate predicate) {
        return predicate == null ? "" : ExpressionFormatter.format(predicate);
    }
}
