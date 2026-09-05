import test from "node:test";
import assert from "node:assert/strict";
import { investigate, classifyTicket } from "../src/engine.js";

test("classifies 403 streaming failures as authentication", () => {
  const r = classifyTicket("Streaming fails with 403 Forbidden SignatureError invalid key pair");
  assert.equal(r.category, "authentication");
  assert.ok(r.confidence > 0.9);
});

test("retrieves public issue evidence", () => {
  const r = investigate("ACME-001 streaming returns 403 forbidden invalid key pair id");
  assert.equal(r.evidence.issues[0].id, 8328);
  assert.ok(r.evidence.issues[0].relevance > 30);
  assert.ok(r.evidence.issues[0].source.startsWith("https://github.com/"));
});

test("data-integrity incidents require approval", () => {
  const r = investigate("Rows disappear after checkpoint resume and second resume replays the stream");
  assert.equal(r.risk.level, "high");
  assert.equal(r.risk.approval, true);
});

test("performance diagnostics are non-destructive", () => {
  const r = investigate("CPU bottleneck and slow state_dict deepcopy when shuffling shards");
  assert.equal(r.classification.category, "performance");
  assert.equal(r.risk.approval, false);
});
