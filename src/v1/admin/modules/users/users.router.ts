import { Hono } from "hono";
import usersController from "./users.controller.js";
import { sValidator } from "@hono/standard-validator";
import {
  TGetUserByIdParam,
  TSearchUsersQuery,
  TUpdateUserBody,
} from "./dto/users.dto.js";

const usersRouter = new Hono();

usersRouter.get(
  "/search",
  sValidator("query", TSearchUsersQuery),
  usersController.searchUsers,
);
usersRouter.get(
  "/:id",
  sValidator("param", TGetUserByIdParam),
  usersController.getUserById,
);
usersRouter.patch(
  "/:id",
  sValidator("param", TGetUserByIdParam),
  sValidator("json", TUpdateUserBody),
  usersController.updateUser,
);
usersRouter.delete(
  "/:id",
  sValidator("param", TGetUserByIdParam),
  usersController.deleteUser,
);

export default usersRouter;
