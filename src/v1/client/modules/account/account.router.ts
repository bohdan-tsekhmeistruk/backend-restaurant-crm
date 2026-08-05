import { Hono } from "hono";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import accountController from "./account.controller.js";
import { validator } from "hono/validator";
import {
  TCheckEmailVerificationBody,
  TCheckPasswordResetBody,
  TSendPasswordResetBody,
  TUpdateAccountBody,
} from "./dto/account.dto.js";

const accountRouter = new Hono();

accountRouter.post(
  "/send-password-reset",
  validator("json", (value, c) => {
    const result = TSendPasswordResetBody.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  accountController.sendPasswordResetEmail,
);

accountRouter.post(
  "/check-password-reset",
  validator("json", (value, c) => {
    const result = TCheckPasswordResetBody.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  accountController.checkPasswordReset,
);

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
