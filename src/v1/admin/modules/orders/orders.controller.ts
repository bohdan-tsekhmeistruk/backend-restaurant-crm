import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import {
  type TCreateOrderInput,
  type TDeleteOrderInput,
  type TGetOrderByIdParam,
  type TSearchOrdersInput,
  type TUpdateOrderInput,
} from "./dto/orders.dto.js";
import ordersService from "./orders.service.js";

class OrdersController {
  /**
   * Search for orders
   * @param {Context<TServerContext, "/search", TSearchOrdersInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the orders
   */
  async searchOrders(c: Context<TServerContext, "/search", TSearchOrdersInput>) {
    try {
      const prisma = c.get("prisma");
      const query = c.req.valid("query");

      const orders = await ordersService.searchOrders(prisma, query);

      return c.json(orders);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Get an order by id
   * @param {Context<TServerContext, "/:id", TGetOrderByIdParam>} c - The context object
   * @returns {Promise<Response>} - The response object with the order
   */
  async getOrderById(c: Context<TServerContext, "/:id", TGetOrderByIdParam>) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");

      const order = await ordersService.getOrderById(prisma, id);

      return c.json(order);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Create an order for a user
   * @param {Context<TServerContext, "/", TCreateOrderInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the created order
   */
  async createOrder(c: Context<TServerContext, "/", TCreateOrderInput>) {
    try {
      const prisma = c.get("prisma");
      const body = c.req.valid("json");

      const order = await ordersService.createOrder(prisma, body);

      return c.json(order, 201);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Update an order status
   * @param {Context<TServerContext, "/:id", TUpdateOrderInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated order
   */
  async updateOrder(c: Context<TServerContext, "/:id", TUpdateOrderInput>) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const order = await ordersService.updateOrder(prisma, id, body);

      return c.json(order);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Delete an order
   * @param {Context<TServerContext, "/:id", TDeleteOrderInput>} c - The context object
   * @returns {Promise<Response>} - The empty response object with 204 status
   */
  async deleteOrder(c: Context<TServerContext, "/:id", TDeleteOrderInput>) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");

      await ordersService.deleteOrder(prisma, id);

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new OrdersController();
