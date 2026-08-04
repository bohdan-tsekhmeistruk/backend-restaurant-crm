import type { Context } from "hono";
import type { BlankInput } from "hono/types";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import type {
  TUpdateAccountBody,
  TUpdateAccountInput,
} from "./dto/account.dto.js";
import accountService from "./account.service.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";

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
      throw errorHandler.httpError(500, "Internal server error");
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
      throw errorHandler.httpError(500, "Internal server error");
    }
  }
}

export default new AccountController();
