import { describe, it, expect } from "vitest";
import { parseRecoveryLink, isEmailRateLimitError } from "@/lib/recoveryLink";

describe("parseRecoveryLink", () => {
  it("наш вид: token_hash и type=recovery в query", () => {
    expect(parseRecoveryLink("", "?token_hash=abc123&type=recovery")).toEqual({
      kind: "token_hash",
      tokenHash: "abc123",
    });
  });

  it("query без ведущего '?' тоже разбирается", () => {
    expect(parseRecoveryLink("", "token_hash=abc123&type=recovery")).toEqual({
      kind: "token_hash",
      tokenHash: "abc123",
    });
  });

  it("token_hash с другим type не считается ссылкой восстановления", () => {
    expect(parseRecoveryLink("", "?token_hash=abc123&type=signup")).toEqual({ kind: "none" });
  });

  it("стандартный вид Supabase: access_token и type=recovery в hash", () => {
    const hash =
      "#access_token=eyJ.token&expires_at=1759500000&expires_in=3600&refresh_token=r1&token_type=bearer&type=recovery";
    expect(parseRecoveryLink(hash, "")).toEqual({ kind: "implicit" });
  });

  it("access_token с type=signup — не восстановление", () => {
    expect(parseRecoveryLink("#access_token=eyJ.token&type=signup", "")).toEqual({ kind: "none" });
  });

  it("hash с error_code=otp_expired — ошибка", () => {
    const hash =
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    expect(parseRecoveryLink(hash, "")).toEqual({
      kind: "error",
      errorCode: "otp_expired",
      errorDescription: "Email link is invalid or has expired",
    });
  });

  it("ошибка в query, даже вместе с token_hash, важнее токена", () => {
    expect(parseRecoveryLink("", "?token_hash=abc&type=recovery&error=server_error")).toEqual({
      kind: "error",
      errorCode: "server_error",
      errorDescription: null,
    });
  });

  it("пустой адрес", () => {
    expect(parseRecoveryLink("", "")).toEqual({ kind: "none" });
    expect(parseRecoveryLink("#", "?")).toEqual({ kind: "none" });
  });

  it("посторонние параметры игнорируются", () => {
    expect(parseRecoveryLink("#section-2", "?utm_source=mail&ref=abc")).toEqual({ kind: "none" });
    expect(parseRecoveryLink("#foo=bar", "?type=recovery")).toEqual({ kind: "none" });
  });
});

describe("isEmailRateLimitError", () => {
  it("HTTP 429 или код over_email_send_rate_limit", () => {
    expect(isEmailRateLimitError({ status: 429 })).toBe(true);
    expect(isEmailRateLimitError({ status: 400, code: "over_email_send_rate_limit" })).toBe(true);
  });

  it("прочие ошибки и отсутствие ошибки", () => {
    expect(isEmailRateLimitError({ status: 500, code: "unexpected_failure" })).toBe(false);
    expect(isEmailRateLimitError(null)).toBe(false);
  });
});
