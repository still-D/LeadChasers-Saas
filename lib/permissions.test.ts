import { describe, it, expect } from "vitest";
import { normalizeSupabaseRelation, resolveEffectivePermission, type PermissionEffect } from "./permissions";

describe("normalizeSupabaseRelation", () => {
  const role = { slug: "ceo", active: true };

  it("accepts the object shape returned for a to-one relationship", () => {
    expect(normalizeSupabaseRelation(role)).toEqual(role);
  });

  it("accepts the legacy one-item array shape", () => {
    expect(normalizeSupabaseRelation([role])).toEqual(role);
  });

  it("returns null for a missing relationship", () => {
    expect(normalizeSupabaseRelation(null)).toBeNull();
    expect(normalizeSupabaseRelation([])).toBeNull();
  });
});

describe("resolveEffectivePermission", () => {
  it("denies when no role and no override", () => {
    expect(resolveEffectivePermission(null, new Set(), new Map(), "projects.view")).toBe(false);
  });

  it("allows when the role has the permission", () => {
    expect(resolveEffectivePermission("staff", new Set(["projects.view"]), new Map(), "projects.view")).toBe(true);
  });

  it("denies when the role does not have the permission", () => {
    expect(resolveEffectivePermission("staff", new Set(["projects.view"]), new Map(), "finance.approve")).toBe(false);
  });

  it("gives CEO full access regardless of role permissions", () => {
    expect(resolveEffectivePermission("ceo", new Set(), new Map(), "system.settings")).toBe(true);
    expect(resolveEffectivePermission("ceo", new Set(), new Map(), "any.permission")).toBe(true);
  });

  it("explicit allow override grants permission even without role permission", () => {
    const overrides = new Map<string, PermissionEffect>([["finance.approve", "allow"]]);
    expect(resolveEffectivePermission("staff", new Set(), overrides, "finance.approve")).toBe(true);
  });

  it("explicit deny override denies permission even with role permission and CEO role", () => {
    const overrides = new Map<string, PermissionEffect>([["projects.view", "deny"]]);
    expect(resolveEffectivePermission("staff", new Set(["projects.view"]), overrides, "projects.view")).toBe(false);
    expect(resolveEffectivePermission("ceo", new Set(), overrides, "projects.view")).toBe(false);
  });

  it("never revokes access from the protected founder account", () => {
    const overrides = new Map<string, PermissionEffect>([["system.settings", "deny"]]);
    expect(resolveEffectivePermission("ceo", new Set(), overrides, "system.settings", true)).toBe(true);
  });

  it("does not affect unrelated permissions", () => {
    const overrides = new Map<string, PermissionEffect>([["projects.view", "deny"]]);
    expect(resolveEffectivePermission("staff", new Set(["tasks.view"]), overrides, "tasks.view")).toBe(true);
  });
});
