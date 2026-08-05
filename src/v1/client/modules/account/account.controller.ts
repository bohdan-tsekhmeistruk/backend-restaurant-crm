import type { Context } from "hono";
import type { BlankInput } from "hono/types";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import type {
  TUpdateAccountBody,
  TUpdateAccountInput,
  TCheckEmailVerificationBody,
  TCheckEmailVerificationInput,
  TCheckPasswordResetInput,
  TSendPasswordResetInput,
} from "./dto/account.dto.js";
import accountService from "./account.service.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";
import { getConnInfo } from "@hono/node-server/conninfo";

class AccountController {
  /**
   * Get the current user's account information
   * @param {Context<TServerContext, "/me", BlankInput>} c - The context object
   * @returns {Promise<Response>} The response object
   * @throws {HTTPException} 401 - Unauthorized
   * @throws {HTTPException} 500 - Internal server error
   */
  async getMyAccount(c: Context<TServerContext, "/me", BlankInput>) {
    try {
      const user = c.get("user");
      return c.json(user);
    } catch (error) {
      throw errorHandler.handle(c, error);
    }
  }

  /**
   * Update the current user's account information
   * @param {Context<TServerContext, "/update", TUpdateAccountInput>} c - The context object
   * @returns {Promise<Response>} The response object
   * @throws {HTTPException} 401 - Unauthorized
   * @throws {HTTPException} 500 - Internal server error
   */
  async updateMyAccount(
    c: Context<TServerContext, "/update", TUpdateAccountInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const body = c.req.valid("json");
      const user = c.get("user") as TValidatedUserResponse;

      await accountService.updateAccount(prisma, user.id, body);

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  async sendEmailVerification(
    c: Context<TServerContext, "/send-email-verification", BlankInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const connInfo = getConnInfo(c);
      const user = c.get("user") as TValidatedUserResponse;

      await accountService.sendEmailVerification(
        prisma,
        user,
        connInfo.remote.address,
        c.req.header("user-agent"),
      );

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  async checkEmailVerification(
    c: Context<
      TServerContext,
      "/check-email-verification",
      TCheckEmailVerificationInput
    >,
  ) {
    try {
      const prisma = c.get("prisma");
      const { token } = c.req.valid("json");
      const user = c.get("user") as TValidatedUserResponse;

      await accountService.checkEmailVerification(prisma, user, token);

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  async sendPasswordResetEmail(
    c: Context<TServerContext, "/send-password-reset", TSendPasswordResetInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const connInfo = getConnInfo(c);
      const { email } = c.req.valid("json");

      await accountService.sendPasswordResetEmail(
        prisma,
        email,
        connInfo.remote.address,
        c.req.header("user-agent"),
      );

      return c.body(null, 204);
    } catch (error) {
      console.error("Error sending password reset email: ", error);
      return errorHandler.handle(c, error);
    }
  }

  async checkPasswordReset(
    c: Context<
      TServerContext,
      "/check-password-reset",
      TCheckPasswordResetInput
    >,
  ) {
    try {
      const prisma = c.get("prisma");
      const { token, newPassword } = c.req.valid("json");

      await accountService.checkPasswordReset(prisma, token, newPassword);

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new AccountController();
