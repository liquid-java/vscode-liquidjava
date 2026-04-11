package dtos.context;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.PlacementInCode;
import liquidjava.processor.context.RefinedVariable;
import liquidjava.utils.VariableFormatter;

/**
 * DTO for serializing RefinedVariable instances to JSON.
 */
public record VariableDTO(
    String name,
    String internalName,
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
            VariableFormatter.formatVariable(refinedVariable.getName()),
            refinedVariable.getName(),
            ContextHistoryDTO.stringifyType(refinedVariable.getType()),
            VariableFormatter.formatText(refinedVariable.getRefinement().toString()),
            VariableFormatter.formatText(refinedVariable.getMainRefinement().toString()),
            SourcePositionDTO.from(placement.getPosition()),
            SourcePositionDTO.from(placement.getAnnotationPosition())
        );
    }
}