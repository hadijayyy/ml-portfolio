import report from "../eval/report.json" with {type:"json"};
export default function handler(req,res){res.setHeader("Cache-Control","public, max-age=60");res.status(200).json(report);}
