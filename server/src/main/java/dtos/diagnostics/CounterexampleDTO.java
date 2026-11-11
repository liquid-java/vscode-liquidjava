package dtos.diagnostics;

import java.util.List;

import liquidjava.rj_language.ast.formatter.DisplayNames;
import liquidjava.smt.Counterexample;

/**
 * DTO for serializing counterexample assignments.
 */
public record CounterexampleDTO(List<AssignmentDTO> assignments) {

    public static CounterexampleDTO from(Counterexample counterexample, DisplayNames names) {
        if (counterexample == null)
            return null;

        List<AssignmentDTO> assignments = counterexample.assignments().stream()
                .map(assignment -> new AssignmentDTO(
                        names.get(assignment.first()),
                        assignment.second()))
                .toList();
        return new CounterexampleDTO(assignments);
    }

    public record AssignmentDTO(String variable, String value) {
    }
}
