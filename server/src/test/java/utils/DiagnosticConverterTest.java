package utils;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import dtos.diagnostics.LJDiagnosticDTO;
import dtos.diagnostics.SourcePositionDTO;
import dtos.errors.*;
import dtos.warnings.*;
import liquidjava.diagnostics.TranslationTable;
import liquidjava.diagnostics.errors.*;
import liquidjava.diagnostics.warnings.*;
import liquidjava.processor.VCImplication;
import liquidjava.processor.context.PlacementInCode;
import liquidjava.rj_language.Predicate;
import liquidjava.rj_language.ast.LiteralBoolean;
import liquidjava.rj_language.opt.VCSimplificationResult;
import spoon.Launcher;
import spoon.reflect.cu.SourcePosition;
import spoon.reflect.declaration.CtField;

class DiagnosticConverterTest {
    @TempDir
    Path workspace;

    private CtField<?> field;
    private SourcePosition position;

    @BeforeEach
    void createSourcePosition() throws Exception {
        Path file = workspace.resolve("Example.java");
        Files.writeString(file, "class Example {\n    int value = 0;\n}\n");
        Launcher launcher = new Launcher();
        launcher.getEnvironment().setNoClasspath(true);
        launcher.addInputResource(file.toString());
        launcher.buildModel();
        field = launcher.getFactory().Class().get("Example").getField("value");
        position = field.getPosition();
    }

    @Test
    void preservesCommonDiagnosticFields() throws Exception {
        CustomError error = new CustomError("verification failed", position);
        error.setHint("check the refinement");
        LJDiagnosticDTO dto = (LJDiagnosticDTO) DiagnosticConverter.convertToDTO(error);
        assertEquals("error", dto.category);
        assertEquals("custom-error", dto.type);
        assertEquals("Error", dto.title);
        assertEquals("verification failed", dto.message);
        assertEquals("check the refinement", dto.hint);
        assertEquals(workspace.resolve("Example.java").toRealPath().toString(), dto.file);
        assertEquals(new SourcePositionDTO(dto.file, 1, 8, 1, 18), dto.position);
    }

    @Test
    void convertsIllegalConstructorTransitionToAnError() {
        LJDiagnosticDTO dto = (LJDiagnosticDTO) DiagnosticConverter.convertToDTO(
                new IllegalConstructorTransitionError(position));
        assertEquals("error", dto.category);
        assertEquals("illegal-constructor-transition-error", dto.type);
    }

    @Test
    void convertsCustomWarningWithoutTreatingItAsAnError() {
        LJDiagnosticDTO dto = (LJDiagnosticDTO) DiagnosticConverter.convertToDTO(new CustomWarning("custom warning"));
        assertEquals("warning", dto.category);
        assertEquals("custom-warning", dto.type);
        assertEquals("custom warning", dto.message);
    }

    @Test
    void preservesErrorSpecificDetails() {
        SyntaxErrorDTO syntax = (SyntaxErrorDTO) DiagnosticConverter.convertToDTO(new SyntaxError("invalid syntax", "_ >"));
        assertEquals("error", syntax.category);
        assertEquals("syntax-error", syntax.type);
        assertEquals("_ >", syntax.refinement);
        assertNull(syntax.file);
        assertNull(syntax.position);
        assertTrue(syntax.translationTable.isEmpty());

        InvalidRefinementErrorDTO invalid = (InvalidRefinementErrorDTO) DiagnosticConverter.convertToDTO(
                new InvalidRefinementError(position, "not boolean", "42"));
        assertEquals("error", invalid.category);
        assertEquals("invalid-refinement-error", invalid.type);
        assertEquals("42", invalid.refinement);

        NotFoundErrorDTO missing = (NotFoundErrorDTO) DiagnosticConverter.convertToDTO(
                new NotFoundError(position, "missing", NotFoundError.Kind.GHOST, List.of()));
        assertEquals("error", missing.category);
        assertEquals("not-found-error", missing.type);
        assertEquals("missing", missing.name);
        assertEquals("Ghost", missing.kind);

        StateConflictErrorDTO conflict = (StateConflictErrorDTO) DiagnosticConverter.convertToDTO(
                new StateConflictError(position, new LiteralBoolean(false), null));
        assertEquals("error", conflict.category);
        assertEquals("state-conflict-error", conflict.type);
        assertEquals("false", conflict.state);
    }

    @Test
    void preservesWarningSpecificDetailsAndOverloadHint() {
        ExternalClassNotFoundWarningDTO missingClass = (ExternalClassNotFoundWarningDTO) DiagnosticConverter.convertToDTO(
                new ExternalClassNotFoundWarning(position, "missing class", "example.External"));
        assertEquals("warning", missingClass.category);
        assertEquals("external-class-not-found-warning", missingClass.type);
        assertEquals("example.External", missingClass.className);

        ExternalMethodNotFoundWarningDTO missingMethod = (ExternalMethodNotFoundWarningDTO) DiagnosticConverter.convertToDTO(
                new ExternalMethodNotFoundWarning(position, "missing method", "run()", "example.External",
                        new String[] { "run(int)", "run(String)" }));
        assertEquals("warning", missingMethod.category);
        assertEquals("external-method-not-found-warning", missingMethod.type);
        assertEquals("run()", missingMethod.signature);
        assertEquals("example.External", missingMethod.className);
        assertArrayEquals(new String[] { "run(int)", "run(String)" }, missingMethod.overloads);
        assertEquals("Available overloads:\n  run(int)\n  run(String)", missingMethod.hint);

        UnsatisfiableRefinementWarningDTO unsatisfiable = (UnsatisfiableRefinementWarningDTO) DiagnosticConverter.convertToDTO(
                new UnsatisfiableRefinementWarning(position, "_ > 0 && _ < 0"));
        assertEquals("warning", unsatisfiable.category);
        assertEquals("unsatisfiable-refinement-warning", unsatisfiable.type);
        assertEquals("_ > 0 && _ < 0", unsatisfiable.refinement);
    }

    @Test
    void preservesRefinementDetailsAndSimplificationHistory() {
        VCSimplificationResult origin = new VCSimplificationResult(new VCImplication(new Predicate()));
        VCSimplificationResult found = new VCSimplificationResult(
                new VCImplication(new Predicate(new LiteralBoolean(false))), origin, "constant folding");
        RefinementErrorDTO dto = (RefinementErrorDTO) DiagnosticConverter.convertToDTO(
                new RefinementError(position, position, new Predicate(), found, null, null, "expected true"));
        assertEquals("error", dto.category);
        assertEquals("refinement-error", dto.type);
        assertEquals("true", dto.expected);
        assertEquals("expected true", dto.customMessage);
        assertEquals(dto.position, dto.declarationPosition);
        assertEquals("false", dto.found.implication().predicate());
        assertEquals("constant folding", dto.found.simplification());
        assertEquals("true", dto.found.origin().implication().predicate());
        assertNull(dto.found.origin().origin());
        assertNull(dto.found.origin().simplification());
        assertTrue(dto.counterexample.assignments().isEmpty());
    }

    @Test
    void preservesStateRefinementDetailsWithoutDeclarationFile() {
        StateRefinementErrorDTO dto = (StateRefinementErrorDTO) DiagnosticConverter.convertToDTO(
                new StateRefinementError(position, null, new Predicate(new LiteralBoolean(false)),
                        new VCSimplificationResult(new VCImplication(new Predicate())), null, "expected closed"));
        assertEquals("error", dto.category);
        assertEquals("state-refinement-error", dto.type);
        assertEquals("false", dto.expected);
        assertEquals("true", dto.found.implication().predicate());
        assertEquals("expected closed", dto.customMessage);
        assertNull(dto.declarationPosition);
        assertNull(dto.stateMachine);
    }

    @Test
    void convertsTranslationTablePlacementsAndDisplayNames() {
        TranslationTable table = new TranslationTable();
        table.put("#value_12", PlacementInCode.createPlacement(field));
        ArgumentMismatchErrorDTO dto = (ArgumentMismatchErrorDTO) DiagnosticConverter.convertToDTO(
                new ArgumentMismatchError("wrong arguments", position, table));
        assertEquals("error", dto.category);
        assertEquals("argument-mismatch-error", dto.type);
        assertEquals(1, dto.translationTable.size());
        assertFalse(dto.translationTable.containsKey("#value_12"));
        assertEquals("int value = 0;", dto.translationTable.get("value¹²").text());
        assertEquals(dto.position, dto.translationTable.get("value¹²").position());
    }
}
