/**
 * Central environment configuration for the database package.
 * All process.env access must go through this file.
 */

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const IS_DEVELOPMENT = NODE_ENV === "development";
