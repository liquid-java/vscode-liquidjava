package dtos.context;

import dtos.diagnostics.PlacementInCodeDTO;
import liquidjava.processor.context.RefinedVariable;

/**
 * DTO for serializing RefinedVariable instances to JSON.
 */
public record VariableDTO(
    String name,
    String type,
    String refinement,
    String mainRefinement,
    PlacementInCodeDTO placementInCode,
    boolean isParameter
) {
    public static VariableDTO from(RefinedVariable refinedVariable) {
        return new VariableDTO(
            refinedVariable.getName(),
            ContextHistoryDTO.stringifyType(refinedVariable.getType()),
            refinedVariable.getRefinement().toString(),
            refinedVariable.getMainRefinement().toString(),
            PlacementInCodeDTO.from(refinedVariable.getPlacementInCode()),
            refinedVariable.isParameter()
        );
    }
}