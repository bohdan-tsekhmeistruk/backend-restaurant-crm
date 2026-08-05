import type { PrismaClient } from "src/generated/prisma/client.js";
import type { TUpdateAccountBody } from "./dto/account.dto.js";
import emailService from "src/v1/modules/email/email.servie.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";
import crypto from "crypto";
import errorHandler from "src/lib/error.handler.js";
import { EAvailableTemplates } from "src/lib/dto/templates.dto.js";
import bcrypt from "bcrypt";

class AccountService {
  /**
   * Update user account
   * @param {PrismaClient} prisma - Prisma client
   * @param {string} userId - User ID
   * @param {TUpdateAccountBody} body - Update account body
   * @returns {Promise<void>} Return void if success
   */
  async updateAccount(
    prisma: PrismaClient,
    userId: string,
    body: TUpdateAccountBody,
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: body,
      select: { id: true },
    });
    return;
  }

  /**
   * Send email verification to user
   * @param {PrismaClient} prisma - Prisma client
   * @param {TValidatedUserResponse} user - User
   * @param {string | undefined} ipAddress - IP address
   * @param {string | undefined} userAgent - User agent
   * @returns {Promise<void>} Return void if success
   */
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
    const emailVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (emailVerification) {
      throw errorHandler.httpError(400, "Email verification already exists");
    }

    // generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // send email with token to user
    const info = await emailService.sendEmailWithTemplate(
      user.email,
      EAvailableTemplates.EMAIL_VERIFICATION_CODE,
      { token: token },
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

  /**
   * Check email verification
   * @param {PrismaClient} prisma - Prisma client
   * @param {TValidatedUserResponse} user - User
   * @param {string} token - Token
   * @returns {Promise<void>} Return void if success
   */
  async checkEmailVerification(
    prisma: PrismaClient,
    user: TValidatedUserResponse,
    token: string,
  ): Promise<void> {
    const emailVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
        token: token,
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (!emailVerification) {
      throw errorHandler.httpError(400, "Invalid email verification token");
    }

    await prisma.$transaction(async (tx) => {
      // update user is verified
      await tx.user.update({
        where: { id: user.id },
        data: { isVerified: true },
        select: { id: true },
      });
      // update email verification
      await tx.emailVerification.update({
        where: { id: emailVerification.id },
        data: { verifiedAt: new Date() },
        select: { id: true },
      });
    });

    return;
  }

  /**
   * Send password reset to user
   * @param {PrismaClient} prisma - Prisma client
   * @param {TValidatedUserResponse} user - User
   * @param {string | undefined} ipAddress - IP address
   * @param {string | undefined} userAgent - User agent
   * @returns {Promise<void>} Return void if success
   */
  async sendPasswordResetEmail(
    prisma: PrismaClient,
    email: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): Promise<void> {
    // check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw errorHandler.httpError(404, "User not found");
    }

    // check if user already has a password reset
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        changedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (passwordReset) {
      throw errorHandler.httpError(400, "Password reset already sent");
    }

    // generate token
    const token = crypto.randomBytes(128).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    // send email with token to user
    const info = await emailService.sendEmailWithTemplate(
      email,
      EAvailableTemplates.EMAIL_PASSWORD_RESET,
      { token: token },
    );
    if (info.rejected.length > 0) {
      throw errorHandler.httpError(500, "Failed to send password reset email");
    }

    // create password reset
    await prisma.passwordReset.create({
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

  /**
   * Check password reset token and reset password
   * @param {PrismaClient} prisma - Prisma client
   * @param {string} token - Token
   * @param {string} password - Password
   * @returns {Promise<void>} Return void if success
   */
  async checkPasswordReset(
    prisma: PrismaClient,
    token: string,
    newPassword: string,
  ): Promise<void> {
    // check if token is valid
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        token: token,
        changedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
      orderBy: { createdAt: "desc" },
    });
    if (!passwordReset) {
      throw errorHandler.httpError(400, "Invalid password reset token");
    }

    // hash password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.PASSWORD_SALT_ROUNDS ?? "12", 10),
    );

    await prisma.$transaction(async (tx) => {
      // update user password
      await tx.user.update({
        where: { id: passwordReset.userId },
        data: { password: hashedPassword },
        select: { id: true },
      });
      // update password reset
      await tx.passwordReset.update({
        where: { id: passwordReset.id },
        data: { changedAt: new Date() },
        select: { id: true },
      });
      // close all previous sessions
      await tx.session.deleteMany({
        where: { userId: passwordReset.userId },
      });
    });

    return;
  }
}

export default new AccountService();
