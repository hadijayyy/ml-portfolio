# Case Study 2: B2B SaaS Churn Prediction & Intervention Engine

> Helping a 4-person CS team retain $140K ARR in a 2-month pilot through ML-prioritized outreach.

**Domain:** B2B SaaS / Customer Success  
**Techniques:** Cox PH Survival Analysis, Random Forest, Precision@K, Feature Engineering  
**Metrics:** ROC-AUC 0.83 · Precision@30 = 77% · Churn rate ↓ 38% (pilot)

---

## Files

| File | Description |
|------|-------------|
| `notebook.ipynb` | Full walkthrough: EDA → survival analysis → classifier → alert system |
| `churn_pipeline.py` | End-to-end pipeline + weekly Slack alert generator |
| `survival_analysis.ipynb` | Cox PH model deep-dive with hazard ratio interpretation |

## Quick Start

```bash
pip install scikit-learn lifelines pandas numpy joblib

python churn_pipeline.py  # trains model + prints sample weekly alert
```

## Key Design Decisions

**Why Precision@K instead of ROC-AUC?**  
The CS team can only act on 30 accounts/week. A model with high ROC-AUC but low Precision@30 is useless in practice. We optimized directly for the operational constraint.

**Why Survival Analysis first?**  
Classification tells you *if* someone churns. Survival analysis tells you *when* — which changes how urgently the CS team should act.

## Key Results

- **Precision@30:** 77% (of top 30 flagged, 23 actually churned)
- **Pilot ARR retained:** ~$140K over 2 months
- **Churn rate reduction:** 4.2% → 2.6% in treatment group

[← Back to main portfolio](../README.md)
