package dtos.diagnostics;

public record VerificationEventDTO(String phase, String uri, String trigger, String run, Long durationMs, String result) {}
