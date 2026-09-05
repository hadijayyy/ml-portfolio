# OpsPilot — Evidence-First Incident Resolution Copilot

**Applied AI Engineering portfolio project** demonstrating grounded retrieval, category-aware tool orchestration, server-side API design, executable evaluation, synthetic operational context, and human approval gates.

> A production-style incident copilot that turns an operational ticket into a source-backed hypothesis, a diagnostic action plan, and an explicit approval decision.

## Live portfolio

- Live demo: https://opspilot-hadijayyy.vercel.app
- Public source: https://github.com/hadijayyy/ml-portfolio/tree/main/opspilot

## What the public demo actually does

Given a support or production incident, OpsPilot:

1. classifies the incident;
2. plans the diagnostic capabilities relevant to that category;
3. retrieves similar historical cases from a curated public GitHub corpus;
4. retrieves official documentation and synthetic runbooks;
5. queries synthetic account context **only when an account is present in the ticket**;
6. checks synthetic service-health context when the incident type makes it relevant;
7. produces an evidence-backed **hypothesis**, not a claim of proven root cause;
8. applies a risk policy that requires human approval for sensitive remediation.

The UI exposes tool/action traces, not private model chain-of-thought. Demo approval does not execute an external action.

## Demo mode vs model-enhanced mode

The hosted public demo intentionally uses a deterministic orchestrator and lexical retrieval baseline. This makes it free, reproducible, and auditable.

If `OPENAI_API_KEY` is configured, an optional server-side adapter can rewrite the final hypothesis and diagnostic plan while being constrained to retrieved evidence. The deterministic result remains the safe fallback.

This separation is deliberate: the portfolio does **not** present lexical retrieval as production vector RAG, and it does not require a paid model to remain demonstrable.

## Data

### Public incident corpus

Ten real issues from [`huggingface/datasets`](https://github.com/huggingface/datasets/issues), including:

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

Each evidence record links directly to its upstream issue.

### Official knowledge sources

The project contains source-linked knowledge chunks based on current Hugging Face documentation:

- Streaming: https://huggingface.co/docs/datasets/main/stream
- Dataset Viewer API: https://huggingface.co/docs/dataset-viewer/quick_start
- Loading methods: https://huggingface.co/docs/datasets/package_reference/loading_methods

### Synthetic enterprise context

Account, plan, region, service-health, incident IDs, usage, and internal runbooks are synthetic fixtures. No private customer data is used. Unknown tickets do not inherit a fabricated default customer account.

## Architecture

```text
Static recruiter UI
   ↓
Vercel Serverless Function (`/api/investigate`)
   ↓
Deterministic Orchestrator
   ├── incident classifier
   ├── category-aware tool planner
   ├── public issue retriever (lexical baseline)
   ├── knowledge retriever (lexical baseline)
   ├── account lookup (conditional)
   ├── service-health lookup (conditional)
   ├── policy / approval engine
   └── optional grounded LLM adapter
```

Production extension path: semantic embeddings + reranking, PostgreSQL/pgvector or managed vector store, real operational APIs, persistent traces, provider routing, and continuous evals.

## Measured evaluation

Run:

```bash
npm run eval
```

The committed golden set currently contains **16 incident cases** across authentication, availability, memory, performance, data-integrity, and schema archetypes.

The report measures:

- classification accuracy;
- retrieval Hit@3 for the expected public incident;
- approval-gate accuracy;
- average heuristic evidence score.

The checked-in report is at `evaluation/report.json` and is rendered in the live UI. These are deterministic regression results for the **portfolio's curated scope**, not general production-model accuracy.

## Guardrails and credibility choices

- Unknown tickets never receive a fabricated customer account.
- “Evidence score” is labeled as a heuristic signal, not a calibrated probability.
- Root-cause output is framed as a hypothesis.
- High-risk data-integrity/schema incidents require a human gate.
- Public demo approvals execute nothing externally.
- Model enhancement is optional and evidence-constrained.
- Public evidence remains linked to original GitHub sources.

## Local run

```bash
npm run verify
```

To run the complete UI + serverless API locally, use the Vercel CLI:

```bash
npx vercel dev
```

Then open the local URL printed by Vercel.

Optional model enhancement:

```bash
cp .env.example .env.local
# set OPENAI_API_KEY and optionally OPENAI_MODEL
npx vercel dev
```

## API

```bash
curl -X POST http://localhost:3000/api/investigate \
  -H 'Content-Type: application/json' \
  -d '{"ticket":"Streaming requests fail with 403 SignatureError"}'
```

Other endpoints:

- `GET /api/health`
- `GET /api/evaluation`

The deployment uses zero runtime dependencies: static web assets plus Vercel Functions importing shared ES modules.

## Recruiter walkthrough

1. Run **403 streaming**: retrieval + account-aware service context + approval gate.
2. Run **Resume data loss**: category-aware planner skips irrelevant service health and applies high-risk policy.
3. Review **Measured Evaluation**: results map to the committed golden set.
4. Inspect `src/engine.js`, `src/llm.js`, `scripts/evaluate.mjs`, and `tests/engine.test.mjs`.

## Why this is relevant to Applied AI roles

The project demonstrates the engineering layers that sit around models in real systems: retrieval, tool planning, backend contracts, evaluation, guardrails, graceful fallback, source provenance, and deployment. It intentionally avoids pretending a small portfolio demo is a fully autonomous production agent.

## License / attribution

Public issue titles and summarized incident descriptions link back to original GitHub sources. Hugging Face documentation links remain attributable to Hugging Face. Synthetic fixtures are created solely for this portfolio demo.
