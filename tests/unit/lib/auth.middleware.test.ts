import { beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { setSignedCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  AdminAuthMiddleware,
  AuthMiddleware,
} from "src/lib/auth/auth.middleware.js";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import { createPrismaMock } from "../../helpers/prisma-mock.js";
import { extractCookies, makeUser, TEST_UUID } from "../../helpers/http.js";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const COOKIE_SECRET = process.env.COOKIE_SECRET!;

type Middleware = typeof AuthMiddleware;

function buildApp(prisma: ReturnType<typeof createPrismaMock> | null) {
  const app = new Hono<TServerContext>();

  app.use((c, next) => {
    if (prisma) c.set("prisma", prisma as any);
    return next();
  });

  // Helper endpoint that signs a cookie exactly like the auth controller does
  app.get("/sign", async (c) => {
    await setSignedCookie(
      c,
      "accessToken",
      c.req.query("value")!,
      COOKIE_SECRET,
      { path: "/" },
    );
    return c.text("ok");
  });

  return app;
}

async function signedAccessCookie(
  app: Hono<TServerContext>,
  value: string,
): Promise<string> {
  const res = await app.request(`/sign?value=${encodeURIComponent(value)}`);
  return extractCookies(res);
}

describe.each([
  ["AuthMiddleware", AuthMiddleware, ["USER", "ADMIN"]],
  ["AdminAuthMiddleware", AdminAuthMiddleware, ["ADMIN"]],
] as const)("%s", (name, middleware: Middleware, allowedRoles) => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let app: Hono<TServerContext>;

  beforeEach(() => {
    prisma = createPrismaMock();
    app = buildApp(prisma);
    app.get("/protected", middleware, (c) => {
      const user = c.get("user");
      return c.json({ ok: true, userId: user?.id ?? null });
    });
  });

  it("rejects requests without a signed accessToken cookie (401)", async () => {
    const res = await app.request("/protected");

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("rejects when the cookie fails the signature check (401)", async () => {
    const res = await app.request("/protected", {
      headers: { Cookie: "accessToken=forged.without-valid-signature" },
    });

    expect(res.status).toBe(401);
  });

  it("returns 500 when the token is not a verifiable JWT", async () => {
    const cookie = await signedAccessCookie(app, "not-a-jwt");

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    // hono/jwt throws on malformed tokens and the middleware does not catch it
    expect(res.status).toBe(500);
  });

  it("returns 500 when the token was signed with another secret", async () => {
    const token = await jwtService.issueToken(TEST_UUID.user, "other-secret");
    const cookie = await signedAccessCookie(app, token);

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    expect(res.status).toBe(500);
  });

  it("rejects tokens without a string userId (401)", async () => {
    const token = await sign({ foo: "bar" }, ACCESS_SECRET, "HS256");
    const cookie = await signedAccessCookie(app, token);
    prisma.user.findUnique.mockResolvedValue(makeUser());

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the user no longer exists (401)", async () => {
    const token = await jwtService.issueToken(TEST_UUID.user, ACCESS_SECRET);
    const cookie = await signedAccessCookie(app, token);
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: TEST_UUID.user },
      omit: { password: true },
    });
  });

  it.each(["BLOCKED", "DELETED"])(
    "rejects %s accounts even with a valid token (403)",
    async (status) => {
      const token = await jwtService.issueToken(TEST_UUID.user, ACCESS_SECRET);
      const cookie = await signedAccessCookie(app, token);
      prisma.user.findUnique.mockResolvedValue(makeUser({ status }));

      const res = await app.request("/protected", {
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual({
        message: "Account is not active",
      });
    },
  );

  for (const role of allowedRoles) {
    it(`allows an active ${role} and exposes the user in the context`, async () => {
      const token = await jwtService.issueToken(TEST_UUID.user, ACCESS_SECRET);
      const cookie = await signedAccessCookie(app, token);
      prisma.user.findUnique.mockResolvedValue(makeUser({ role }));

      const res = await app.request("/protected", {
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({
        ok: true,
        userId: TEST_UUID.user,
      });
    });
  }
});

describe("role restrictions", () => {
  it("AuthMiddleware rejects roles outside USER/ADMIN (403)", async () => {
    const prisma = createPrismaMock();
    const app = buildApp(prisma);
    app.get("/protected", AuthMiddleware, (c) => c.json({ ok: true }));

    const token = await jwtService.issueToken(TEST_UUID.user, ACCESS_SECRET);
    const cookie = await signedAccessCookie(app, token);
    prisma.user.findUnique.mockResolvedValue(makeUser({ role: "GHOST" }));

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      message: "You are not authorized to access this resource",
    });
  });

  it("AdminAuthMiddleware rejects a USER (403)", async () => {
    const prisma = createPrismaMock();
    const app = buildApp(prisma);
    app.get("/protected", AdminAuthMiddleware, (c) => c.json({ ok: true }));

    const token = await jwtService.issueToken(TEST_UUID.user, ACCESS_SECRET);
    const cookie = await signedAccessCookie(app, token);
    prisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    expect(res.status).toBe(403);
  });

  it("returns 500 when prisma is missing from the context", async () => {
    const app = buildApp(null);
    app.get("/protected", AuthMiddleware, (c) => c.json({ ok: true }));

    const token = await jwtService.issueToken(TEST_UUID.user, ACCESS_SECRET);
    const cookie = await signedAccessCookie(app, token);

    const res = await app.request("/protected", { headers: { Cookie: cookie } });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      message: "Internal server error",
    });
  });
});
