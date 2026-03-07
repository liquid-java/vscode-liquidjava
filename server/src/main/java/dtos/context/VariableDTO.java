package dtos.context;

import dtos.diagnostics.SourcePositionDTO;
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
    boolean isParameter,
    SourcePositionDTO annPosition,
    String failingRefinement
) {
    public static VariableDTO from(RefinedVariable refinedVariable) {
        return new VariableDTO(
            refinedVariable.getName(),
            ContextHistoryDTO.stringifyType(refinedVariable.getType()),
            refinedVariable.getRefinement().toString(),
            refinedVariable.getMainRefinement().toString(),
            SourcePositionDTO.from(refinedVariable.getPlacementInCode().getPosition()),
            refinedVariable.isParameter(),
            SourcePositionDTO.from(refinedVariable.getAnnPosition()),
            refinedVariable.getFailingRefinement() != null ? refinedVariable.getFailingRefinement().toString() : null
        );
    }
}