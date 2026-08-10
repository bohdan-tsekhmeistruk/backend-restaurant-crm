import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { AuthMiddleware } from "src/lib/auth/auth.middleware.js";
import type { TServerContext } from "src/lib/dto/context.dto.js";
import {
  cookieSecurity,
  errorResponse,
  jsonContent,
  noContent,
  UserSchema,
} from "src/lib/openapi.js";
import accountController from "./account.controller.js";
import {
  TCheckEmailVerificationBody,
  TCheckPasswordResetBody,
  TSendPasswordResetBody,
  TUpdateAccountBody,
} from "./dto/account.dto.js";

const accountRouter = new OpenAPIHono<TServerContext>();

const sendPasswordResetRoute = createRoute({
  method: "post",
  path: "/send-password-reset",
  tags: ["Account"],
  summary: "Send password reset email",
  description: "Sends a time-limited password reset code to the given email.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TSendPasswordResetBody } },
    },
  },
  responses: {
    204: noContent("Password reset email sent"),
    400: errorResponse("Validation error or password reset already sent"),
    404: errorResponse("User not found"),
  },
});

const checkPasswordResetRoute = createRoute({
  method: "post",
  path: "/check-password-reset",
  tags: ["Account"],
  summary: "Reset password",
  description:
    "Verifies the reset code and sets a new password. All existing sessions are revoked.",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TCheckPasswordResetBody } },
    },
  },
  responses: {
    204: noContent("Password updated"),
    400: errorResponse("Validation error or invalid password reset token"),
  },
});

const getMyAccountRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Account"],
  summary: "Get profile",
  description: "Returns the current user's profile.",
  security: cookieSecurity,
  middleware: [AuthMiddleware],
  responses: {
    200: jsonContent(UserSchema, "The current user's profile"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const updateMyAccountRoute = createRoute({
  method: "patch",
  path: "/update",
  tags: ["Account"],
  summary: "Update profile",
  description: "Updates `firstName`, `lastName` and/or `phone`.",
  security: cookieSecurity,
  middleware: [AuthMiddleware],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TUpdateAccountBody } },
    },
  },
  responses: {
    204: noContent("Profile updated"),
    400: errorResponse("Validation error"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const sendEmailVerificationRoute = createRoute({
  method: "post",
  path: "/send-email-verification",
  tags: ["Account"],
  summary: "Send email verification",
  description: "Sends a time-limited email verification token to the user.",
  security: cookieSecurity,
  middleware: [AuthMiddleware],
  responses: {
    204: noContent("Verification email sent"),
    400: errorResponse(
      "Email already verified or verification already requested",
    ),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

const checkEmailVerificationRoute = createRoute({
  method: "post",
  path: "/check-email-verification",
  tags: ["Account"],
  summary: "Verify email",
  description: "Confirms the email with the received token.",
  security: cookieSecurity,
  middleware: [AuthMiddleware],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: TCheckEmailVerificationBody } },
    },
  },
  responses: {
    204: noContent("Email verified"),
    400: errorResponse("Validation error or invalid verification token"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Account is not active"),
  },
});

accountRouter.openapi(sendPasswordResetRoute, (c) =>
  accountController.sendPasswordResetEmail(c),
);
accountRouter.openapi(checkPasswordResetRoute, (c) =>
  accountController.checkPasswordReset(c),
);
accountRouter.openapi(getMyAccountRoute, (c) =>
  accountController.getMyAccount(c),
);
accountRouter.openapi(updateMyAccountRoute, (c) =>
  accountController.updateMyAccount(c),
);
accountRouter.openapi(sendEmailVerificationRoute, (c) =>
  accountController.sendEmailVerification(c),
);
accountRouter.openapi(checkEmailVerificationRoute, (c) =>
  accountController.checkEmailVerification(c),
);

export default accountRouter;
