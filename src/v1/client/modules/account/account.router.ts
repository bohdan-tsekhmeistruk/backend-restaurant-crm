import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import accountController from "./account.controller.js";
import { validator } from "hono/validator";
import { TUpdateAccountBody } from "./dto/account.dto.js";

const accountRouter = new Hono();

accountRouter.get("/me", AuthMiddleware, accountController.getMyAccount);

accountRouter.patch(
  "/update",
  AuthMiddleware,
  validator("json", (value, c) => {
    const result = TUpdateAccountBody.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  accountController.updateMyAccount,
);

export default accountRouter;
