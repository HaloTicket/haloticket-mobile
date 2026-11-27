import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPasswordRules, isPasswordValid } from "../src/utils/passwordRules.ts";

describe("passwordRules", () => {
  it("accepts a password meeting all four web requirements", () => {
    const rules = getPasswordRules("HaloTicket@2026");
    assert.deepEqual(rules, {
      hasValidLength: true,
      hasLowercaseAndNumber: true,
      hasSpecialCharacter: true,
      hasUppercase: true,
    });
    assert.equal(isPasswordValid("HaloTicket@2026"), true);
  });

  it("rejects passwords shorter than 8 or longer than 32 characters", () => {
    assert.equal(getPasswordRules("Ab1!567").hasValidLength, false);
    assert.equal(isPasswordValid("Ab1!567"), false);
    assert.equal(getPasswordRules("Ab1!" + "a".repeat(29)).hasValidLength, false);
    assert.equal(isPasswordValid("Ab1!" + "a".repeat(29)), false);
  });

  it("rejects missing lowercase, digit, uppercase, or special character", () => {
    assert.equal(getPasswordRules("ABCDEFG1!").hasLowercaseAndNumber, false);
    assert.equal(getPasswordRules("Abcdefgh!").hasLowercaseAndNumber, false);
    assert.equal(getPasswordRules("abcdefgh1!").hasUppercase, false);
    assert.equal(getPasswordRules("Abcdefgh1").hasSpecialCharacter, false);
    assert.equal(isPasswordValid("Abcdefgh1"), false);
  });
});

