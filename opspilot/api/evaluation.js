import report from "../evaluation/report.json" with {type:"json"};
export default function handler(req,res){res.setHeader("Cache-Control","public, max-age=300, s-maxage=300");return res.status(200).json(report)}
