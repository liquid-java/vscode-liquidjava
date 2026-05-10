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
    String targetClass,
    String returnRefinement,
    List<VariableDTO> parameters,
    List<StateRefinementDTO> stateRefinements,
    SourcePositionDTO position
) {
    public static MethodDTO from(RefinedFunction refinedFunction) {
        PlacementInCode placement = refinedFunction.getPlacementInCode();
        if (placement == null) return null;
        return new MethodDTO(
            refinedFunction.getName(),
            refinedFunction.getTargetClass(),
            format(refinedFunction.getRefReturn()),
            refinedFunction.getArguments().stream().map(VariableDTO::from).filter(v -> v != null).collect(Collectors.toList()),
            refinedFunction.getAllStates().stream().map(StateRefinementDTO::from).collect(Collectors.toList()),
            SourcePositionDTO.from(placement.getPosition())
        );
    }

    public record StateRefinementDTO(String from, String to) {
        public static StateRefinementDTO from(ObjectState state) {
            return new StateRefinementDTO(
                state.hasFrom() ? format(state.getFrom()) : null,
                state.hasTo() ? format(state.getTo()) : null
            );
        }
    }

    private static String format(Predicate predicate) {
        return predicate == null ? "" : ExpressionFormatter.format(predicate);
    }
}
