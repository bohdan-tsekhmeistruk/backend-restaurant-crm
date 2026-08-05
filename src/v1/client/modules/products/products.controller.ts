import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import {
  type TGetProductByIdParam,
  type TSearchProductsInput,
} from "./dto/products.dto.js";
import productsService from "./products.service.js";

class ProductsController {
  /**
   * Search for products
   * @param {Context<TServerContext, "/search", TSearchProductsInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the products
   */
  async searchProducts(
    c: Context<TServerContext, "/search", TSearchProductsInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const query = c.req.valid("query");

      const products = await productsService.searchProducts(prisma, query);

      return c.json(products);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Get a product by id
   * @param {Context<TServerContext, "/:id", TGetProductByIdParam>} c - The context object
   * @returns {Promise<Response>} - The response object with the product
   */
  async getProductById(
    c: Context<TServerContext, "/:id", TGetProductByIdParam>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");

      const product = await productsService.getProductById(prisma, id);

      return c.json(product);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new ProductsController();
