import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import {
  type TGetCategoryByIdParam,
  type TSearchCategoriesInput,
} from "./dto/categories.dto.js";
import categoriesService from "./categories.service.js";

class CategoriesController {
  /**
   * Search for categories
   * @param {Context<TServerContext, "/search", TSearchCategoriesInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the categories
   */
  async searchCategories(
    c: Context<TServerContext, "/search", TSearchCategoriesInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const query = c.req.valid("query");

      const categories = await categoriesService.searchCategories(
        prisma,
        query,
      );

      return c.json(categories);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Get a category by id
   * @param {Context<TServerContext, "/:id", TGetCategoryByIdParam>} c - The context object
   * @returns {Promise<Response>} - The response object with the category
   */
  async getCategoryById(
    c: Context<TServerContext, "/:id", TGetCategoryByIdParam>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");

      const category = await categoriesService.getCategoryById(prisma, id);

      return c.json(category);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new CategoriesController();
