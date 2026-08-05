import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import accountController from "./account.controller.js";
import { validator } from "hono/validator";
import {
  TCheckEmailVerificationBody,
  TUpdateAccountBody,
} from "./dto/account.dto.js";

const accountRouter = new Hono();

// Middleware to authenticate the user
accountRouter.use(AuthMiddleware);

accountRouter.get("/me", accountController.getMyAccount);

accountRouter.patch(
  "/update",
  validator("json", (value, c) => {
    const result = TUpdateAccountBody.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  accountController.updateMyAccount,
);

accountRouter.post(
  "/send-email-verification",
  accountController.sendEmailVerification,
);

accountRouter.post(
  "/check-email-verification",
  validator("json", (value, c) => {
    const result = TCheckEmailVerificationBody.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  accountController.checkEmailVerification,
);

export default accountRouter;
