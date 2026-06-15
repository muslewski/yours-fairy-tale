// Side-effect import — MUST run before any module that imports Payload, because
// payload.config.ts reads process.env at module eval. Keep this import FIRST in
// server.ts and never import Payload/tools from here.
import { loadAgentEnv } from "./env";
import { assertTestDatabase } from "./guard";

loadAgentEnv();
assertTestDatabase();
