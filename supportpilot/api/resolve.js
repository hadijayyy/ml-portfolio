import {resolveSupport} from "../src/engine.js";
import {optionalLLMEnhance} from "../src/llm.js";
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"POST required"});
  const message=typeof req.body?.message==="string"?req.body.message.trim():"";
  if(message.length<6||message.length>4000)return res.status(400).json({error:"message must be 6-4000 characters"});
  const base=resolveSupport(message);
  const out=await optionalLLMEnhance(base);
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json(out);
}
