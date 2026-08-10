import { beforeEach, describe, expect, it } from "vitest";
import sessionsService from "src/v1/modules/sessions/sessions.service.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { TEST_UUID } from "../../helpers/http.js";

describe("SessionsService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  describe("getSessionByRefreshToken", () => {
    it("looks the session up by refresh token", async () => {
      const session = { id: TEST_UUID.session, refreshToken: "rt" };
      prisma.session.findUnique.mockResolvedValue(session);

      const result = await sessionsService.getSessionByRefreshToken(
        asPrisma(prisma),
        "rt",
      );

      expect(result).toEqual(session);
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { refreshToken: "rt" },
        select: {
          id: true,
          userId: true,
          refreshToken: true,
          ipAddress: true,
          userAgent: true,
        },
      });
    });

    it("returns null when nothing is found", async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(
        sessionsService.getSessionByRefreshToken(asPrisma(prisma), "missing"),
      ).resolves.toBeNull();
    });
  });

  describe("getDeviceSession", () => {
    it("matches on userId and user agent", async () => {
      prisma.session.findFirst.mockResolvedValue({ id: TEST_UUID.session });

      await sessionsService.getDeviceSession(asPrisma(prisma), {
        userId: TEST_UUID.user,
        userAgent: "Mozilla",
      });

      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user, userAgent: "Mozilla" },
        select: { id: true, refreshToken: true },
      });
    });

    it("normalizes a missing user agent to null", async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await sessionsService.getDeviceSession(asPrisma(prisma), {
        userId: TEST_UUID.user,
        userAgent: undefined,
      });

      expect(prisma.session.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: TEST_UUID.user, userAgent: null },
        }),
      );
    });
  });

  describe("createSession", () => {
    it("persists a new session with a generated refresh token", async () => {
      prisma.session.create.mockImplementation(async ({ data }: any) => ({
        refreshToken: data.refreshToken,
      }));

      const result = await sessionsService.createSession(asPrisma(prisma), {
        userId: TEST_UUID.user,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla",
      });

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: TEST_UUID.user,
          refreshToken: expect.stringMatching(/^[A-Za-z0-9_-]{86}$/),
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla",
        },
        select: { refreshToken: true },
      });
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{86}$/);
    });
  });

  describe("deleteSession", () => {
    it("deletes every session bound to the refresh token", async () => {
      prisma.session.deleteMany.mockResolvedValue({ count: 1 });

      await sessionsService.deleteSession(asPrisma(prisma), "rt");

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { refreshToken: "rt" },
      });
    });
  });

  describe("rotateSession", () => {
    it("replaces the refresh token and refreshes the IP address", async () => {
      prisma.session.update.mockImplementation(async ({ data }: any) => ({
        refreshToken: data.refreshToken,
      }));

      const result = await sessionsService.rotateSession(asPrisma(prisma), {
        sessionId: TEST_UUID.session,
        ipAddress: "10.0.0.1",
      });

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.session },
        data: {
          refreshToken: expect.stringMatching(/^[A-Za-z0-9_-]{86}$/),
          ipAddress: "10.0.0.1",
        },
        select: { refreshToken: true },
      });
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{86}$/);
    });
  });
});
