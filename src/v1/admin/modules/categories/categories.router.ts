import { Hono } from "hono";
import categoriesController from "./categories.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TCreateCategoryBody,
  TGetCategoryByIdParam,
  TSearchCategoriesQuery,
  TUpdateCategoryBody,
} from "./dto/categories.dto.js";

const categoriesRouter = new Hono();

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
categoriesRouter.post(
  "/",
  sValidator("json", TCreateCategoryBody),
  categoriesController.createCategory,
);
categoriesRouter.patch(
  "/:id",
  sValidator("param", TGetCategoryByIdParam),
  sValidator("json", TUpdateCategoryBody),
  categoriesController.updateCategory,
);
categoriesRouter.delete(
  "/:id",
  sValidator("param", TGetCategoryByIdParam),
  categoriesController.deleteCategory,
);

export default categoriesRouter;
