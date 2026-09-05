# SupportPilot — AI Customer Support Resolution Agent

**Applied AI Engineering portfolio project** showing how an AI support system can combine natural-language understanding, retrieval, business-system tools, policy controls, evaluation, and human approval.

> Customer complaint → intent → customer/order/payment lookup → policy retrieval → recommended resolution → draft reply → approval gate.

## Why this exists

A normal FAQ chatbot answers from text. SupportPilot demonstrates a harder enterprise workflow: the agent must **check operational data before it answers** and must **not execute consequential actions without approval**.

Typical scenario:

> “I was charged twice for order ORD-1005.”

SupportPilot classifies the request as `payment_issue`, retrieves payment policy, looks up the order and payment ledger, detects two captured records, prepares a refund/reversal recommendation, drafts a customer reply, and marks the financial action as **human approval required**.

## Live demo

Production deployment: `https://supportpilot-hadijayyy.vercel.app`

## Data

### Public benchmark reference

SupportPilot uses the public **Bitext Customer Support LLM Chatbot Training Dataset** as the external intent-taxonomy/reference benchmark:

- 26,872 customer-support Q&A examples
- 27 intents
- 10 categories
- customer-service language spanning account, order, payment, refund, cancellation and related support patterns
- CDLA-Sharing-1.0

Source: https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset

The repo does **not** bundle the full Bitext dataset. The demo includes a small set of curated, paraphrased support examples for reproducible retrieval behavior.

### Synthetic operational data

The customer/order/payment layer is intentionally synthetic:

- customers and service tiers
- orders and fulfillment states
- ordered vs fulfilled SKUs
- carrier state and expected delivery
- payment captures and duplicate charges
- refund state

This keeps the project safe to publish while still demonstrating tool-oriented AI behavior.

### Synthetic policy knowledge

The policy corpus includes delayed delivery, refund, return, cancellation, damaged-item, wrong-item, payment-exception, and account-recovery rules.

## Architecture

```text
Customer message
    ↓
Intent classifier
    ↓
Support-example retrieval ──┐
Policy retrieval ───────────┤
Customer DB lookup ─────────┤
Order/payment lookup ───────┤
                            ↓
                    Resolution engine
                            ↓
                    Approval policy
                            ↓
              Recommended action + draft reply
                            ↓
                  Optional grounded LLM rewrite
```

The hosted demo uses deterministic orchestration so it is free, reproducible, and auditable. An optional provider-backed model adapter can improve the customer-facing reply while remaining constrained to retrieved evidence.

## Evaluation

`npm run eval` executes the committed golden-set regression suite.

Current curated-set results:

| Metric | Result |
|---|---:|
| Intent classification | 100% |
| Order lookup | 100% |
| Approval-gate accuracy | 100% |
| Average evidence score | 77/100 |
| Golden cases | 18 |

These are **portfolio regression metrics**, not general production-model accuracy claims.

`npm test` runs 24 tests covering golden cases plus failure modes such as fabricated customer context, duplicate-charge detection, cancellation gating, wrong-SKU detection, account-recovery safety, and score semantics.

## Guardrails

- Refunds, credits, and replacement decisions require human approval.
- Order cancellation requires human approval.
- The public demo never executes refund, credit, cancellation, or account mutation actions.
- Unknown requests do not fabricate customer/order context.
- Customer input is treated as untrusted input in the optional model adapter.
- Account-recovery responses never expose credentials or secrets.

## Main files

```text
supportpilot/
├── api/
│   ├── resolve.js
│   ├── evaluation.js
│   └── health.js
├── data/
│   ├── benchmark.js
│   ├── operations.js
│   └── policies.js
├── eval/
│   ├── golden.js
│   └── report.json
├── scripts/evaluate.mjs
├── src/
│   ├── engine.js
│   └── llm.js
├── tests/engine.test.mjs
└── web/index.html
```

## Local verification

```bash
npm run verify
node --check api/resolve.js
node --check api/evaluation.js
node --check src/llm.js
```

No API key is required for the deterministic demo.

## What this portfolio demonstrates

- Applied AI system design
- intent classification
- retrieval / grounding
- structured tool use
- operational data integration
- policy-aware decisioning
- human-in-the-loop controls
- evaluation / regression testing
- serverless API design
- optional LLM generation with evidence constraints
- production deployment thinking
