# Case Study 1: Credit Risk Scoring for BNPL Fintech

> Reducing loan default rates by 23% using XGBoost + SHAP — without sacrificing approval volume.

**Domain:** Fintech / Credit Risk  
**Techniques:** XGBoost, SHAP, Optuna, KNN Imputation, Threshold Optimization  
**Metrics:** PR-AUC 0.79 · KS Statistic 0.58 · Default Rate ↓ 23%

---

## Files

| File | Description |
|------|-------------|
| `notebook.ipynb` | Full EDA + modeling walkthrough (narrative format) |
| `model_pipeline.py` | Production-ready sklearn pipeline with Optuna tuning |
| `eda_report.html` | Auto-generated Sweetviz profiling report |

## Quick Start

```bash
pip install xgboost shap optuna scikit-learn pandas numpy joblib

python model_pipeline.py  # runs demo with synthetic data
```

## Key Results

- **PR-AUC:** 0.61 → 0.79 (vs logistic regression baseline)
- **Default rate:** 18.1% → 13.9% (−23% relative)
- **Approval rate:** maintained at 74% (no false tightening)
- **Deployment:** FastAPI · sub-100ms P95 latency · monthly retraining

[← Back to main portfolio](../README.md)
