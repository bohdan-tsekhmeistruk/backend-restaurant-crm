import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

const email = vi.hoisted(() => ({
  sendEmailWithTemplate: vi.fn(),
}));

vi.mock("src/v1/modules/email/email.servie.js", () => ({
  default: email,
}));

import accountService from "src/v1/client/modules/account/account.service.js";
import { EAvailableTemplates } from "src/lib/dto/templates.dto.js";
import {
  asPrisma,
  createPrismaMock,
  type PrismaMock,
} from "../../helpers/prisma-mock.js";
import { expectHttpError } from "../../helpers/assert.js";
import { makeUser, TEST_UUID } from "../../helpers/http.js";

describe("AccountService", () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    email.sendEmailWithTemplate.mockResolvedValue({
      messageId: "msg-1",
      rejected: [],
    });
  });

  describe("updateAccount", () => {
    it("updates only the provided profile fields", async () => {
      prisma.user.update.mockResolvedValue({ id: TEST_UUID.user });

      await accountService.updateAccount(asPrisma(prisma), TEST_UUID.user, {
        firstName: "Jane",
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.user },
        data: { firstName: "Jane" },
        select: { id: true },
      });
    });
  });

  describe("sendEmailVerification", () => {
    it("rejects an already verified user with 400", async () => {
      await expectHttpError(
        accountService.sendEmailVerification(
          asPrisma(prisma),
          makeUser({ isVerified: true }),
          "127.0.0.1",
          "vitest",
        ),
        400,
        "Email already verified",
      );
      expect(email.sendEmailWithTemplate).not.toHaveBeenCalled();
    });

    it("rejects when an unexpired verification already exists", async () => {
      prisma.emailVerification.findFirst.mockResolvedValue({ id: "ev-1" });

      await expectHttpError(
        accountService.sendEmailVerification(
          asPrisma(prisma),
          makeUser(),
          "127.0.0.1",
          "vitest",
        ),
        400,
        "Email verification already exists",
      );
    });

    it("fails with 500 when the email is rejected by the SMTP server", async () => {
      prisma.emailVerification.findFirst.mockResolvedValue(null);
      email.sendEmailWithTemplate.mockResolvedValue({
        messageId: "msg-1",
        rejected: ["user@example.com"],
      });

      await expectHttpError(
        accountService.sendEmailVerification(
          asPrisma(prisma),
          makeUser(),
          "127.0.0.1",
          "vitest",
        ),
        500,
        "Failed to send email verification",
      );
      expect(prisma.emailVerification.create).not.toHaveBeenCalled();
    });

    it("sends the token and persists a verification record for 24h", async () => {
      prisma.emailVerification.findFirst.mockResolvedValue(null);
      prisma.emailVerification.create.mockResolvedValue({ id: "ev-1" });
      const before = Date.now();

      await accountService.sendEmailVerification(
        asPrisma(prisma),
        makeUser(),
        "127.0.0.1",
        "vitest",
      );

      expect(email.sendEmailWithTemplate).toHaveBeenCalledWith(
        "user@example.com",
        EAvailableTemplates.EMAIL_VERIFICATION_CODE,
        { token: expect.stringMatching(/^[a-f0-9]{64}$/) },
      );

      const createArgs = prisma.emailVerification.create.mock.calls[0]![0];
      expect(createArgs.data).toMatchObject({
        userId: TEST_UUID.user,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      });
      expect(createArgs.data.token).toMatch(/^[a-f0-9]{64}$/);
      const lifetimeMs =
        createArgs.data.expiresAt.getTime() - before;
      expect(lifetimeMs).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
      expect(lifetimeMs).toBeLessThan(24 * 60 * 60 * 1000 + 60_000);
    });
  });

  describe("checkEmailVerification", () => {
    it("rejects an invalid or expired token with 400", async () => {
      prisma.emailVerification.findFirst.mockResolvedValue(null);

      await expectHttpError(
        accountService.checkEmailVerification(
          asPrisma(prisma),
          makeUser(),
          "bad-token",
        ),
        400,
        "Invalid email verification token",
      );
    });

    it("verifies the user and marks the token as used in a transaction", async () => {
      prisma.emailVerification.findFirst.mockResolvedValue({ id: "ev-1" });
      prisma.user.update.mockResolvedValue({ id: TEST_UUID.user });
      prisma.emailVerification.update.mockResolvedValue({ id: "ev-1" });

      await accountService.checkEmailVerification(
        asPrisma(prisma),
        makeUser(),
        "good-token",
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUID.user },
        data: { isVerified: true },
        select: { id: true },
      });
      expect(prisma.emailVerification.update).toHaveBeenCalledWith({
        where: { id: "ev-1" },
        data: { verifiedAt: expect.any(Date) },
        select: { id: true },
      });
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("rejects an unknown email with 404", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expectHttpError(
        accountService.sendPasswordResetEmail(
          asPrisma(prisma),
          "ghost@example.com",
          "127.0.0.1",
          "vitest",
        ),
        404,
        "User not found",
      );
    });

    it("rejects when a reset was already sent", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.passwordReset.findFirst.mockResolvedValue({ id: "pr-1" });

      await expectHttpError(
        accountService.sendPasswordResetEmail(
          asPrisma(prisma),
          "user@example.com",
          "127.0.0.1",
          "vitest",
        ),
        400,
        "Password reset already sent",
      );
    });

    it("fails with 500 when the email is rejected", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.passwordReset.findFirst.mockResolvedValue(null);
      email.sendEmailWithTemplate.mockResolvedValue({
        messageId: "msg-1",
        rejected: ["user@example.com"],
      });

      await expectHttpError(
        accountService.sendPasswordResetEmail(
          asPrisma(prisma),
          "user@example.com",
          "127.0.0.1",
          "vitest",
        ),
        500,
        "Failed to send password reset email",
      );
      expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    });

    it("sends a 128-byte hex token and persists the reset record", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: TEST_UUID.user });
      prisma.passwordReset.findFirst.mockResolvedValue(null);
      prisma.passwordReset.create.mockResolvedValue({ id: "pr-1" });

      await accountService.sendPasswordResetEmail(
        asPrisma(prisma),
        "user@example.com",
        "127.0.0.1",
        "vitest",
      );

      expect(email.sendEmailWithTemplate).toHaveBeenCalledWith(
        "user@example.com",
        EAvailableTemplates.EMAIL_PASSWORD_RESET,
        { token: expect.stringMatching(/^[a-f0-9]{256}$/) },
      );
      expect(prisma.passwordReset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: TEST_UUID.user,
          token: expect.stringMatching(/^[a-f0-9]{256}$/),
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe("checkPasswordReset", () => {
    it("rejects an invalid or expired token with 400", async () => {
      prisma.passwordReset.findFirst.mockResolvedValue(null);

      await expectHttpError(
        accountService.checkPasswordReset(
          asPrisma(prisma),
          "bad-token",
          "N3w!Password123",
        ),
        400,
        "Invalid password reset token",
      );
    });

    it("updates the password, marks the token used and revokes all sessions", async () => {
      prisma.passwordReset.findFirst.mockResolvedValue({
        id: "pr-1",
        userId: TEST_UUID.user,
      });
      prisma.user.update.mockResolvedValue({ id: TEST_UUID.user });
      prisma.passwordReset.update.mockResolvedValue({ id: "pr-1" });
      prisma.session.deleteMany.mockResolvedValue({ count: 2 });

      await accountService.checkPasswordReset(
        asPrisma(prisma),
        "good-token",
        "N3w!Password123",
      );

      expect(prisma.$transaction).toHaveBeenCalled();

      const updateArgs = prisma.user.update.mock.calls[0]![0];
      expect(updateArgs.where).toEqual({ id: TEST_UUID.user });
      await expect(
        bcrypt.compare("N3w!Password123", updateArgs.data.password),
      ).resolves.toBe(true);

      expect(prisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: "pr-1" },
        data: { changedAt: expect.any(Date) },
        select: { id: true },
      });
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: TEST_UUID.user },
      });
    });
  });
});
