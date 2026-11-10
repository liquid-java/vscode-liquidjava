package dtos.errors;

import java.util.List;

import dtos.diagnostics.CounterexampleDTO;
import dtos.diagnostics.SourcePositionDTO;
import dtos.diagnostics.VCSimplificationResultDTO;
import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.rj_language.ast.formatter.ExpressionFormatter;

/**
 * DTO for serializing RefinementError instances to JSON
 */
public class RefinementErrorDTO extends LJErrorDTO {

    public final String expected;
    public final VCSimplificationResultDTO found;
    public final String customMessage;
    public final CounterexampleDTO counterexample;
    public final SourcePositionDTO declarationPosition;
    /** Where each part of the refinement is declared, the first being declarationPosition */
    public final List<SourcePositionDTO> declarationPositions;
    /** Lines that explain the declaration, such as what the states it names mean */
    public final List<String> declarationNotes;

    public RefinementErrorDTO(RefinementError error) {
        super("refinement-error", error);
        this.expected = error.getExpected() == null ? null : ExpressionFormatter.format(error.getExpected());
        this.found = VCSimplificationResultDTO.from(error.getFound());
        this.customMessage = error.getCustomMessage();
        this.counterexample = CounterexampleDTO.from(error.getCounterexample());
        this.declarationPosition = SourcePositionDTO.from(error.getDeclarationPosition());
        this.declarationPositions = error.getDeclarationPositions().stream().map(SourcePositionDTO::from).toList();
        this.declarationNotes = error.getDeclarationNotes();
    }

    public static RefinementErrorDTO from(RefinementError error) {
        return new RefinementErrorDTO(error);
    }
}
