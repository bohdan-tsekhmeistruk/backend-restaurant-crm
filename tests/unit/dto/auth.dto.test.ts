import { describe, expect, it } from "vitest";
import {
  passwordSchema,
  TLoginBody,
  TRegisterBody,
} from "src/v1/modules/auth/dto/auth.dto.js";
import {
  TCheckEmailVerificationBody,
  TCheckPasswordResetBody,
  TSendPasswordResetBody,
  TUpdateAccountBody,
} from "src/v1/client/modules/account/dto/account.dto.js";

const VALID_PASSWORD = "Str0ng!Password";

describe("passwordSchema", () => {
  it("accepts a strong password", () => {
    expect(passwordSchema.parse(VALID_PASSWORD)).toBe(VALID_PASSWORD);
  });

  it.each([
    ["too short", "Sh0!rt"],
    ["no uppercase", "all-lower!123"],
    ["no lowercase", "ALL-UPPER!123"],
    ["no number", "NoNumbers!Here"],
    ["no special character", "NoSpecialChars12"],
  ])("rejects a password with %s", (_label, password) => {
    expect(() => passwordSchema.parse(password)).toThrow();
  });
});

describe("TLoginBody", () => {
  it("accepts valid credentials", () => {
    const parsed = TLoginBody.parse({
      email: "user@example.com",
      password: "12345678",
    });
    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      TLoginBody.parse({ email: "not-an-email", password: "12345678" }),
    ).toThrow();
  });

  it("rejects a password shorter than 8 or longer than 32 chars", () => {
    expect(() =>
      TLoginBody.parse({ email: "user@example.com", password: "short" }),
    ).toThrow();
    expect(() =>
      TLoginBody.parse({
        email: "user@example.com",
        password: "x".repeat(33),
      }),
    ).toThrow();
  });
});

describe("TRegisterBody", () => {
  const valid = {
    email: "user@example.com",
    password: VALID_PASSWORD,
    firstName: "John",
    lastName: "Doe",
    phone: "+380501234567",
  };

  it("accepts a full valid payload", () => {
    expect(TRegisterBody.parse(valid)).toEqual(valid);
  });

  it.each(["firstName", "lastName", "phone"])("rejects an empty %s", (field) => {
    expect(() => TRegisterBody.parse({ ...valid, [field]: "" })).toThrow();
  });

  it("rejects a weak password", () => {
    expect(() =>
      TRegisterBody.parse({ ...valid, password: "weak" }),
    ).toThrow();
  });
});

describe("account DTOs", () => {
  it("TUpdateAccountBody allows a partial update and an empty object", () => {
    expect(TUpdateAccountBody.parse({ firstName: "Jane" })).toEqual({
      firstName: "Jane",
    });
    expect(TUpdateAccountBody.parse({})).toEqual({});
  });

  it("TUpdateAccountBody rejects over-long fields", () => {
    expect(() =>
      TUpdateAccountBody.parse({ firstName: "x".repeat(33) }),
    ).toThrow();
  });

  it("TCheckEmailVerificationBody requires a token", () => {
    expect(
      TCheckEmailVerificationBody.parse({ token: "abc" }),
    ).toEqual({ token: "abc" });
    expect(() => TCheckEmailVerificationBody.parse({ token: "" })).toThrow();
  });

  it("TSendPasswordResetBody requires a valid email", () => {
    expect(TSendPasswordResetBody.parse({ email: "a@b.cd" }).email).toBe(
      "a@b.cd",
    );
    expect(() =>
      TSendPasswordResetBody.parse({ email: "nope" }),
    ).toThrow();
  });

  it("TCheckPasswordResetBody enforces the strong password policy", () => {
    expect(
      TCheckPasswordResetBody.parse({ token: "t", newPassword: VALID_PASSWORD }),
    ).toEqual({ token: "t", newPassword: VALID_PASSWORD });
    expect(() =>
      TCheckPasswordResetBody.parse({ token: "t", newPassword: "weak" }),
    ).toThrow();
  });
});
