import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  CategorySchema,
  cookieSecurity,
  errorResponse,
  jsonContent,
} from "src/lib/openapi.js";
import categoriesController from "./categories.controller.js";
import {
  TGetCategoryByIdParam,
  TSearchCategoriesQuery,
} from "./dto/categories.dto.js";

const categoriesRouter = new OpenAPIHono<TServerContext>();

categoriesRouter.use(AuthMiddleware);

const searchCategoriesRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Categories"],
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
    403: errorResponse("Account is not active"),
  },
});

const getCategoryByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Categories"],
  summary: "Get category by id",
  security: cookieSecurity,
  request: {
    params: TGetCategoryByIdParam,
  },
  responses: {
    200: jsonContent(CategorySchema, "The category"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
    404: errorResponse("Category not found"),
  },
});

categoriesRouter.openapi(searchCategoriesRoute, (c) =>
  categoriesController.searchCategories(c),
);
categoriesRouter.openapi(getCategoryByIdRoute, (c) =>
  categoriesController.getCategoryById(c),
);

export default categoriesRouter;
