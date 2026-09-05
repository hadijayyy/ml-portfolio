export async function optionalLLMEnhance(result) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return result;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const evidence = [...result.evidence.issues.slice(0,2), ...result.evidence.docs.slice(0,2)].map(e => ({title:e.title, source:e.source, text:e.summary || e.text}));
  const prompt = `You are an enterprise support incident assistant. Based only on the evidence below, improve the root-cause statement and recommended actions. Do not add unsupported facts. Return JSON with keys rootCause and recommendation (array of 3-5 concise actions).\nTicket: ${result.ticket}\nClassification: ${result.classification.category}\nOperational status: ${JSON.stringify(result.evidence.operations.status)}\nEvidence: ${JSON.stringify(evidence)}`;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({model,input:prompt,text:{format:{type:"json_object"}}})
    });
    if (!res.ok) return result;
    const data = await res.json();
    const text = data.output_text || data.output?.flatMap(o=>o.content||[]).find(c=>c.type==="output_text")?.text;
    if (!text) return result;
    const parsed = JSON.parse(text);
    return {...result, rootCause: parsed.rootCause || result.rootCause, recommendation: Array.isArray(parsed.recommendation) ? parsed.recommendation : result.recommendation, meta:{...result.meta,engine:`llm-enhanced:${model}`}};
  } catch {
    return result;
  }
}
