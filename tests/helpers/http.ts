import type { PrismaClient } from "src/generated/prisma/client.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";

/**
 * Extracts `name=value` pairs from the `Set-Cookie` headers of a response,
 * suitable for reuse as a `Cookie` request header.
 */
export function extractCookies(res: Response): string {
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((v): v is string => !!v);

  return setCookies
    .map((cookie) => cookie.split(";")[0]!.trim())
    .filter(Boolean)
    .join("; ");
}

/** Merges a new response's Set-Cookie pairs into an existing Cookie header. */
export function mergeCookies(cookieHeader: string, res: Response): string {
  const jar = new Map<string, string>();

  for (const pair of cookieHeader.split(";").filter(Boolean)) {
    const [name, ...rest] = pair.trim().split("=");
    if (name) jar.set(name, rest.join("="));
  }

  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((v): v is string => !!v);

  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const [name, ...rest] = pair!.trim().split("=");
    if (!name) continue;
    const value = rest.join("=");
    if (value === "") {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }

  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export const TEST_UUID = {
  user: "11111111-1111-4111-8111-111111111111",
  admin: "22222222-2222-4222-8222-222222222222",
  category: "33333333-3333-4333-8333-333333333333",
  product: "44444444-4444-4444-8444-444444444444",
  cart: "55555555-5555-4555-8555-555555555555",
  cartItem: "66666666-6666-4666-8666-666666666666",
  order: "77777777-7777-4777-8777-777777777777",
  session: "88888888-8888-4888-8888-888888888888",
  missing: "99999999-9999-4999-8999-999999999999",
} as const;

export function makeUser(
  overrides: Partial<Record<string, unknown>> = {},
): TValidatedUserResponse {
  return {
    id: TEST_UUID.user,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+380501234567",
    role: "USER",
    status: "ACTIVE",
    isVerified: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as TValidatedUserResponse;
}

export type { PrismaClient };
