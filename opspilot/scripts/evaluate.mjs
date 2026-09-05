import fs from "node:fs";
import { goldenSet } from "../evaluation/golden-set.js";
import { investigate } from "../src/engine.js";

const rows=goldenSet.map(c=>{
  const r=investigate(c.ticket);
  return {
    id:c.id,
    categoryOk:r.classification.category===c.category,
    retrievalHit:r.evidence.issues.some(x=>x.id===c.issue),
    approvalOk:r.risk.approval===c.approval,
    evidenceScore:r.evidenceScore,
    topIssue:r.evidence.issues[0]?.id??null
  };
});
const pct=(n)=>Math.round(n/rows.length*1000)/10;
const report={
  generatedAt:new Date().toISOString(),
  cases:rows.length,
  classificationAccuracy:pct(rows.filter(x=>x.categoryOk).length),
  retrievalHitAt3:pct(rows.filter(x=>x.retrievalHit).length),
  approvalGateAccuracy:pct(rows.filter(x=>x.approvalOk).length),
  averageEvidenceScore:Math.round(rows.reduce((s,x)=>s+x.evidenceScore,0)/rows.length),
  passed:rows.every(x=>x.categoryOk&&x.retrievalHit&&x.approvalOk),
  rows
};
fs.writeFileSync(new URL("../evaluation/report.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
