import { publicIssues } from "../data/issues.js";
import { knowledgeBase } from "../data/knowledge.js";
import { accounts, serviceStatus } from "../data/operations.js";

const stop = new Set(["the","a","an","and","or","to","of","in","on","for","with","is","are","it","my","our","i","we","this","that","when","after","from","at","be","as","but","not","can","cannot","keeps","keep"]);
const tokenize = (text = "") => [...new Set(text.toLowerCase().replace(/[^a-z0-9\-_. ]/g," ").split(/\s+/).filter(t => t.length > 2 && !stop.has(t)))];
const overlap = (a,b) => { const A=tokenize(a); const B=new Set(tokenize(b)); if(!A.length||!B.size)return 0; return A.filter(x=>B.has(x)).length/Math.sqrt(A.length*B.size); };
const includesAny = (text, words) => words.some(w => text.includes(w));

export function classifyTicket(ticket){
  const t=ticket.toLowerCase();
  if(includesAny(t,["403","401","forbidden","signature","token","auth","permission"])) return {category:"authentication",confidence:.96};
  if(includesAny(t,["503","502","500","down","unavailable","outage","viewer","studio","service unavailable"])) return {category:"availability",confidence:.94};
  if(includesAny(t,["memory","oom","out of memory","ram","allocation","chunk count"])) return {category:"memory",confidence:.95};
  if(includesAny(t,["slow","latency","cpu","bottleneck","throughput","deepcopy","state_dict","performance"])) return {category:"performance",confidence:.91};
  if(includesAny(t,["missing rows","drops rows","resume","checkpoint","corrupt","precision","replay","data loss"])) return {category:"data-integrity",confidence:.92};
  if(includesAny(t,["schema","dtype","column","cast","jsonl","arrow","pandas","bom"])) return {category:"schema",confidence:.87};
  return {category:"general",confidence:.64};
}

export function retrieveIssues(ticket,category){
  return publicIssues.map(issue=>({
    ...issue,
    score:Math.min(overlap(ticket,`${issue.title} ${issue.summary} ${issue.symptoms.join(" ")}`)+(issue.category===category?.24:0),1)
  })).sort((a,b)=>b.score-a.score).slice(0,3);
}

export function retrieveDocs(ticket,category){
  return knowledgeBase.map(doc=>({
    ...doc,
    score:Math.min(overlap(ticket,`${doc.title} ${doc.text}`)+(doc.category===category?.20:0),1)
  })).sort((a,b)=>b.score-a.score).slice(0,3);
}

export function matchAccount(ticket){
  const upper=ticket.toUpperCase();
  const account=accounts.find(a=>upper.includes(a.accountId)||upper.includes(a.company.toUpperCase()))||null;
  return {matched:Boolean(account),account};
}

function inferService(ticket,category){
  const t=ticket.toLowerCase();
  if(t.includes("viewer")||t.includes("studio")) return "dataset-viewer";
  if(category==="authentication"||category==="availability"||category==="performance") return "dataset-streaming";
  return null;
}

export function serviceHealthCheck(ticket,category,accountMatch){
  const service=inferService(ticket,category);
  if(!service) return {service:null,status:null,scope:"not-required"};
  const region=accountMatch.account?.region;
  const exact=region?serviceStatus.find(s=>s.service===service&&s.region===region):null;
  const candidates=serviceStatus.filter(s=>s.service===service);
  const degraded=candidates.find(s=>s.status==="degraded");
  return {service,status:exact||degraded||candidates[0]||null,scope:exact?"account-region":"service-sample"};
}

export function policyFor(category){
  if(["data-integrity","schema"].includes(category)) return {level:"high",approval:true,reason:"Potential silent data corruption requires human review before any mutating remediation."};
  if(["authentication","availability"].includes(category)) return {level:"medium",approval:true,reason:"Access or availability changes can affect production users; approval is required before operational changes."};
  return {level:"low",approval:false,reason:"Recommended actions are diagnostic and non-destructive."};
}

export function planTools(ticket,category,accountMatch){
  const tools=["issue_retriever","knowledge_retriever"];
  if(accountMatch.matched) tools.push("account_lookup");
  if(["authentication","availability","performance"].includes(category)) tools.push("service_health");
  tools.push("policy_engine");
  return tools;
}

function deriveHypothesis(category,issue,ops){
  if(category==="authentication"&&ops.status?.status==="degraded") return "Evidence points to an upstream signing/CDN degradation rather than an account-specific credential failure.";
  if(category==="availability"&&ops.status?.status==="degraded") return `Evidence is consistent with an active ${ops.service} service incident${ops.status.region?` in ${ops.status.region}`:""}.`;
  if(category==="memory") return "Evidence is consistent with memory amplification from fragmented Arrow/Pandas conversion rather than raw dataset size alone.";
  if(category==="performance") return "Evidence is consistent with hot-path state serialization/copy overhead in the streaming pipeline.";
  if(category==="data-integrity") return "Evidence is consistent with a state or type-handling defect that can cause replay, row loss, or precision corruption.";
  if(category==="schema") return "Evidence is consistent with a schema/type inconsistency between optimized and reference execution paths.";
  return issue?`Closest historical pattern: ${issue.title}. More diagnostics are needed before asserting a root cause.`:"Insufficient evidence for a root-cause hypothesis; capture a minimal reproduction and escalate.";
}

function recommendations(category,issue,ops){
  const common=[];
  if(ops.status?.status==="degraded") common.push(`Correlate with ${ops.status.incident||"the active service incident"} before changing customer credentials or configuration.`);
  const map={
    authentication:["Reproduce against a known-public dataset without credentials.","Compare streaming and non-streaming requests from the same region.","If public resources also fail, escalate with timestamps and request IDs."],
    availability:["Probe at least three independent public endpoints.","Capture region, response codes, and timestamps.","Escalate as a service incident when failures are cross-dataset or cross-endpoint."],
    memory:["Inspect Arrow chunk count and fragmentation.","Flatten or consolidate indices before a pandas round-trip.","Benchmark a direct Arrow/list conversion and compare peak memory."],
    performance:["Profile CPU time around state serialization and iterator wrappers.","Remove expensive copy/state operations from the hot path.","Benchmark throughput before and after with identical worker/shard settings."],
    "data-integrity":["Pause downstream mutating writes until the reproduction is understood.","Compare full-run and resumed outputs using row IDs or checksums.","Add regression coverage for repeated resume cycles and edge-case numeric values."],
    schema:["Compare the optimized path against a plain reference path.","Assert schema, column order, dtype, and null semantics.","Add a minimal regression fixture before changing production parsing logic."]
  };
  return [...common,...(map[category]||issue?.resolution||["Capture a minimal reproduction.","Retrieve related evidence.","Escalate if confidence remains low."])];
}

function evidenceScore(cls,issues,docs,ops){
  const issueSignal=Math.min(1,(issues[0]?.score||0)*1.65);
  const docSignal=Math.min(1,(docs[0]?.score||0)*1.65);
  const opsSignal=ops.status?.status==="degraded"?.95:ops.status?.status==="operational"?.55:0;
  return Math.round(Math.min(96,Math.max(50,(cls.confidence*.50+issueSignal*.32+docSignal*.13+opsSignal*.05)*100)));
}

export function investigate(ticket){
  const start=performance.now?.()??Date.now();
  const cls=classifyTicket(ticket);
  const accountMatch=matchAccount(ticket);
  const tools=planTools(ticket,cls.category,accountMatch);
  const issues=retrieveIssues(ticket,cls.category);
  const docs=retrieveDocs(ticket,cls.category);
  const ops=tools.includes("service_health")?serviceHealthCheck(ticket,cls.category,accountMatch):{service:null,status:null,scope:"not-required"};
  const risk=policyFor(cls.category);
  const trace=[
    {step:"Classify incident",tool:"classifier",status:"complete",detail:`${cls.category} · ${Math.round(cls.confidence*100)}% classifier confidence`},
    {step:"Retrieve historical incidents",tool:"issue_retriever",status:"complete",detail:`${issues.length} ranked public incidents`},
    {step:"Retrieve knowledge",tool:"knowledge_retriever",status:"complete",detail:`${docs.length} ranked documentation/runbook chunks`}
  ];
  if(tools.includes("account_lookup")) trace.push({step:"Query account context",tool:"account_lookup",status:"complete",detail:`${accountMatch.account.accountId} · ${accountMatch.account.plan} · ${accountMatch.account.region}`});
  if(tools.includes("service_health")) trace.push({step:"Check service health",tool:"service_health",status:"complete",detail:`${ops.service} · ${ops.status?.status||"unknown"} · ${ops.scope}`});
  trace.push({step:"Apply approval policy",tool:"policy_engine",status:"complete",detail:`${risk.level} risk · ${risk.approval?"approval required":"diagnostic-only"}`});
  const elapsed=Math.max(1,Math.round((performance.now?.()??Date.now())-start));
  return {
    ticket,
    classification:{category:cls.category,confidence:Math.round(cls.confidence*100)},
    hypothesis:deriveHypothesis(cls.category,issues[0],ops),
    rootCause:deriveHypothesis(cls.category,issues[0],ops),
    evidenceScore:evidenceScore(cls,issues,docs,ops),
    risk,
    recommendation:recommendations(cls.category,issues[0],ops),
    evidence:{
      issues:issues.map(x=>({id:x.id,title:x.title,summary:x.summary,source:x.source,relevance:Math.round(x.score*100)})),
      docs:docs.map(x=>({id:x.id,title:x.title,text:x.text,source:x.source,relevance:Math.round(x.score*100)})),
      operations:{accountMatched:accountMatch.matched,account:accountMatch.account,service:ops.service,status:ops.status,scope:ops.scope}
    },
    trace,
    meta:{engine:"deterministic-orchestrator-v2",mode:"public-demo",modelEnhanced:false,latencyMs:elapsed,corpusIssues:publicIssues.length,knowledgeChunks:knowledgeBase.length,toolsPlanned:tools}
  };
}
