package dtos.diagnostics;

import java.util.List;
import java.util.Locale;

import liquidjava.diagnostics.hints.Hint;

/**
 * DTO for serializing a hint of a diagnostic, so clients can show each hint separately
 *
 * @param kind what the hint is about, e.g. {@code call-sequence} for calls that bring the object to a state that allows
 *             the failing call
 * @param message the hint as shown to the user
 */
public record HintDTO(String kind, String message) {

    public static HintDTO from(Hint hint) {
        return new HintDTO(hint.kind().name().toLowerCase(Locale.ROOT).replace('_', '-'), hint.message());
    }

    public static List<HintDTO> from(List<Hint> hints) {
        return hints.stream().map(HintDTO::from).toList();
    }
}
