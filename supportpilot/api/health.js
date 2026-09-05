export default function handler(req,res){res.status(200).json({ok:true,service:"SupportPilot",mode:process.env.OPENAI_API_KEY?"llm-enhanced":"deterministic-demo"});}
