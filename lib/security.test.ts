import { describe, expect, it } from "vitest";
import { isCompanyEmail, isStrongPassword, normalizeEmail, safeInternalPath } from "./security";

describe("employee account security", () => {
  it("normalizes and restricts accounts to the exact company domain", () => {
    expect(normalizeEmail(" Saad@LeadChasers.ma ")).toBe("saad@leadchasers.ma");
    expect(isCompanyEmail("saad@leadchasers.ma")).toBe(true);
    expect(isCompanyEmail("saad@sub.leadchasers.ma")).toBe(false);
    expect(isCompanyEmail("saad@evil.test@leadchasers.ma")).toBe(false);
    expect(isCompanyEmail("saad@leadchasers.ma.attacker.tld")).toBe(false);
    expect(isCompanyEmail("saad@leadchaser.ma")).toBe(false);
  });

  it("requires a long mixed password", () => {
    expect(isStrongPassword("weakpassword")).toBe(false);
    expect(isStrongPassword("StrongPassword1!")).toBe(true);
  });

  it("only accepts local redirect paths", () => {
    expect(safeInternalPath("/projects/123")).toBe("/projects/123");
    expect(safeInternalPath("https://attacker.tld")).toBe("/dashboard");
    expect(safeInternalPath("//attacker.tld")).toBe("/dashboard");
    expect(safeInternalPath("/\\attacker.tld")).toBe("/dashboard");
  });
});
