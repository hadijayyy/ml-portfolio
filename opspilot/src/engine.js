import { publicIssues } from "../data/issues.js";
import { knowledgeBase } from "../data/knowledge.js";
import { accounts, serviceStatus } from "../data/operations.js";

const stop = new Set(["the","a","an","and","or","to","of","in","on","for","with","is","are","it","my","our","i","we","this","that","when","after","from","at","be","as","but","not","can","cannot","keeps","keep"]);
const tokenize = (text = "") => [...new Set(text.toLowerCase().replace(/[^a-z0-9\-_. ]/g," ").split(/\s+/).filter(t => t.length > 2 && !stop.has(t)))];
const overlap = (a,b) => {
  const A = tokenize(a); const B = new Set(tokenize(b));
  if (!A.length) return 0;
  const hit = A.filter(x => B.has(x)).length;
  return hit / Math.sqrt(A.length * Math.max(B.size, 1));
};
const includesAny = (text, words) => words.some(w => text.includes(w));

export function classifyTicket(ticket) {
  const t = ticket.toLowerCase();
  if (includesAny(t,["403","401","forbidden","signature","token","auth","permission"])) return {category:"authentication", confidence:0.96};
  if (includesAny(t,["503","502","500","down","unavailable","outage","viewer","service unavailable"])) return {category:"availability", confidence:0.94};
  if (includesAny(t,["slow","latency","cpu","bottleneck","throughput","takes","performance"])) return {category:"performance", confidence:0.91};
  if (includesAny(t,["memory","oom","out of memory","ram","allocation"])) return {category:"memory", confidence:0.95};
  if (includesAny(t,["missing rows","drops rows","resume","checkpoint","corrupt","precision","replay"])) return {category:"data-integrity", confidence:0.92};
  if (includesAny(t,["schema","dtype","column","cast","jsonl","arrow","pandas"])) return {category:"schema", confidence:0.87};
  return {category:"general", confidence:0.68};
}

function retrieveIssues(ticket, category) {
  return publicIssues.map(issue => {
    const score = overlap(ticket, `${issue.title} ${issue.summary} ${issue.symptoms.join(" ")}`) + (issue.category === category ? 0.25 : 0);
    return {...issue, score: Math.min(score,1)};
  }).sort((a,b)=>b.score-a.score).slice(0,3);
}

function retrieveDocs(ticket, category) {
  return knowledgeBase.map(doc => {
    const score = overlap(ticket, `${doc.title} ${doc.text}`) + (doc.category === category ? 0.2 : 0);
    return {...doc, score: Math.min(score,1)};
  }).sort((a,b)=>b.score-a.score).slice(0,3);
}

function inferAccount(ticket) {
  const upper = ticket.toUpperCase();
  return accounts.find(a => upper.includes(a.accountId) || upper.includes(a.company.toUpperCase())) || accounts[0];
}

function operationalCheck(ticket, category, account) {
  const t = ticket.toLowerCase();
  let service = category === "availability" && t.includes("viewer") ? "dataset-viewer" : "dataset-streaming";
  const status = serviceStatus.find(s => s.service === service && s.region === account.region) || serviceStatus.find(s=>s.service===service) || null;
  return {account, service, status};
}

function deriveRootCause(category, issue, op) {
  if (category === "authentication" && op.status?.status === "degraded") return "Likely upstream signing/CDN degradation rather than an account-specific credential failure.";
  if (category === "availability" && op.status?.status === "degraded") return `Likely active ${op.service} service incident in ${op.account.region}.`;
  if (category === "memory") return "Likely memory amplification from fragmented Arrow/Pandas conversion rather than raw dataset size alone.";
  if (category === "performance") return "Likely hot-path serialization/state-management overhead in the streaming pipeline.";
  if (category === "data-integrity") return "Likely state or type-handling defect capable of silent replay, row loss, or precision corruption.";
  if (category === "schema") return "Likely optimized-path schema/type inconsistency; compare against a reference execution path.";
  return issue ? `Closest historical pattern: ${issue.title}.` : "Insufficient evidence for a single root cause; escalate with captured diagnostics.";
}

function riskFor(category) {
  if (["data-integrity","schema"].includes(category)) return {level:"high", approval:true, reason:"Potential silent data corruption or destructive remediation requires human review."};
  if (["authentication","availability"].includes(category)) return {level:"medium", approval:true, reason:"Operational changes can affect access or production availability."};
  return {level:"low", approval:false, reason:"Recommended actions are diagnostic and non-destructive."};
}

function recommendations(category, issue, op) {
  const common = [];
  if (op.status?.status === "degraded") common.push(`Correlate with ${op.status.incident} and avoid unnecessary customer-side credential/config changes while the service is degraded.`);
  if (category === "authentication") return [...common, "Reproduce against a known-public dataset without credentials.", "Compare streaming and non-streaming requests from the same region.", "If public resources also fail, escalate to the platform/CDN owner with timestamps and request IDs."];
  if (category === "availability") return [...common, "Probe at least three independent public endpoints.", "Capture region, response codes, and timestamps.", "Escalate as a service incident when failures are cross-dataset or cross-endpoint."];
  if (category === "memory") return [...common, "Inspect Arrow chunk count and fragmentation.", "Flatten/consolidate indices before pandas round-trip.", "Benchmark direct Arrow/list conversion and confirm memory returns to data-proportional levels."];
  if (category === "performance") return [...common, "Profile CPU time around state serialization and iterator wrappers.", "Reduce expensive copy/state operations in the hot path.", "Benchmark throughput before/after with identical worker and shard settings."];
  if (category === "data-integrity") return [...common, "Pause downstream mutating writes until the reproduction is understood.", "Compare full-run output with checkpoint/resume output using row IDs/checksums.", "Add regression tests for repeated resume cycles or high-magnitude numeric values before remediation."];
  if (category === "schema") return [...common, "Compare the optimized Arrow/Pandas path against a plain reference path.", "Assert schema, column order, dtype, and null semantics.", "Add a minimal regression fixture before changing production parsing logic."];
  return issue?.resolution || ["Capture a minimal reproduction.","Retrieve related documentation and historical incidents.","Escalate if confidence remains low."];
}

export function investigate(ticket) {
  const start = Date.now();
  const cls = classifyTicket(ticket);
  const issues = retrieveIssues(ticket, cls.category);
  const docs = retrieveDocs(ticket, cls.category);
  const account = inferAccount(ticket);
  const op = operationalCheck(ticket, cls.category, account);
  const top = issues[0];
  const evidenceStrength = Math.min(1, ((top?.score || 0) * 0.65) + ((docs[0]?.score || 0) * 0.25) + (op.status ? 0.1 : 0));
  const confidence = Math.round(Math.max(55, Math.min(97, (cls.confidence*55 + evidenceStrength*45)*100)))/100;
  const risk = riskFor(cls.category);
  return {
    ticket,
    classification: {category: cls.category, confidence: Math.round(cls.confidence*100)},
    rootCause: deriveRootCause(cls.category, top, op),
    confidence: Math.round(confidence),
    risk,
    recommendation: recommendations(cls.category, top, op),
    evidence: {
      issues: issues.map(x => ({id:x.id,title:x.title,summary:x.summary,source:x.source,relevance:Math.round(x.score*100)})),
      docs: docs.map(x => ({id:x.id,title:x.title,text:x.text,source:x.source,relevance:Math.round(x.score*100)})),
      operations: op
    },
    trace: [
      {step:"Classify incident", tool:"classifier", status:"complete", detail:`${cls.category} · ${Math.round(cls.confidence*100)}% confidence`},
      {step:"Search historical tickets", tool:"issue_retriever", status:"complete", detail:`${issues.length} evidence candidates retrieved`},
      {step:"Search knowledge base", tool:"rag_retriever", status:"complete", detail:`${docs.length} knowledge chunks retrieved`},
      {step:"Query account context", tool:"account_db", status:"complete", detail:`${account.accountId} · ${account.plan} · ${account.region}`},
      {step:"Check service health", tool:"ops_status", status:"complete", detail:`${op.service} · ${op.status?.status || "unknown"}`},
      {step:"Apply approval policy", tool:"policy_engine", status:"complete", detail:`${risk.level} risk · ${risk.approval ? "approval required" : "auto-safe"}`}
    ],
    meta: {engine:"deterministic-demo", latencyMs: Math.max(38, Date.now()-start+38), corpusIssues: publicIssues.length, knowledgeChunks: knowledgeBase.length}
  };
}
