import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPasswordRecoveryToken, verifyPasswordRecoveryToken } from "./password-recovery";

describe("password recovery authorization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00Z"));
    process.env.PASSWORD_RECOVERY_SECRET = "test-only-recovery-secret-with-sufficient-entropy";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.PASSWORD_RECOVERY_SECRET;
  });

  it("accepts a fresh token only for its authenticated user", () => {
    const token = createPasswordRecoveryToken("user-a");
    expect(token).not.toBeNull();
    expect(verifyPasswordRecoveryToken(token ?? undefined, "user-a")).toBe(true);
    expect(verifyPasswordRecoveryToken(token ?? undefined, "user-b")).toBe(false);
  });

  it("rejects tampered and expired tokens", () => {
    const token = createPasswordRecoveryToken("user-a");
    expect(token).not.toBeNull();
    expect(verifyPasswordRecoveryToken(`${token}tampered`, "user-a")).toBe(false);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    expect(verifyPasswordRecoveryToken(token ?? undefined, "user-a")).toBe(false);
  });
});
