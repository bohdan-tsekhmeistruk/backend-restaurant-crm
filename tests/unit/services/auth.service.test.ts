import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

const sessions = vi.hoisted(() => ({
  getSessionByRefreshToken: vi.fn(),
  getDeviceSession: vi.fn(),
  createSession: vi.fn(),
  rotateSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("src/v1/modules/sessions/sessions.service.js", () => ({
  default: sessions,
}));

import authService from "src/v1/modules/auth/auth.service.js";
import jwtService from "src/v1/modules/auth/jwt.service.js";
import type { TEnv } from "src/lib/dto/env.dto.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { makeUser, TEST_UUID } from "../../helpers/http.js";

const envVars = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://test",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
  COOKIE_SECRET: process.env.COOKIE_SECRET!,
} satisfies TEnv;

const LOGIN_PARAMS = {
  email: "user@example.com",
  password: "Str0ng!Password",
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
};

async function makeAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    ...makeUser(),
    password: await bcrypt.hash(LOGIN_PARAMS.password, 4),
    ...overrides,
  };
}

describe("AuthService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    sessions.createSession.mockResolvedValue({ refreshToken: "refresh-token" });
    sessions.rotateSession.mockResolvedValue({
      refreshToken: "rotated-refresh-token",
    });
  });

  describe("login", () => {
    it("rejects an unknown email with 401", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        authService.login(asPrisma(prisma), envVars, LOGIN_PARAMS),
        401,
        "Invalid credentials",
      );
    });

    it("rejects a wrong password with 401", async () => {
      prisma.user.findUnique.mockResolvedValue(await makeAuthUser());

      await expectHttpError(
        authService.login(asPrisma(prisma), envVars, {
          ...LOGIN_PARAMS,
          password: "Wr0ng!Password",
        }),
        401,
        "Invalid credentials",
      );
    });

    it.each(["BLOCKED", "DELETED"])(
      "rejects a %s account with 403",
      async (status) => {
        prisma.user.findUnique.mockResolvedValue(await makeAuthUser({ status }));

        await expectHttpError(
          authService.login(asPrisma(prisma), envVars, LOGIN_PARAMS),
          403,
          "Account is not active",
        );
      },
    );

    it("creates a new session when the device is unknown", async () => {
      prisma.user.findUnique.mockResolvedValue(await makeAuthUser());
      sessions.getDeviceSession.mockResolvedValue(null);

      const result = await authService.login(
        asPrisma(prisma),
        envVars,
        LOGIN_PARAMS,
      );

      expect(sessions.getDeviceSession).toHaveBeenCalledWith(asPrisma(prisma), {
        userId: TEST_UUID.user,
        userAgent: "vitest",
      });
      expect(sessions.createSession).toHaveBeenCalledWith(asPrisma(prisma), {
        userId: TEST_UUID.user,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      });
      expect(sessions.rotateSession).not.toHaveBeenCalled();
      expect(result.refreshToken).toBe("refresh-token");
    });

    it("rotates the existing device session instead of creating a new one", async () => {
      prisma.user.findUnique.mockResolvedValue(await makeAuthUser());
      sessions.getDeviceSession.mockResolvedValue({
        id: TEST_UUID.session,
        refreshToken: "old",
      });

      const result = await authService.login(
        asPrisma(prisma),
        envVars,
        LOGIN_PARAMS,
      );

      expect(sessions.rotateSession).toHaveBeenCalledWith(asPrisma(prisma), {
        sessionId: TEST_UUID.session,
        ipAddress: "127.0.0.1",
      });
      expect(sessions.createSession).not.toHaveBeenCalled();
      expect(result.refreshToken).toBe("rotated-refresh-token");
    });

    it("returns the user without the password and a verifiable access token", async () => {
      prisma.user.findUnique.mockResolvedValue(await makeAuthUser());
      sessions.getDeviceSession.mockResolvedValue(null);

      const result = await authService.login(
        asPrisma(prisma),
        envVars,
        LOGIN_PARAMS,
      );

      expect(result.user).not.toHaveProperty("password");
      expect(result.user.email).toBe("user@example.com");
      const payload = await jwtService.verifyToken(
        result.accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );
      expect(payload.userId).toBe(TEST_UUID.user);
    });
  });

  describe("register", () => {
    const REGISTER_PARAMS = {
      email: "new@example.com",
      password: "Str0ng!Password",
      firstName: "Jane",
      lastName: "Doe",
      phone: "+380501234567",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    };

    it("rejects a duplicate email with 400", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });

      await expectHttpError(
        authService.register(asPrisma(prisma), envVars, REGISTER_PARAMS),
        400,
        "User already exists",
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("hashes the password, creates a cart and a session", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }: any) => ({
        id: TEST_UUID.user,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "USER",
        status: "ACTIVE",
        isVerified: false,
      }));

      const result = await authService.register(
        asPrisma(prisma),
        envVars,
        REGISTER_PARAMS,
      );

      const createArgs = prisma.user.create.mock.calls[0]![0];
      expect(createArgs.data.email).toBe("new@example.com");
      expect(createArgs.data.password).not.toBe(REGISTER_PARAMS.password);
      await expect(
        bcrypt.compare(REGISTER_PARAMS.password, createArgs.data.password),
      ).resolves.toBe(true);
      expect(createArgs.data.cart).toEqual({ create: {} });

      expect(sessions.createSession).toHaveBeenCalledWith(asPrisma(prisma), {
        userId: TEST_UUID.user,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      });

      expect(result.user).not.toHaveProperty("password");
      expect(result.refreshToken).toBe("refresh-token");
      const payload = await jwtService.verifyToken(
        result.accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );
      expect(payload.userId).toBe(TEST_UUID.user);
    });
  });

  describe("refreshToken", () => {
    const REFRESH_PARAMS = {
      refreshToken: "old-refresh-token",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    };

    it("rejects an unknown refresh token with 401", async () => {
      sessions.getSessionByRefreshToken.mockResolvedValue(null);

      await expectHttpError(
        authService.refreshToken(asPrisma(prisma), envVars, REFRESH_PARAMS),
        401,
        "Unauthorized",
      );
    });

    it("rejects a refresh from a different device (user agent mismatch)", async () => {
      sessions.getSessionByRefreshToken.mockResolvedValue({
        id: TEST_UUID.session,
        userId: TEST_UUID.user,
        refreshToken: "old-refresh-token",
        ipAddress: "127.0.0.1",
        userAgent: "another-agent",
      });

      await expectHttpError(
        authService.refreshToken(asPrisma(prisma), envVars, REFRESH_PARAMS),
        401,
        "Unauthorized",
      );
      expect(sessions.rotateSession).not.toHaveBeenCalled();
    });

    it("allows a session stored without a user agent", async () => {
      sessions.getSessionByRefreshToken.mockResolvedValue({
        id: TEST_UUID.session,
        userId: TEST_UUID.user,
        refreshToken: "old-refresh-token",
        ipAddress: "127.0.0.1",
        userAgent: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: TEST_UUID.user,
        status: "ACTIVE",
      });

      const result = await authService.refreshToken(
        asPrisma(prisma),
        envVars,
        REFRESH_PARAMS,
      );

      expect(result.refreshToken).toBe("rotated-refresh-token");
    });

    it("rejects when the session owner no longer exists (401)", async () => {
      sessions.getSessionByRefreshToken.mockResolvedValue({
        id: TEST_UUID.session,
        userId: TEST_UUID.user,
        refreshToken: "old-refresh-token",
        ipAddress: null,
        userAgent: "vitest",
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        authService.refreshToken(asPrisma(prisma), envVars, REFRESH_PARAMS),
        401,
        "Unauthorized",
      );
    });

    it("rejects a blocked account with 403", async () => {
      sessions.getSessionByRefreshToken.mockResolvedValue({
        id: TEST_UUID.session,
        userId: TEST_UUID.user,
        refreshToken: "old-refresh-token",
        ipAddress: null,
        userAgent: "vitest",
      });
      prisma.user.findUnique.mockResolvedValue({
        id: TEST_UUID.user,
        status: "BLOCKED",
      });

      await expectHttpError(
        authService.refreshToken(asPrisma(prisma), envVars, REFRESH_PARAMS),
        403,
        "Account is not active",
      );
    });

    it("rotates the session and returns a fresh token pair", async () => {
      sessions.getSessionByRefreshToken.mockResolvedValue({
        id: TEST_UUID.session,
        userId: TEST_UUID.user,
        refreshToken: "old-refresh-token",
        ipAddress: null,
        userAgent: "vitest",
      });
      prisma.user.findUnique.mockResolvedValue({
        id: TEST_UUID.user,
        status: "ACTIVE",
      });

      const result = await authService.refreshToken(
        asPrisma(prisma),
        envVars,
        REFRESH_PARAMS,
      );

      expect(sessions.rotateSession).toHaveBeenCalledWith(asPrisma(prisma), {
        sessionId: TEST_UUID.session,
        ipAddress: "127.0.0.1",
      });
      const payload = await jwtService.verifyToken(
        result.accessToken,
        envVars.ACCESS_TOKEN_SECRET,
      );
      expect(payload.userId).toBe(TEST_UUID.user);
      expect(result.refreshToken).toBe("rotated-refresh-token");
    });
  });

  describe("logout", () => {
    it("deletes the session bound to the refresh token", async () => {
      sessions.deleteSession.mockResolvedValue(undefined);

      await authService.logout(asPrisma(prisma), "rt");

      expect(sessions.deleteSession).toHaveBeenCalledWith(
        asPrisma(prisma),
        "rt",
      );
    });
  });
});
