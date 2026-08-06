import type { PrismaClient } from "src/generated/prisma/client.js";
import {
  OrderSelect,
  TSearchOrdersQuery,
  type TCreateOrderBody,
  type TOrderResponse,
  type TUpdateOrderBody,
} from "./dto/orders.dto.js";
import errorHandler from "src/lib/error.handler.js";

class OrdersService {
  /**
   * Search for orders
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TSearchOrdersQuery} query - The query object
   * @returns {Promise<TOrderResponse[]>} - The orders
   */
  async searchOrders(
    prisma: PrismaClient,
    query: TSearchOrdersQuery,
  ): Promise<TOrderResponse[]> {
    const orders = await prisma.order.findMany({
      where: {
        ...(query.userId && { userId: query.userId }),
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
   * Get an order by id
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the order
   * @returns {Promise<TOrderResponse>} - The order
   */
  async getOrderById(
    prisma: PrismaClient,
    id: string,
  ): Promise<TOrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id },
      select: OrderSelect,
    });

    if (!order) {
      throw errorHandler.httpError(404, "Order not found");
    }

    return order;
  }

  /**
   * Create an order for a user
   * @param {PrismaClient} prisma - The Prisma client
   * @param {TCreateOrderBody} body - The order data
   * @returns {Promise<TOrderResponse>} - The created order
   */
  async createOrder(
    prisma: PrismaClient,
    body: TCreateOrderBody,
  ): Promise<TOrderResponse> {
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    });
    if (!user) {
      throw errorHandler.httpError(404, "User not found");
    }

    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((item) => item.productId) } },
      select: { id: true, isAvailable: true },
    });
    if (products.length !== body.items.length) {
      throw errorHandler.httpError(404, "Some products not found");
    }
    if (products.some((product) => !product.isAvailable)) {
      throw errorHandler.httpError(400, "Some products are not available");
    }

    const order = await prisma.order.create({
      data: {
        userId: body.userId,
        items: {
          create: body.items,
        },
      },
      select: OrderSelect,
    });

    return order;
  }

  /**
   * Update an order status
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the order
   * @param {TUpdateOrderBody} body - The order data
   * @returns {Promise<TOrderResponse>} - The updated order
   */
  async updateOrder(
    prisma: PrismaClient,
    id: string,
    body: TUpdateOrderBody,
  ): Promise<TOrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) {
      throw errorHandler.httpError(404, "Order not found");
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: body.status },
      select: OrderSelect,
    });

    return updatedOrder;
  }

  /**
   * Delete an order with its items
   * @param {PrismaClient} prisma - The Prisma client
   * @param {string} id - The id of the order
   * @returns {Promise<void>} - Return void if success
   */
  async deleteOrder(prisma: PrismaClient, id: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) {
      throw errorHandler.httpError(404, "Order not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });
      await tx.order.delete({
        where: { id },
      });
    });

    return;
  }
}

export default new OrdersService();
