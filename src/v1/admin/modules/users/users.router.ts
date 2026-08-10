import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  cookieSecurity,
  errorResponse,
  jsonContent,
  noContent,
  UserSchema,
} from "src/lib/openapi.js";
import usersController from "./users.controller.js";
import {
  TGetUserByIdParam,
  TSearchUsersQuery,
  TUpdateUserBody,
} from "./dto/users.dto.js";

const usersRouter = new OpenAPIHono<TServerContext>();

const searchUsersRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Admin Users"],
  summary: "Search users",
  description:
    "Paginated search over users (`email`, `name`, `role`, `status`, `page`, `limit`).",
  security: cookieSecurity,
  request: {
    query: TSearchUsersQuery,
  },
  responses: {
    200: jsonContent(z.array(UserSchema), "The matching users"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
  },
});

const getUserByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Admin Users"],
  summary: "Get user by id",
  security: cookieSecurity,
  request: {
    params: TGetUserByIdParam,
  },
  responses: {
    200: jsonContent(UserSchema, "The user"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("User not found"),
  },
});

const updateUserRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Admin Users"],
  summary: "Update user",
  description:
    "Updates profile fields, `role` and/or `status` (`ACTIVE` / `BLOCKED`). Blocking revokes all sessions. Admins cannot change their own role or status.",
  security: cookieSecurity,
  request: {
    params: TGetUserByIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateUserBody } },
    },
  },
  responses: {
    200: jsonContent(UserSchema, "The updated user"),
    400: errorResponse("Validation error or attempt to change own role/status"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("User not found"),
  },
});

const deleteUserRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Admin Users"],
  summary: "Delete user",
  description:
    "Soft-deletes the user (`status` → `DELETED`) and revokes all sessions. Admins cannot delete their own account.",
  security: cookieSecurity,
  request: {
    params: TGetUserByIdParam,
  },
  responses: {
    204: noContent("User deleted"),
    400: errorResponse(
      "Validation error, attempt to delete own account or user already deleted",
    ),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Admin access required"),
    404: errorResponse("User not found"),
  },
});

usersRouter.openapi(searchUsersRoute, (c) => usersController.searchUsers(c));
usersRouter.openapi(getUserByIdRoute, (c) => usersController.getUserById(c));
usersRouter.openapi(updateUserRoute, (c) => usersController.updateUser(c));
usersRouter.openapi(deleteUserRoute, (c) => usersController.deleteUser(c));

export default usersRouter;
