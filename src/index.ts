import { serve } from "@hono/node-server";
import app from "src/app.js";
import "dotenv/config";

serve(
  {
    fetch: app.fetch,
    port: parseInt(process.env.PORT || "3000"),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
    console.log(
      `OpenAPI spec: http://localhost:${info.port}/doc — Swagger UI: http://localhost:${info.port}/docs`,
    );
  },
);
