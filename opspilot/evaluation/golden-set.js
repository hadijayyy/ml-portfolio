export const goldenSet = [
  {id:"auth-1",ticket:"Public dataset streaming returns 403 Forbidden with SignatureError invalid key pair id.",category:"authentication",issue:8328,approval:true},
  {id:"auth-2",ticket:"ACME-001 cannot stream a public dataset; 403 from xet bridge but regular Hub pages work.",category:"authentication",issue:8328,approval:true},
  {id:"auth-3",ticket:"Token works for normal pages but streaming fails with forbidden signature error for public content.",category:"authentication",issue:8328,approval:true},
  {id:"avail-1",ticket:"NOVA-204 sees 503 Service Unavailable on Dataset Viewer endpoints while huggingface.co remains reachable.",category:"availability",issue:8331,approval:true},
  {id:"avail-2",ticket:"Dataset Studio and Viewer are down across multiple public datasets and devices.",category:"availability",issue:8330,approval:true},
  {id:"avail-3",ticket:"Every datasets-server endpoint returns 503, including splits rows parquet and statistics.",category:"availability",issue:8331,approval:true},
  {id:"mem-1",ticket:"After shuffle and to_pandas, Dataset.from_pandas uses tens of GB for a small dataset and crashes OOM.",category:"memory",issue:8327,approval:false},
  {id:"mem-2",ticket:"Arrow chunk fragmentation causes huge RAM allocation during pandas round trip.",category:"memory",issue:8327,approval:false},
  {id:"perf-1",ticket:"Streaming dataloader is CPU bound; state_dict deepcopy runs on every yielded row with multiple shards.",category:"performance",issue:8393,approval:false},
  {id:"perf-2",ticket:"Shuffle buffer throughput drops badly when state serialization copies nested iterator state.",category:"performance",issue:8393,approval:false},
  {id:"integrity-1",ticket:"Rows disappear after IterableDataset filter checkpoint resume.",category:"data-integrity",issue:8359,approval:true},
  {id:"integrity-2",ticket:"Second checkpoint resume replays the streaming dataset from the beginning.",category:"data-integrity",issue:8308,approval:true},
  {id:"integrity-3",ticket:"Nullable int64 export is cast to float and corrupts values above 2**53.",category:"data-integrity",issue:8365,approval:true},
  {id:"schema-1",ticket:"JSONL file with UTF-8 BOM infers a different schema and injects null fields.",category:"schema",issue:8241,approval:true},
  {id:"schema-2",ticket:"Arrow axis=1 concatenate drops columns from the first dataset and raises schema cast errors.",category:"schema",issue:8341,approval:true},
  {id:"schema-3",ticket:"Optimized Arrow concatenation returns different columns than the plain Python reference path.",category:"schema",issue:8341,approval:true}
];
