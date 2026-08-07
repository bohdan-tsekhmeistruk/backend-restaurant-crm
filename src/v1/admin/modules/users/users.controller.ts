import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";
import {
  type TDeleteUserInput,
  type TGetUserByIdParam,
  type TSearchUsersInput,
  type TUpdateUserInput,
} from "./dto/users.dto.js";
import usersService from "./users.service.js";

class UsersController {
  /**
   * Search for users
   * @param {Context<TServerContext, "/search", TSearchUsersInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the users
   */
  async searchUsers(c: Context<TServerContext, "/search", TSearchUsersInput>) {
    try {
      const prisma = c.get("prisma");
      const query = c.req.valid("query");

      const users = await usersService.searchUsers(prisma, query);

      return c.json(users);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Get a user by id
   * @param {Context<TServerContext, "/:id", TGetUserByIdParam>} c - The context object
   * @returns {Promise<Response>} - The response object with the user
   */
  async getUserById(c: Context<TServerContext, "/:id", TGetUserByIdParam>) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");

      const user = await usersService.getUserById(prisma, id);

      return c.json(user);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Update a user
   * @param {Context<TServerContext, "/:id", TUpdateUserInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated user
   */
  async updateUser(c: Context<TServerContext, "/:id", TUpdateUserInput>) {
    try {
      const prisma = c.get("prisma");
      const admin = c.get("user") as TValidatedUserResponse;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const user = await usersService.updateUser(prisma, admin.id, id, body);

      return c.json(user);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Soft delete a user
   * @param {Context<TServerContext, "/:id", TDeleteUserInput>} c - The context object
   * @returns {Promise<Response>} - The empty response object with 204 status
   */
  async deleteUser(c: Context<TServerContext, "/:id", TDeleteUserInput>) {
    try {
      const prisma = c.get("prisma");
      const admin = c.get("user") as TValidatedUserResponse;
      const { id } = c.req.valid("param");

      await usersService.deleteUser(prisma, admin.id, id);

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new UsersController();
