package dtos.context;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.PlacementInCode;
import liquidjava.processor.context.RefinedVariable;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;
import liquidjava.rj_language.ast.formatter.VariableFormatter;

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
            VariableFormatter.format(refinedVariable.getName()),
            refinedVariable.getName(),
            ContextHistoryDTO.stringifyType(refinedVariable.getType()),
            ExpressionFormatter.format(refinedVariable.getRefinement()),
            ExpressionFormatter.format(refinedVariable.getMainRefinement()),
            SourcePositionDTO.from(placement.getPosition()),
            SourcePositionDTO.from(placement.getAnnotationPosition())
        );
    }
}