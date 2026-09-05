# OpsPilot — Agentic AI Support & Incident Resolution Platform

**Applied AI Engineering portfolio project** demonstrating evidence-backed incident investigation with retrieval, structured tool use, evaluation, operational context, and human approval gates.

> AI that investigates incidents — not just answers questions.

## Live demo

https://opspilot-hadijayyy.vercel.app

## What it does

Given a support or production incident, OpsPilot:

1. classifies the incident;
2. retrieves similar historical cases from a curated public GitHub corpus;
3. retrieves relevant documentation / runbooks;
4. queries synthetic customer-account context;
5. checks synthetic service-health telemetry;
6. produces an evidence-backed root-cause hypothesis and action plan;
7. applies a risk policy that requires human approval for sensitive actions.

The UI exposes **action/tool traces**, not private model chain-of-thought.

## Why this project

The project is intentionally designed around recurring 2026 Applied AI / AI Engineer requirements: production Python/backend thinking, RAG/retrieval, agentic workflows, tool calling, evaluation, observability, safety/approval, and deployment. The hosted demo has a deterministic engine so it is reproducible and free to run; an optional OpenAI adapter can enhance the final resolution when `OPENAI_API_KEY` is set.

## Data

### Public incident corpus

Curated real issues from [`huggingface/datasets`](https://github.com/huggingface/datasets/issues), including:

- #8328 — streaming 403 / SignatureError
- #8331 — dataset viewer backend 503
- #8330 — Dataset Studio / Viewer outage
- #8393 — `IterableDataset.state_dict()` CPU bottleneck
- #8327 — `from_pandas` memory amplification
- #8359 — checkpoint/resume row loss
- #8308 — state freeze after resume
- #8365 — nullable integer export precision loss
- #8241 — JSONL BOM schema divergence
- #8341 — Arrow horizontal concatenate column loss

Each evidence record links to its upstream issue.

### Official documentation

Retrievable knowledge chunks summarize official Hugging Face Datasets documentation:

- Streaming: https://huggingface.co/docs/datasets/main/stream
- Dataset Viewer API: https://huggingface.co/docs/dataset-viewer/quick_start
- Loading methods: https://huggingface.co/docs/datasets/package_reference/loading_methods

### Synthetic enterprise context

Account, plan, region, service-health, incident IDs, usage, and internal runbooks are synthetic fixtures. No customer/private data is used.

## Architecture

```text
Next.js UI
   ↓
/api/investigate
   ↓
Agent Orchestrator
   ├── Incident classifier
   ├── Public issue retriever
   ├── Knowledge retriever (RAG-style)
   ├── Account DB tool
   ├── Service-health tool
   ├── Policy / approval engine
   └── Optional LLM adapter
```

The deterministic retriever is intentionally dependency-light for a public demo. The production extension path is PostgreSQL + pgvector / managed vector store, real service APIs, trace/observability, and provider-backed generation.

## Evaluation contract

| Metric | Target |
|---|---:|
| Task success | 84% |
| Citation validity | 97% |
| Tool selection | 93% |
| Escalation precision | 91% |
| P95 hosted latency | 1.8s |
| Hallucination rate | <3% |

These are **portfolio benchmark targets on a curated golden set**, not claims about an external company's production system.

## Guardrail policy

- Low risk: diagnostic/non-destructive recommendations may proceed without an approval gate.
- Medium risk: access/availability recommendations require human approval before operational change.
- High risk: potential data-integrity/schema incidents require human approval and avoid destructive remediation.

## Local run

```bash
npm install
npm test
npm run dev
```

The demo works without an API key.

## Recruiter walkthrough

1. Open the live demo.
2. Run **403 streaming** to see retrieval + operational correlation.
3. Run **Resume data loss** to see the high-risk approval gate.
4. Review Evaluation and Architecture sections.
5. Inspect `src/engine.js`, `src/llm.js`, and `tests/engine.test.mjs`.

## Next production iteration

- ingest thousands of issues/comments instead of the curated demo corpus;
- semantic embeddings + reranking;
- real PostgreSQL / pgvector;
- MCP-compatible tool adapters;
- OpenTelemetry/LangSmith-style traces;
- golden-set evaluation runner and regression report;
- real incident/status integrations;
- provider routing / cost controls.

## License / attribution

Public issue titles and summarized incident descriptions link back to their original GitHub sources. Hugging Face documentation links remain attributable to Hugging Face. Synthetic fixtures are created solely for this portfolio demo.
