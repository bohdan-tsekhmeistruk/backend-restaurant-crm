import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  CartSelect,
  type TAddCartItemBody,
  type TCartResponse,
  type TUpdateCartItemBody,
} from "./dto/cart.dto.js";
import errorHandler from "src/lib/error.handler.js";

class CartService {
  /**
   * Get the user's cart, creating it on first access
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @returns {Promise<TCartResponse>} - The cart with items
   */
  async getMyCart(
    prisma: PrismaClient,
    userId: string,
  ): Promise<TCartResponse> {
    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: CartSelect,
    });

    return cart;
  }

  /**
   * Add a product to the user's cart, incrementing the quantity if it is already there
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {TAddCartItemBody} body - The item data
   * @returns {Promise<TCartResponse>} - The updated cart with items
   */
  async addCartItem(
    prisma: PrismaClient,
    userId: string,
    body: TAddCartItemBody,
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

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });

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

    return this.getMyCart(prisma, userId);
  }

  /**
   * Update the quantity of a cart item
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {string} itemId - The id of the cart item
   * @param {TUpdateCartItemBody} body - The item data
   * @returns {Promise<TCartResponse>} - The updated cart with items
   */
  async updateCartItem(
    prisma: PrismaClient,
    userId: string,
    itemId: string,
    body: TUpdateCartItemBody,
  ): Promise<TCartResponse> {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      select: { id: true },
    });
    if (!item) {
      throw errorHandler.httpError(404, "Cart item not found");
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: body.quantity },
      select: { id: true },
    });

    return this.getMyCart(prisma, userId);
  }

  /**
   * Remove an item from the user's cart
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {string} itemId - The id of the cart item
   * @returns {Promise<TCartResponse>} - The updated cart with items
   */
  async deleteCartItem(
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

    return this.getMyCart(prisma, userId);
  }
}

export default new CartService();
