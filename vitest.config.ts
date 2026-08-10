import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      src: fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "development",
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5432/restaurant-crm-test?schema=public",
      ACCESS_TOKEN_SECRET: "test-access-token-secret",
      REFRESH_TOKEN_SECRET: "test-refresh-token-secret",
      COOKIE_SECRET: "test-cookie-secret",
      PASSWORD_SALT_ROUNDS: "4",
      EMAIL_USER: "test@example.com",
      EMAIL_PASSWORD: "test-email-password",
    },
        coverage: {
          provider: "v8",
          include: ["src/**/*.ts"],
          exclude: [
            "src/generated/**",
            // thin bootstrap that only calls serve()
            "src/index.ts",
            // wired to a real PostgreSQL connection; replaced by an in-memory
            // fake in tests
            "src/lib/prisma.ts",
            // type-only files carry no runtime code
            "src/lib/auth/interfaces/**",
            "src/**/*.d.ts",
          ],
          reporter: ["text", "html"],
        },
  },
});
