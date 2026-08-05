import type { PrismaClient } from "src/generated/prisma/client.js";
import type { TUpdateAccountBody } from "./dto/account.dto.js";
import emailService from "src/v1/modules/email/email.servie.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";
import crypto from "crypto";
import errorHandler from "src/lib/error.handler.js";

class AccountService {
  async updateAccount(
    prisma: PrismaClient,
    userId: string,
    body: TUpdateAccountBody,
  ) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: body,
    });
    return updatedUser;
  }

  async sendEmailVerification(
    prisma: PrismaClient,
    user: TValidatedUserResponse,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    // check if user is already verified
    if (user.isVerified) {
      throw errorHandler.httpError(400, "Email already verified");
    }

    // check if user already has a email verification
    const emailVerification = await prisma.emailVerification.findUnique({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (emailVerification) {
      throw errorHandler.httpError(400, "Email verification already exists");
    }

    // generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // send email with token to user
    const info = await emailService.sendEmail(
      user.email,
      "Email Verification",
      `Token for email verification: <b>${token}</b>`,
    );
    if (info.rejected.length > 0) {
      throw errorHandler.httpError(500, "Failed to send email verification");
    }

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: token,
        ipAddress: ipAddress,
        userAgent: userAgent,
        expiresAt: expiresAt,
      },
    });

    return;
  }

  async checkEmailVerification(
    prisma: PrismaClient,
    user: TValidatedUserResponse,
    token: string,
  ): Promise<void> {
    const emailVerification = await prisma.emailVerification.findUnique({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
        token: token,
      },
      select: { id: true },
    });
    if (!emailVerification) {
      throw errorHandler.httpError(400, "Invalid email verification token");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
      await tx.emailVerification.update({
        where: { id: emailVerification.id },
        data: { verifiedAt: new Date() },
      });
    });

    return;
  }
}

export default new AccountService();
