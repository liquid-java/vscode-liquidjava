import { describe, expect, it } from "vitest";
import { formatPlainMessage } from "./message-markdown";

describe("formatPlainMessage", () => {
    it("formats found and expected as code, Expected first", () => {
        expect(formatPlainMessage("State Refinement Error: found empty(kettle) but expected filled(kettle)"))
            .toBe("**Expected** `filled(kettle)`\n\n**Found** `empty(kettle)`");
    });
    it("keeps a found with a but inside it whole", () => {
        expect(formatPlainMessage("Refinement Error: found a > 0 && b == 1 but expected a > 0 && b > 1"))
            .toBe("**Expected** `a > 0 && b > 1`\n\n**Found** `a > 0 && b == 1`");
    });
    it("says what is known when nothing proves the expectation", () => {
        expect(formatPlainMessage("Refinement Error: expected timeout >= 0 but could not prove it"))
            .toBe("**Expected** `timeout >= 0`\n\n**Found** nothing here that proves it");
    });
    it("leaves other messages alone", () => {
        expect(formatPlainMessage("Refinement Error")).toBeNull();
        expect(formatPlainMessage("Java: cannot find symbol")).toBeNull();
    });
});
