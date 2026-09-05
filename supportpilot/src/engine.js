import {supportExamples, benchmarkMeta} from "../data/benchmark.js";
import {customers, orders, payments} from "../data/operations.js";
import {policies} from "../data/policies.js";

const stop = new Set(["the","a","an","and","or","to","of","in","on","for","with","is","are","it","my","our","i","we","this","that","please","can","could","would","want","need"]);
const tokenize = (text="") => [...new Set(text.toLowerCase().replace(/[^a-z0-9\-_. ]/g," ").split(/\s+/).filter(t=>t.length>2&&!stop.has(t)))];
const overlap = (a,b) => { const A=tokenize(a), B=new Set(tokenize(b)); if(!A.length)return 0; return A.filter(x=>B.has(x)).length/Math.sqrt(A.length*Math.max(B.size,1)); };
const hasAny = (t,arr) => arr.some(x=>t.includes(x));

export function classifyMessage(message){
  const t=message.toLowerCase();
  if(hasAny(t,["charged twice","double charged","duplicate charge","charged two times","payment failed","card charged","charged but","payment issue"])) return {intent:"payment_issue",confidence:0.96};
  if(hasAny(t,["wrong item","wrong product","different product","wrong size","wrong sku","different sku"])) return {intent:"wrong_item",confidence:0.96};
  if(hasAny(t,["damaged","broken","cracked","crushed","defective on arrival"])) return {intent:"damaged_item",confidence:0.95};
  if(hasAny(t,["cancel order","cancel my order","cancel it","stop the order","please cancel","need to cancel","want to cancel"])) return {intent:"cancel_order",confidence:0.95};
  if(hasAny(t,["refund","money back","refund status","refund hasn't","refund has not"])) return {intent:"refund_request",confidence:0.94};
  if(hasAny(t,["return","send it back","return label"])) return {intent:"return_request",confidence:0.92};
  if(hasAny(t,["where is","where's","tracking","not arrived","delivery","package","shipment","late"])) return {intent:"order_status",confidence:0.90};
  if(hasAny(t,["login","log in","password","account access","locked out"])) return {intent:"account_access",confidence:0.92};
  return {intent:"general",confidence:0.62};
}

function extractId(message,prefix){ const m=message.toUpperCase().match(new RegExp(`${prefix}-\\d+`)); return m?.[0]||null; }
function getContext(message){
  const orderId=extractId(message,"ORD");
  const customerId=extractId(message,"CUST");
  const order=orderId?orders.find(o=>o.orderId===orderId)||null:null;
  const customer=(customerId?customers.find(c=>c.customerId===customerId):null) || (order?customers.find(c=>c.customerId===order.customerId):null) || null;
  const payment=order?payments.filter(p=>p.orderId===order.orderId):[];
  return {orderId,customerId,order,customer,payment,accountMatched:!!customer,orderMatched:!!order};
}

function retrieveExamples(message,intent){ return supportExamples.map(x=>({...x,score:Math.min(1,overlap(message,x.text)+(x.intent===intent?0.28:0))})).sort((a,b)=>b.score-a.score).slice(0,3); }
function retrievePolicies(message,intent){ return policies.map(x=>({...x,score:Math.min(1,overlap(message,`${x.title} ${x.text}`)+(x.intent===intent?0.35:0))})).sort((a,b)=>b.score-a.score).slice(0,2); }

function resolution(intent,ctx){
  const o=ctx.order, ps=ctx.payment;
  if(intent==="order_status"){
    if(o?.status==="shipped"&&o.carrierStatus==="in_transit_delayed") return {summary:`${o.orderId} is shipped but delayed in transit. Open a carrier investigation; do not promise an immediate refund before loss is confirmed.`,actions:["Share the latest carrier status and acknowledge the delay.","Open a carrier investigation because the promised date has passed.","Offer replacement/refund only after loss confirmation or human exception approval."]};
    return {summary:"Check order and carrier status before committing to a remedy.",actions:["Verify order ID and latest carrier event.","Compare promised date with current status.","Escalate if tracking is stalled beyond policy threshold."]};
  }
  if(intent==="cancel_order"){
    if(o?.status==="processing"&&o.carrierStatus==="not_handed_off") return {summary:`${o.orderId} is still processing and has not been handed to a carrier, so cancellation is policy-eligible pending approval.`,actions:["Confirm the customer intends to cancel the full order.","Request human approval for the cancellation action.","After approval, cancel and release/void payment authorization where applicable."]};
    return {summary:"Cancellation eligibility depends on fulfillment state; shipped orders should follow return/intercept workflow.",actions:["Check fulfillment and carrier handoff.","If not shipped, request cancellation approval.","If shipped, explain return/intercept options."]};
  }
  if(intent==="damaged_item") return {summary:o?.damageClaim?`${o.orderId} has a recorded damage claim; replacement or refund can be offered after evidence review and approval.`:"Treat as a damaged-goods claim and collect evidence before monetary action.",actions:["Confirm affected item and request photo evidence if not already recorded.","Check replacement stock and customer preference.","Route replacement/refund for human approval."]};
  if(intent==="wrong_item"){
    const mismatch=o&&o.fulfilledSku.length&&o.items[0]?.sku!==o.fulfilledSku[0];
    return {summary:mismatch?`${o.orderId} shows a SKU mismatch between ordered and fulfilled item. A prepaid return + replacement is supported.`:"Verify the ordered SKU against the fulfilled SKU before offering a remedy.",actions:["Compare ordered and fulfilled SKU.","Issue a prepaid return label when mismatch is confirmed.","Route replacement or refund selection through approval policy."]};
  }
  if(intent==="payment_issue"){
    const dup=ps.filter(p=>p.status==="captured").length>1 || ps.some(p=>p.duplicate);
    return {summary:dup?`${o?.orderId||"The order"} has duplicate captured payment records. A reversal/refund should be prepared but requires human approval.`:"Reconcile payment ledger against order state before advising the customer.",actions:["Check all payment authorizations/captures for the order.","Identify duplicate or orphaned transactions.","Prepare a credit/refund action for human approval; never execute automatically in this demo."]};
  }
  if(intent==="refund_request"){
    const submitted=ps.find(p=>p.refundStatus==="submitted");
    return {summary:submitted?`Refund for ${o?.orderId||"the order"} is already submitted; explain settlement timing before opening a duplicate refund.`:"Check refund eligibility, order state, and payment status before preparing a refund.",actions:["Verify order and original payment.","Check whether a refund already exists.","If eligible and not already submitted, prepare refund for human approval."]};
  }
  if(intent==="return_request") return {summary:"Return eligibility depends on the return window and item condition. The agent should retrieve policy before creating a label.",actions:["Verify purchase/delivery date.","Confirm item condition and return eligibility.","Prepare a return label only when policy requirements are met."]};
  if(intent==="account_access") return {summary:"Use the approved account recovery flow and avoid handling credentials inside the support agent.",actions:["Verify the customer through approved recovery flow.","Send a secure reset path.","Escalate suspicious or repeated recovery failures."]};
  return {summary:"The request is outside the demo's supported resolution intents. Gather identifiers and route to a human agent.",actions:["Ask for the relevant order/customer identifier.","Capture a concise problem summary.","Escalate to a human support queue."]};
}

function risk(intent,resolution,ctx){
  const monetary=["refund_request","payment_issue","damaged_item","wrong_item"].includes(intent);
  const cancellation=intent==="cancel_order";
  if(monetary) return {level:"high",approval:true,reason:"Refunds, credits, and replacement decisions can create financial impact and require human approval."};
  if(cancellation) return {level:"medium",approval:true,reason:"Order cancellation changes fulfillment/payment state and requires human approval."};
  return {level:"low",approval:false,reason:"The recommended path is informational or diagnostic and does not execute a consequential action."};
}

function draftReply(intent,ctx,res){
  const name=ctx.customer?.name?.split(" ")[0]||"there";
  const order=ctx.order?.orderId?` for ${ctx.order.orderId}`:"";
  const approvalNote=["refund_request","payment_issue","damaged_item","wrong_item","cancel_order"].includes(intent)?" I’ve prepared the next action for review so we can handle it correctly.":"";
  return `Hi ${name}, thanks for reaching out${order}. ${res.summary}${approvalNote}`;
}

export function resolveSupport(message){
  const start=Date.now();
  const classification=classifyMessage(message);
  const ctx=getContext(message);
  const examples=retrieveExamples(message,classification.intent);
  const policy=retrievePolicies(message,classification.intent);
  const res=resolution(classification.intent,ctx);
  const guard=risk(classification.intent,res,ctx);
  const evidenceScore=Math.round(Math.min(100,45+(examples[0]?.score||0)*25+(policy[0]?.score||0)*20+(ctx.orderMatched?7:0)+(ctx.accountMatched?3:0)));
  const trace=[
    {step:"Classify request",tool:"intent_classifier",detail:`${classification.intent} · ${Math.round(classification.confidence*100)}% classifier confidence`},
    {step:"Retrieve support examples",tool:"support_retriever",detail:`${examples.length} similar benchmark-style examples`},
    {step:"Retrieve policy",tool:"policy_retriever",detail:`${policy.length} policy chunks`},
    {step:"Lookup customer",tool:"customer_db",detail:ctx.accountMatched?`${ctx.customer.customerId} · ${ctx.customer.tier}`:"No customer identifier matched"},
    {step:"Lookup order/payment",tool:"commerce_tools",detail:ctx.orderMatched?`${ctx.order.orderId} · ${ctx.order.status} · ${ctx.payment.length} payment record(s)`:"No order identifier matched"},
    {step:"Apply approval policy",tool:"policy_engine",detail:`${guard.level} risk · ${guard.approval?"human approval required":"diagnostic-only"}`}
  ];
  return {
    message,
    classification:{intent:classification.intent,confidence:Math.round(classification.confidence*100)},
    evidenceScore,
    resolution:res.summary,
    actions:res.actions,
    suggestedReply:draftReply(classification.intent,ctx,res),
    risk:guard,
    context:{customer:ctx.customer,order:ctx.order,payments:ctx.payment,accountMatched:ctx.accountMatched,orderMatched:ctx.orderMatched},
    evidence:{examples:examples.map(x=>({id:x.id,intent:x.intent,text:x.text,resolution:x.resolution,relevance:Math.round(x.score*100)})),policies:policy.map(x=>({id:x.id,title:x.title,text:x.text,relevance:Math.round(x.score*100)}))},
    trace,
    meta:{benchmark:benchmarkMeta.name,benchmarkRows:benchmarkMeta.rows,engine:"deterministic-demo",modelEnhanced:false,latencyMs:Math.max(12,Date.now()-start+12),requestId:`sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}
  };
}
