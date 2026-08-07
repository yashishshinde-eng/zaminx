import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Zeminex Global API",
      version: "1.0.0",
      description:
        "Investment & referral platform API. Phase 1 covers authentication and health. " +
        "Subsequent phases add wallets, deposits, withdrawals, compensation, bonanza, and admin.",
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1`, description: "Local development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // Pull OpenAPI annotations from JSDoc @openapi blocks across the codebase.
  apis: ["./src/docs/**/*.yaml", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);