package dtos.context;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.PlacementInCode;
import liquidjava.processor.context.RefinedVariable;

/**
 * DTO for serializing RefinedVariable instances to JSON.
 */
public record VariableDTO(
    String name,
    String type,
    String refinement,
    String mainRefinement,
    SourcePositionDTO position,
    SourcePositionDTO annotationPosition
) {
    public static VariableDTO from(RefinedVariable refinedVariable) {
        PlacementInCode placement = refinedVariable.getPlacementInCode();
        if (placement == null) return null;
        return new VariableDTO(
            refinedVariable.getName(),
            ContextHistoryDTO.stringifyType(refinedVariable.getType()),
            refinedVariable.getRefinement().toString(),
            refinedVariable.getMainRefinement().toString(),
            SourcePositionDTO.from(placement.getPosition()),
            SourcePositionDTO.from(placement.getAnnotationPosition())
        );
    }
}