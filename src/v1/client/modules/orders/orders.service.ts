import { OrderStatus, type PrismaClient } from "src/generated/prisma/client.js";
import {
  OrderSelect,
  TSearchOrdersQuery,
  type TOrderResponse,
} from "./dto/orders.dto.js";
import errorHandler from "src/lib/error.handler.js";

class OrdersService {
  /**
   * Get the user's orders
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {TSearchOrdersQuery} query - The query object
   * @returns {Promise<TOrderResponse[]>} - The orders
   */
  async getMyOrders(
    prisma: PrismaClient,
    userId: string,
    query: TSearchOrdersQuery,
  ): Promise<TOrderResponse[]> {
    const orders = await prisma.order.findMany({
      where: {
        userId,
        ...(query.status && { status: query.status }),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: (query.page - 1) * query.limit,
      select: OrderSelect,
    });
    return orders;
  }

  /**
   * Get a user's order by id
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {string} id - The id of the order
   * @returns {Promise<TOrderResponse>} - The order
   */
  async getMyOrderById(
    prisma: PrismaClient,
    userId: string,
    id: string,
  ): Promise<TOrderResponse> {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      select: OrderSelect,
    });

    if (!order) {
      throw errorHandler.httpError(404, "Order not found");
    }

    return order;
  }

  /**
   * Create an order from the user's cart and clear the cart
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @returns {Promise<TOrderResponse>} - The created order
   */
  async createMyOrder(
    prisma: PrismaClient,
    userId: string,
  ): Promise<TOrderResponse> {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            product: { select: { isAvailable: true } },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) {
      throw errorHandler.httpError(400, "Cart is empty");
    }

    if (cart.items.some((item) => !item.product.isAvailable)) {
      throw errorHandler.httpError(
        400,
        "Some products in the cart are not available",
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        select: OrderSelect,
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return order;
  }

  /**
   * Cancel a user's order, only pending orders can be cancelled
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} userId - The id of the user
   * @param {string} id - The id of the order
   * @returns {Promise<TOrderResponse>} - The cancelled order
   */
  async cancelMyOrder(
    prisma: PrismaClient,
    userId: string,
    id: string,
  ): Promise<TOrderResponse> {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    });
    if (!order) {
      throw errorHandler.httpError(404, "Order not found");
    }
    if (order.status !== OrderStatus.PENDING) {
      throw errorHandler.httpError(400, "Only pending orders can be cancelled");
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
      select: OrderSelect,
    });

    return updatedOrder;
  }
}

export default new OrdersService();
