import { investigate } from "../src/engine.js";
import { optionalLLMEnhance } from "../src/llm.js";

export default async function handler(req,res){
  const requestId=crypto.randomUUID().slice(0,12);
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed",requestId});
  try{
    const ticket=String(req.body?.ticket||"").trim();
    if(ticket.length<8)return res.status(400).json({error:"Please provide a more detailed incident description.",requestId});
    if(ticket.length>4000)return res.status(400).json({error:"Ticket is too long for the demo.",requestId});
    const base=investigate(ticket);
    const enhanced=await optionalLLMEnhance(base);
    const result={...enhanced,meta:{...enhanced.meta,requestId}};
    res.setHeader("X-OpsPilot-Mode",result.meta.modelEnhanced?"model-enhanced":"deterministic-demo");
    return res.status(200).json(result);
  }catch{return res.status(500).json({error:"Investigation failed safely. Try a preset incident.",requestId})}
}
