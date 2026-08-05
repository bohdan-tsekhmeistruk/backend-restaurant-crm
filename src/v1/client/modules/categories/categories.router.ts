import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import categoriesController from "./categories.controller.js";
import {
  TGetCategoryByIdParam,
  TSearchCategoriesQuery,
} from "./dto/categories.dto.js";
import { sValidator } from "@hono/standard-validator";

const categoriesRouter = new Hono();

categoriesRouter.use(AuthMiddleware);

categoriesRouter.get(
  "/search",
  sValidator("query", TSearchCategoriesQuery),
  categoriesController.searchCategories,
);
categoriesRouter.get(
  "/:id",
  sValidator("param", TGetCategoryByIdParam),
  categoriesController.getCategoryById,
);

export default categoriesRouter;
