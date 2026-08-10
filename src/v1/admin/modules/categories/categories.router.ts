import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  CategorySchema,
  cookieSecurity,
  errorResponse,
  jsonContent,
  noContent,
} from "src/lib/openapi.js";
import categoriesController from "./categories.controller.js";
import {
  TCreateCategoryBody,
  TGetCategoryByIdParam,
  TSearchCategoriesQuery,
  TUpdateCategoryBody,
} from "./dto/categories.dto.js";

const categoriesRouter = new OpenAPIHono<TServerContext>();

const searchCategoriesRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Admin Categories"],
  summary: "Search categories",
  description:
    "Paginated search over categories (`name`, `parentId`, `page`, `limit`).",
  security: cookieSecurity,
  request: {
    query: TSearchCategoriesQuery,
  },
  responses: {
    200: jsonContent(z.array(CategorySchema), "The matching categories"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
  },
});

const getCategoryByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Admin Categories"],
  summary: "Get category by id",
  security: cookieSecurity,
  request: {
    params: TGetCategoryByIdParam,
  },
  responses: {
    200: jsonContent(CategorySchema, "The category"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Category not found"),
  },
});

const createCategoryRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Admin Categories"],
  summary: "Create category",
  description: "Creates a category, optionally nested under a parent category.",
  security: cookieSecurity,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TCreateCategoryBody } },
    },
  },
  responses: {
    201: jsonContent(CategorySchema, "The created category"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Parent category not found"),
  },
});

const updateCategoryRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Admin Categories"],
  summary: "Update category",
  security: cookieSecurity,
  request: {
    params: TGetCategoryByIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateCategoryBody } },
    },
  },
  responses: {
    200: jsonContent(CategorySchema, "The updated category"),
    400: errorResponse("Validation error or category cannot be its own parent"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Category or parent category not found"),
  },
});

const deleteCategoryRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Admin Categories"],
  summary: "Delete category",
  description: "Categories with products cannot be deleted.",
  security: cookieSecurity,
  request: {
    params: TGetCategoryByIdParam,
  },
  responses: {
    204: noContent("Category deleted"),
    400: errorResponse("Validation error or category has products"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("Category not found"),
  },
});

categoriesRouter.openapi(searchCategoriesRoute, (c) =>
  categoriesController.searchCategories(c),
);
categoriesRouter.openapi(getCategoryByIdRoute, (c) =>
  categoriesController.getCategoryById(c),
);
categoriesRouter.openapi(createCategoryRoute, (c) =>
  categoriesController.createCategory(c),
);
categoriesRouter.openapi(updateCategoryRoute, (c) =>
  categoriesController.updateCategory(c),
);
categoriesRouter.openapi(deleteCategoryRoute, (c) =>
  categoriesController.deleteCategory(c),
);

export default categoriesRouter;
