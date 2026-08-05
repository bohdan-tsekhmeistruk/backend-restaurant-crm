import type { Context } from "hono";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import errorHandler from "src/lib/error.handler.js";
import {
  type TCreateCategoryInput,
  type TDeleteCategoryInput,
  type TGetCategoryByIdParam,
  type TSearchCategoriesInput,
  type TUpdateCategoryInput,
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

  /**
   * Create a category
   * @param {Context<TServerContext, "/", TCreateCategoryInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the created category
   */
  async createCategory(c: Context<TServerContext, "/", TCreateCategoryInput>) {
    try {
      const prisma = c.get("prisma");
      const body = c.req.valid("json");

      const category = await categoriesService.createCategory(prisma, body);

      return c.json(category, 201);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Update a category
   * @param {Context<TServerContext, "/:id", TUpdateCategoryInput>} c - The context object
   * @returns {Promise<Response>} - The response object with the updated category
   */
  async updateCategory(
    c: Context<TServerContext, "/:id", TUpdateCategoryInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const category = await categoriesService.updateCategory(
        prisma,
        id,
        body,
      );

      return c.json(category);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }

  /**
   * Delete a category
   * @param {Context<TServerContext, "/:id", TDeleteCategoryInput>} c - The context object
   * @returns {Promise<Response>} - The empty response object with 204 status
   */
  async deleteCategory(
    c: Context<TServerContext, "/:id", TDeleteCategoryInput>,
  ) {
    try {
      const prisma = c.get("prisma");
      const { id } = c.req.valid("param");

      await categoriesService.deleteCategory(prisma, id);

      return c.body(null, 204);
    } catch (error) {
      return errorHandler.handle(c, error);
    }
  }
}

export default new CategoriesController();
