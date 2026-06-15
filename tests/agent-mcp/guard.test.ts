import { afterEach, beforeEach, expect, test } from "vitest";

import { assertTestDatabase } from "@/tools/agent-mcp/guard";

const saved = { ...process.env };
beforeEach(() => {
  process.env.DATABASE_URI = "postgres://test-branch/neondb";
  process.env.AGENT_MCP_CONFIRM_TEST_DB = "1";
  delete process.env.VERCEL_ENV;
});
afterEach(() => {
  process.env = { ...saved };
});

test("passes when a DB is set and test-DB is confirmed", () => {
  expect(() => assertTestDatabase()).not.toThrow();
});

test("throws when confirmation flag is missing", () => {
  delete process.env.AGENT_MCP_CONFIRM_TEST_DB;
  expect(() => assertTestDatabase()).toThrow(/AGENT_MCP_CONFIRM_TEST_DB/);
});

test("throws in production", () => {
  process.env.VERCEL_ENV = "production";
  expect(() => assertTestDatabase()).toThrow(/VERCEL_ENV=production/);
});

test("throws on a preview deployment too", () => {
  process.env.VERCEL_ENV = "preview";
  expect(() => assertTestDatabase()).toThrow(/VERCEL_ENV=preview/);
});

test("throws when no database URL is set", () => {
  delete process.env.DATABASE_URI;
  delete process.env.POSTGRES_URL;
  expect(() => assertTestDatabase()).toThrow(/DATABASE_URI/);
});
