import test from "node:test";
import assert from "node:assert/strict";
import { investigate,classifyTicket,matchAccount,planTools } from "../src/engine.js";
import { goldenSet } from "../evaluation/golden-set.js";

for(const c of goldenSet){
  test(`golden ${c.id}`,()=>{
    const r=investigate(c.ticket);
    assert.equal(r.classification.category,c.category);
    assert.ok(r.evidence.issues.some(x=>x.id===c.issue));
    assert.equal(r.risk.approval,c.approval);
    assert.ok(r.evidenceScore>=50&&r.evidenceScore<=96);
  });
}

test("unknown ticket does not fabricate an account",()=>{
  const r=investigate("Streaming throughput is slow for a public dataset but no customer account was provided.");
  assert.equal(r.evidence.operations.accountMatched,false);
  assert.equal(r.evidence.operations.account,null);
});

test("data-integrity plan skips irrelevant service health",()=>{
  const account=matchAccount("Rows disappear after checkpoint resume");
  const tools=planTools("Rows disappear after checkpoint resume","data-integrity",account);
  assert.equal(tools.includes("service_health"),false);
  assert.equal(tools.includes("policy_engine"),true);
});

test("authentication plan includes service health",()=>{
  const account=matchAccount("ACME-001 returns 403 forbidden");
  const tools=planTools("ACME-001 returns 403 forbidden","authentication",account);
  assert.equal(tools.includes("account_lookup"),true);
  assert.equal(tools.includes("service_health"),true);
});

test("public evidence stays source linked",()=>{
  const r=investigate("Arrow concatenate drops columns and schema cast fails");
  for(const e of r.evidence.issues)assert.match(e.source,/^https:\/\/github\.com\/huggingface\/datasets\/issues\//);
});

test("classification confidence is explicit and evidence score is separate",()=>{
  const r=investigate("403 forbidden signature error while streaming public content");
  assert.equal(r.classification.confidence,96);
  assert.notEqual(r.evidenceScore,r.classification.confidence);
});
