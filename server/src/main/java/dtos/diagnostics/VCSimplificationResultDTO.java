package dtos.diagnostics;

import liquidjava.rj_language.opt.VCSimplificationResult;

/**
 * DTO for serializing a simplified VC and its complete predecessor states.
 */
public record VCSimplificationResultDTO(VCImplicationDTO implication, VCSimplificationResultDTO origin, String simplification) {

    public static VCSimplificationResultDTO from(VCSimplificationResult result) {
        if (result == null)
            return null;

        return new VCSimplificationResultDTO(
                VCImplicationDTO.from(result.getImplication()),
                from(result.getOrigin()),
                result.getSimplification()
        );
    }
}
