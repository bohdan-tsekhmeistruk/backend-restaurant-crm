import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  CartSelect,
  type TAddUserCartItemBody,
  type TCartResponse,
  type TUpdateUserCartItemBody,
} from "./dto/cart.dto.js";
import errorHandler from "src/lib/error.handler.js";

class CartService {
  /**
   * Get a user's cart by user id, creating it if it does not exist
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @returns {Promise<TCartResponse>} - The cart with items
   */
  async getUserCart(
    prisma: PrismaClient,
    userId: string,
  ): Promise<TCartResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw errorHandler.httpError(404, "User not found");
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: CartSelect,
    });

    return cart;
  }

  /**
   * Add a product to a user's cart, incrementing the quantity if it is already there
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {TAddUserCartItemBody} body - The item data
   * @returns {Promise<TCartResponse>} - The updated cart with items
   */
  async addUserCartItem(
    prisma: PrismaClient,
    userId: string,
    body: TAddUserCartItemBody,
  ): Promise<TCartResponse> {
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      select: { id: true, isAvailable: true },
    });
    if (!product) {
      throw errorHandler.httpError(404, "Product not found");
    }
    if (!product.isAvailable) {
      throw errorHandler.httpError(400, "Product is not available");
    }

    const cart = await this.getUserCart(prisma, userId);

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: body.productId },
      select: { id: true, quantity: true },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + body.quantity },
        select: { id: true },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: body.productId,
          quantity: body.quantity,
        },
        select: { id: true },
      });
    }

    return this.getUserCart(prisma, userId);
  }

  /**
   * Update a cart item in a user's cart
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {string} itemId - The id of the cart item
   * @param {TUpdateUserCartItemBody} body - The item data
   * @returns {Promise<TCartResponse>} - The updated cart with items
   */
  async updateUserCartItem(
    prisma: PrismaClient,
    userId: string,
    itemId: string,
    body: TUpdateUserCartItemBody,
  ): Promise<TCartResponse> {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      select: { id: true },
    });
    if (!item) {
      throw errorHandler.httpError(404, "Cart item not found");
    }

    if (body.productId) {
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        select: { id: true, isAvailable: true },
      });
      if (!product) {
        throw errorHandler.httpError(404, "Product not found");
      }
      if (!product.isAvailable) {
        throw errorHandler.httpError(400, "Product is not available");
      }
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: body,
      select: { id: true },
    });

    return this.getUserCart(prisma, userId);
  }

  /**
   * Remove an item from a user's cart
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {string} itemId - The id of the cart item
   * @returns {Promise<TCartResponse>} - The updated cart with items
   */
  async deleteUserCartItem(
    prisma: PrismaClient,
    userId: string,
    itemId: string,
  ): Promise<TCartResponse> {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      select: { id: true },
    });
    if (!item) {
      throw errorHandler.httpError(404, "Cart item not found");
    }

    await prisma.cartItem.delete({
      where: { id: item.id },
    });

    return this.getUserCart(prisma, userId);
  }
}

export default new CartService();
