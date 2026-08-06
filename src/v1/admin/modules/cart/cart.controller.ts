import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import {
  type TAddUserCartItemInput,
  type TDeleteUserCartItemInput,
  type TGetUserCartInput,
  type TUpdateUserCartItemInput,
} from "./dto/cart.dto.js";
import cartService from "./cart.service.js";

class CartController {
  /**
   * Get a user's cart by user id
   * @param {Context<TServerContext, "/:userId", TGetUserCartInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the cart
   */
  async getUserCart(c: Context<TServerContext, "/:userId", TGetUserCartInput>) {
    try {
      const prisma = c.get("prisma");
      const { userId } = c.req.valid("param");

      const cart = await cartService.getUserCart(prisma, userId);

      return c.json(cart);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Add a product to a user's cart
   * @param {Context<TServerContext, "/:userId/items", TAddUserCartItemInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated cart
   */
  async addUserCartItem(
    c: Context<TServerContext, "/:userId/items", TAddUserCartItemInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { userId } = c.req.valid("param");
      const body = c.req.valid("json");

      const cart = await cartService.addUserCartItem(prisma, userId, body);

      return c.json(cart, 201);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Update a cart item in a user's cart
   * @param {Context<TServerContext, "/:userId/items/:itemId", TUpdateUserCartItemInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated cart
   */
  async updateUserCartItem(
    c: Context<TServerContext, "/:userId/items/:itemId", TUpdateUserCartItemInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { userId, itemId } = c.req.valid("param");
      const body = c.req.valid("json");

      const cart = await cartService.updateUserCartItem(
        prisma,
        userId,
        itemId,
        body,
      );

      return c.json(cart);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Remove an item from a user's cart
   * @param {Context<TServerContext, "/:userId/items/:itemId", TDeleteUserCartItemInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated cart
   */
  async deleteUserCartItem(
    c: Context<TServerContext, "/:userId/items/:itemId", TDeleteUserCartItemInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { userId, itemId } = c.req.valid("param");

      const cart = await cartService.deleteUserCartItem(prisma, userId, itemId);

      return c.json(cart);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new CartController();
