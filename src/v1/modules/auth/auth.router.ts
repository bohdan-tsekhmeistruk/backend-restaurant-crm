import { Hono } from "hono";
import { validator } from "hono/validator";
import authController from "./auth.controller.js";
import { z } from "zod";
import AuthMiddleware from "src/lib/auth/auth.middleware.js";

const authRouter = new Hono();

authRouter.post(
  "/login",
  validator("json", async (value, c) => {
    const schema = z.object({
      email: z.email(),
      password: z.string().min(8).max(32),
    });
    const result = schema.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  authController.login,
);

authRouter.post(
  "/register",
  validator("json", async (value, c) => {
    const schema = z.object({
      email: z.email(),
      password: z
        .string()
        .min(12, "Password must be at least 12 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(
          /[^A-Za-z0-9]/,
          "Password must contain at least one special character",
        ),
      firstName: z.string().min(1).max(32),
      lastName: z.string().min(1).max(32),
      phone: z.string().min(1).max(32),
    });
    const result = schema.safeParse(value);
    if (!result.success) {
      return c.json({ message: JSON.parse(result.error.message) }, 400);
    }
    return result.data;
  }),
  authController.register,
);

authRouter.post("/refresh-token", AuthMiddleware, authController.refreshToken);

export default authRouter;
