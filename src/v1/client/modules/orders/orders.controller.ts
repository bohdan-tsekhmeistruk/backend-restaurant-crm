import type { Context } from "hono";
import type { BlankInput } from "hono/types";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import type { TValidatedUserResponse } from "src/lib/auth/interfaces/auth.interface.js";
import {
  type TCancelOrderInput,
  type TGetOrderByIdParam,
  type TSearchOrdersInput,
} from "./dto/orders.dto.js";
import ordersService from "./orders.service.js";

class OrdersController {
  /**
   * Get the current user's orders
   * @param {Context<TServerContext, "/", TSearchOrdersInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the orders
   */
  async getMyOrders(c: Context<TServerContext, "/", TSearchOrdersInput>) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;
      const query = c.req.valid("query");

      const orders = await ordersService.getMyOrders(prisma, user.id, query);

      return c.json(orders);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Get a current user's order by id
   * @param {Context<TServerContext, "/:id", TGetOrderByIdParam>} c - The context object
   * @returns {Promise<Response>} - The response object with the order
   */
  async getMyOrderById(
    c: Context<TServerContext, "/:id", TGetOrderByIdParam>,
  ) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;
      const { id } = c.req.valid("param");

      const order = await ordersService.getMyOrderById(prisma, user.id, id);

      return c.json(order);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Create an order from the current user's cart
   * @param {Context<TServerContext, "/", BlankInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the created order
   */
  async createMyOrder(c: Context<TServerContext, "/", BlankInput>) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;

      const order = await ordersService.createMyOrder(prisma, user.id);

      return c.json(order, 201);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Cancel a current user's order
   * @param {Context<TServerContext, "/:id", TCancelOrderInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the cancelled order
   */
  async cancelMyOrder(c: Context<TServerContext, "/:id", TCancelOrderInput>) {
    try {
      const prisma = c.get("prisma");
      const user = c.get("user") as TValidatedUserResponse;
      const { id } = c.req.valid("param");

      const order = await ordersService.cancelMyOrder(prisma, user.id, id);

      return c.json(order);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new OrdersController();
