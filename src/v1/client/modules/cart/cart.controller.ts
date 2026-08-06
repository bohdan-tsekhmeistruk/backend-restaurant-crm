import type { Context } from "hono";
import type { BlankInput } from "hono/types";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";
import {
  type TAddCartItemInput,
  type TDeleteCartItemInput,
  type TUpdateCartItemInput,
} from "./dto/cart.dto.js";
import cartService from "./cart.service.js";

class CartController {
  /**
   * Get the current user's cart
   * @param {Context<TServerContext, "/", BlankInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the cart
   */
  async getMyCart(c: Context<TServerContext, "/", BlankInput>) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;

      const cart = await cartService.getMyCart(prisma, user.id);

      return c.json(cart);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Add a product to the current user's cart
   * @param {Context<TServerContext, "/items", TAddCartItemInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated cart
   */
  async addCartItem(c: Context<TServerContext, "/items", TAddCartItemInput>) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;
      const body = c.req.valid("json");

      const cart = await cartService.addCartItem(prisma, user.id, body);

      return c.json(cart, 201);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Update the quantity of a cart item
   * @param {Context<TServerContext, "/items/:id", TUpdateCartItemInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated cart
   */
  async updateCartItem(
    c: Context<TServerContext, "/items/:id", TUpdateCartItemInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const cart = await cartService.updateCartItem(prisma, user.id, id, body);

      return c.json(cart);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Remove an item from the current user's cart
   * @param {Context<TServerContext, "/items/:id", TDeleteCartItemInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated cart
   */
  async deleteCartItem(
    c: Context<TServerContext, "/items/:id", TDeleteCartItemInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;
      const { id } = c.req.valid("param");

      const cart = await cartService.deleteCartItem(prisma, user.id, id);

      return c.json(cart);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new CartController();
