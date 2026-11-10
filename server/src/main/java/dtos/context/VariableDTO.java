package dtos.context;

import java.util.function.Function;
import java.util.function.UnaryOperator;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.processor.context.PlacementInCode;
import liquidjava.processor.context.RefinedVariable;
import liquidjava.rj_language.Predicate;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;
import liquidjava.rj_language.ast.formatter.VariableFormatter;

/**
 * DTO for serializing RefinedVariable instances to JSON.
 */
public record VariableDTO(
    String name,
    String displayName,
    String internalName,
    String type,
    String refinement,
    String mainRefinement,
    SourcePositionDTO position,
    SourcePositionDTO annotationPosition
) {
    /** A variable on its own, such as a method parameter */
    public static VariableDTO from(RefinedVariable refinedVariable) {
        return from(refinedVariable, VariableFormatter::format, ExpressionFormatter::format);
    }

    /** A variable of a context, shown as the context shows it */
    public static VariableDTO from(RefinedVariable refinedVariable, ContextDisplay display) {
        return from(refinedVariable, display::name, display::format);
    }

    private static VariableDTO from(RefinedVariable refinedVariable, UnaryOperator<String> displayName,
            Function<Predicate, String> format) {
        PlacementInCode placement = refinedVariable.getPlacementInCode();
        if (placement == null) return null;
        return new VariableDTO(
            VariableFormatter.format(refinedVariable.getName()),
            displayName.apply(refinedVariable.getName()),
            refinedVariable.getName(),
            ContextHistoryDTO.stringifyType(refinedVariable.getType()),
            format.apply(refinedVariable.getRefinement()),
            format.apply(refinedVariable.getMainRefinement()),
            SourcePositionDTO.from(placement.getPosition()),
            SourcePositionDTO.from(placement.getAnnotationPosition())
        );
    }
}