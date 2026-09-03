import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseConfig } from "./server";

const originalEnvironment = {
  url: process.env.SUPABASE_URL,
  publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_PUBLISHABLE_KEY,
  publicKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("SUPABASE_URL", originalEnvironment.url);
  restore("NEXT_PUBLIC_SUPABASE_URL", originalEnvironment.publicUrl);
  restore("SUPABASE_PUBLISHABLE_KEY", originalEnvironment.key);
  restore("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalEnvironment.publicKey);
});

describe("Supabase server configuration", () => {
  it("accepts Hostinger's server-side variable names", () => {
    process.env.SUPABASE_URL = " https://example.supabase.co ";
    process.env.SUPABASE_PUBLISHABLE_KEY = " sb_publishable_example ";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
    expect(getSupabasePublishableKey()).toBe("sb_publishable_example");
    expect(hasSupabaseConfig()).toBe(true);
  });

  it("keeps supporting the Next.js public variable names", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";

    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
    expect(getSupabasePublishableKey()).toBe("sb_publishable_example");
    expect(hasSupabaseConfig()).toBe(true);
  });
});
