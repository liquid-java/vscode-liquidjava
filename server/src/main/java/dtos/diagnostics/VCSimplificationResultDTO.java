package dtos.diagnostics;

import liquidjava.rj_language.ast.formatter.DisplayNames;
import liquidjava.rj_language.opt.VCSimplificationResult;

/**
 * DTO for serializing a simplified VC and its complete predecessor states.
 */
public record VCSimplificationResultDTO(VCImplicationDTO implication, VCSimplificationResultDTO origin, String simplification) {

    public static VCSimplificationResultDTO from(VCSimplificationResult result, DisplayNames names) {
        if (result == null)
            return null;

        return new VCSimplificationResultDTO(
                VCImplicationDTO.from(result.getImplication(), names),
                from(result.getOrigin(), names),
                result.getSimplification()
        );
    }
}
