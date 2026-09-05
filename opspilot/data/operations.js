export const accounts = [
  { accountId:"ACME-001", company:"Acme Analytics", plan:"Enterprise", region:"us-east", status:"active", monthlyRequests:1284000 },
  { accountId:"NOVA-204", company:"Nova Research", plan:"Team", region:"eu-west", status:"active", monthlyRequests:94000 },
  { accountId:"KITE-118", company:"Kite Labs", plan:"Enterprise", region:"ap-southeast", status:"active", monthlyRequests:642000 },
  { accountId:"ORBIT-770", company:"Orbit Systems", plan:"Pro", region:"us-west", status:"active", monthlyRequests:211000 },
  { accountId:"LUMEN-315", company:"Lumen AI", plan:"Enterprise", region:"eu-central", status:"active", monthlyRequests:875000 }
];
export const serviceStatus = [
  { service:"dataset-streaming", region:"us-east", status:"degraded", errorRate:0.087, p95Ms:2840, incident:"INC-260905-17" },
  { service:"dataset-viewer", region:"us-east", status:"operational", errorRate:0.004, p95Ms:420, incident:null },
  { service:"dataset-streaming", region:"eu-west", status:"operational", errorRate:0.006, p95Ms:610, incident:null },
  { service:"dataset-viewer", region:"eu-west", status:"degraded", errorRate:0.043, p95Ms:1760, incident:"INC-260905-09" },
  { service:"dataset-streaming", region:"ap-southeast", status:"operational", errorRate:0.009, p95Ms:730, incident:null },
  { service:"dataset-viewer", region:"ap-southeast", status:"operational", errorRate:0.008, p95Ms:690, incident:null }
];
