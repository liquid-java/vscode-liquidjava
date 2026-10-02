package utils;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.io.TempDir;

import dtos.diagnostics.LJDiagnosticDTO;
import dtos.diagnostics.SourcePositionDTO;
import dtos.errors.*;
import dtos.warnings.*;
import liquidjava.diagnostics.LJDiagnostic;
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

    @TestFactory
    Stream<DynamicTest> routesEachDiagnosticToItsClientCategoryAndType() {
        Predicate expected = new Predicate(new LiteralBoolean(false));
        VCSimplificationResult found = new VCSimplificationResult(new VCImplication(new Predicate()));
        record Case(LJDiagnostic diagnostic, Class<? extends LJDiagnosticDTO> dto, String category, String type) {}
        return Stream.of(
                new Case(new RefinementError(position, null, expected, found, null, null, "must be false"),
                        RefinementErrorDTO.class, "error", "refinement-error"),
                new Case(new StateRefinementError(position, null, expected, found, null, "must be closed"),
                        StateRefinementErrorDTO.class, "error", "state-refinement-error"),
                new Case(new SyntaxError("invalid syntax", position, "_ >"), SyntaxErrorDTO.class, "error", "syntax-error"),
                new Case(new CustomError("custom error", position), CustomErrorDTO.class, "error", "custom-error"),
                new Case(new InvalidRefinementError(position, "not boolean", "42"), InvalidRefinementErrorDTO.class,
                        "error", "invalid-refinement-error"),
                new Case(new StateConflictError(position, new LiteralBoolean(false), null), StateConflictErrorDTO.class,
                        "error", "state-conflict-error"),
                new Case(new NotFoundError(position, "missing", NotFoundError.Kind.VARIABLE, List.of()),
                        NotFoundErrorDTO.class, "error", "not-found-error"),
                new Case(new IllegalConstructorTransitionError(position), IllegalConstructorTransitionErrorDTO.class,
                        "error", "illegal-constructor-transition-error"),
                new Case(new ArgumentMismatchError("wrong arguments", position, null), ArgumentMismatchErrorDTO.class,
                        "error", "argument-mismatch-error"),
                new Case(new ExternalClassNotFoundWarning(position, "missing class", "example.External"),
                        ExternalClassNotFoundWarningDTO.class, "warning", "external-class-not-found-warning"),
                new Case(new ExternalMethodNotFoundWarning(position, "missing method", "run()", "example.External",
                        new String[] { "run(int)" }), ExternalMethodNotFoundWarningDTO.class, "warning",
                        "external-method-not-found-warning"),
                new Case(new UnsatisfiableRefinementWarning(position, "_ > 0 && _ < 0"),
                        UnsatisfiableRefinementWarningDTO.class, "warning", "unsatisfiable-refinement-warning"),
                new Case(new CustomWarning(position, "custom warning"), CustomWarningDTO.class, "warning", "custom-warning"),
                new Case(new LJError("generic error", "details", position, null) {}, LJErrorDTO.class, "error", null),
                new Case(new LJWarning("generic warning", position) {}, LJWarningDTO.class, "warning", null),
                new Case(new LJDiagnostic("generic diagnostic", "details", position, "", null), LJDiagnosticDTO.class,
                        null, null))
                .map(test -> DynamicTest.dynamicTest(test.dto().getSimpleName(), () -> {
                    test.diagnostic().setHint("check the refinement");
                    LJDiagnosticDTO dto = assertInstanceOf(test.dto(), DiagnosticConverter.convertToDTO(test.diagnostic()));
                    assertEquals(test.dto(), dto.getClass());
                    assertEquals(test.category(), dto.category);
                    assertEquals(test.type(), dto.type);
                    assertEquals(test.diagnostic().getTitle(), dto.title);
                    assertEquals(test.diagnostic().getMessage(), dto.message);
                    assertEquals(test.diagnostic().getHint(), dto.hint);
                    assertEquals(workspace.resolve("Example.java").toRealPath().toString(), dto.file);
                    assertEquals(new SourcePositionDTO(dto.file, 1, 8, 1, 18), dto.position);
                }));
    }

    @Test
    void preservesErrorSpecificDetails() {
        SyntaxErrorDTO syntax = (SyntaxErrorDTO) DiagnosticConverter.convertToDTO(new SyntaxError("invalid syntax", "_ >"));
        assertEquals("_ >", syntax.refinement);
        assertNull(syntax.file);
        assertNull(syntax.position);
        assertTrue(syntax.translationTable.isEmpty());

        InvalidRefinementErrorDTO invalid = (InvalidRefinementErrorDTO) DiagnosticConverter.convertToDTO(
                new InvalidRefinementError(position, "not boolean", "42"));
        assertEquals("42", invalid.refinement);

        NotFoundErrorDTO missing = (NotFoundErrorDTO) DiagnosticConverter.convertToDTO(
                new NotFoundError(position, "missing", NotFoundError.Kind.GHOST, List.of()));
        assertEquals("missing", missing.name);
        assertEquals("Ghost", missing.kind);

        StateConflictErrorDTO conflict = (StateConflictErrorDTO) DiagnosticConverter.convertToDTO(
                new StateConflictError(position, new LiteralBoolean(false), null));
        assertEquals("false", conflict.state);
    }

    @Test
    void preservesWarningSpecificDetailsAndOverloadHint() {
        ExternalClassNotFoundWarningDTO missingClass = (ExternalClassNotFoundWarningDTO) DiagnosticConverter.convertToDTO(
                new ExternalClassNotFoundWarning(position, "missing class", "example.External"));
        assertEquals("example.External", missingClass.className);

        ExternalMethodNotFoundWarningDTO missingMethod = (ExternalMethodNotFoundWarningDTO) DiagnosticConverter.convertToDTO(
                new ExternalMethodNotFoundWarning(position, "missing method", "run()", "example.External",
                        new String[] { "run(int)", "run(String)" }));
        assertEquals("run()", missingMethod.signature);
        assertEquals("example.External", missingMethod.className);
        assertArrayEquals(new String[] { "run(int)", "run(String)" }, missingMethod.overloads);
        assertEquals("Available overloads:\n  run(int)\n  run(String)", missingMethod.hint);

        UnsatisfiableRefinementWarningDTO unsatisfiable = (UnsatisfiableRefinementWarningDTO) DiagnosticConverter.convertToDTO(
                new UnsatisfiableRefinementWarning(position, "_ > 0 && _ < 0"));
        assertEquals("_ > 0 && _ < 0", unsatisfiable.refinement);
    }

    @Test
    void preservesRefinementDetailsAndSimplificationHistory() {
        VCSimplificationResult origin = new VCSimplificationResult(new VCImplication(new Predicate()));
        VCSimplificationResult found = new VCSimplificationResult(
                new VCImplication(new Predicate(new LiteralBoolean(false))), origin, "constant folding");
        RefinementErrorDTO dto = (RefinementErrorDTO) DiagnosticConverter.convertToDTO(
                new RefinementError(position, position, new Predicate(), found, null, null, "expected true"));
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
        assertEquals(1, dto.translationTable.size());
        assertFalse(dto.translationTable.containsKey("#value_12"));
        assertEquals("int value = 0;", dto.translationTable.get("value¹²").text());
        assertEquals(dto.position, dto.translationTable.get("value¹²").position());
    }
}
