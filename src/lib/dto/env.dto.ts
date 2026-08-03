export type TEnv = {
  NODE_ENV: "development" | "production";
  PORT?: number;
  DATABASE_URL: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  COOKIE_SECRET: string;
};
