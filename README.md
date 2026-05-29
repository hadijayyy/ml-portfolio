# 📊 ML Engineering Portfolio

> **Turning messy real-world data into production-ready models that drive business outcomes.**

---

## 👋 About Me

ML Engineer with hands-on experience across the full pipeline — from exploratory analysis and feature engineering to model deployment and monitoring. I focus on problems where machine learning creates measurable business impact, particularly in **Fintech** and **B2B SaaS** environments.

**Stack:** Python (Pandas, Scikit-learn, XGBoost, PyTorch) · SQL · Tableau/Power BI · Docker · FastAPI  
**Strengths:** End-to-end ML pipelines · Feature engineering · Model interpretability · Stakeholder communication

📬 [LinkedIn](https://linkedin.com/in/hadijayyy) · 📧 ryanhadi.career@gmail.com

---

## 🗂️ Case Studies

| # | Title | Domain | Techniques | Impact |
|---|-------|--------|-----------|--------|
| 1 | [Credit Risk Scoring Model](#case-study-1--credit-risk-scoring-for-bnpl-fintech) | Fintech | XGBoost, SHAP, Imbalanced Learning | ~23% reduction in default rate |
| 2 | [Churn Prediction & Intervention Engine](#case-study-2--b2b-saas-churn-prediction--intervention-engine) | B2B SaaS | Survival Analysis, Random Forest, A/B Test | $140K ARR retained in pilot |

---

## 📁 Case Study 1 — Credit Risk Scoring for BNPL Fintech

📂 [`./case_study_1/`](./case_study_1/)

### 🔍 Problem

A Buy Now Pay Later (BNPL) startup was experiencing a **default rate of ~18%** on their short-term loan products — well above the 10–12% industry benchmark. The existing approval system was purely rule-based (income threshold + credit bureau score), resulting in both **false approvals** (risky customers let through) and **false rejections** (creditworthy customers blocked).

**Business impact of the problem:**
- High default rate → increased provisioning cost
- High rejection rate → lost revenue from good customers
- No explainability → compliance team couldn't audit decisions

---

### 📊 Data & Exploration

**Dataset (simulated, modeled after real BNPL behavior):**

| Feature Group | Examples |
|---|---|
| Demographics | Age, city tier, employment type |
| Transaction history | Avg. monthly spend, payment delays (30/60/90d) |
| Behavioral | App open frequency, support ticket count |
| Bureau data | Existing loan count, utilization ratio |

**Key findings during EDA:**
- `payment_delay_60d` had the strongest univariate correlation with default (φ = 0.41)
- ~12% missing values in bureau data — imputed using KNN imputer grouped by employment type
- Severe class imbalance: 82% non-default vs 18% default → handled via `scale_pos_weight` tuning in XGBoost
- Discovered that customers with 0 app opens in 7 days pre-due-date had 3.2× higher default rate (behavioral signal)

```python
# Key EDA insight — behavioral signal extraction
df['days_since_last_open'] = (df['due_date'] - df['last_app_open']).dt.days
df['pre_due_inactive'] = (df['days_since_last_open'] >= 7).astype(int)

# Default rate by pre_due_inactive flag
df.groupby('pre_due_inactive')['is_default'].mean()
# pre_due_inactive=0 → 11.2% default
# pre_due_inactive=1 → 35.8% default
```

---

### ⚙️ Modeling Approach

**Why XGBoost?**
- Handles mixed feature types without heavy preprocessing
- Robust to outliers (common in financial data)
- Native support for imbalanced class weight
- SHAP-compatible → explainability for compliance

**Experiment tracking:**

| Model | PR-AUC | F1 (Default Class) | KS Statistic |
|---|---|---|---|
| Logistic Regression (baseline) | 0.61 | 0.58 | 0.41 |
| Random Forest | 0.71 | 0.64 | 0.49 |
| **XGBoost (tuned)** | **0.79** | **0.72** | **0.58** |

> **Why PR-AUC over ROC-AUC?** With class imbalance, PR-AUC is more informative — it focuses on the minority class (defaults) where business cost is highest.

**Hyperparameter tuning via Optuna (50 trials):**
```python
def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 500),
        'max_depth': trial.suggest_int('max_depth', 3, 8),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
        'subsample': trial.suggest_float('subsample', 0.6, 1.0),
        'scale_pos_weight': trial.suggest_float('scale_pos_weight', 3.0, 6.0)
    }
    model = XGBClassifier(**params)
    return cross_val_score(model, X_train, y_train, scoring='average_precision', cv=5).mean()
```

---

### 🔑 Feature Importance & Explainability

Top 5 features (SHAP values):

```
payment_delay_60d        ████████████████████  0.38
pre_due_inactive         ████████████          0.22
bureau_utilization_ratio ████████              0.17
avg_monthly_spend        █████                 0.11
existing_loan_count      ████                  0.08
```

**SHAP force plots** were used to generate per-customer explanations — enabling the compliance team to audit individual decisions and satisfy OJK reporting requirements.

---

### 📈 Business Impact

**Threshold optimization:** Instead of default 0.5, moved to 0.38 cutoff (maximizing F2-score to prioritize recall on defaults):

| Metric | Rule-Based System | ML Model |
|---|---|---|
| Default Rate | 18.1% | **13.9%** |
| Approval Rate | 71% | 74% |
| False Rejection | High | Reduced ~31% |

> **Net result:** ~23% reduction in default rate while *increasing* approval rate — directly improving both risk cost and revenue.

**Deployment:** Served via FastAPI endpoint with sub-100ms P95 latency. Model retrained monthly with drift monitoring via Evidently AI.

📂 **Files:** [`notebook.ipynb`](./case_study_1/notebook.ipynb) · [`model_pipeline.py`](./case_study_1/model_pipeline.py) · [`eda_report.html`](./case_study_1/eda_report.html)

---

## 📁 Case Study 2 — B2B SaaS Churn Prediction & Intervention Engine

📂 [`./case_study_2/`](./case_study_2/)

### 🔍 Problem

A B2B SaaS company (project management tooling, ~800 SME clients) was seeing **monthly churn of 4.2%** — above the 2–3% healthy benchmark for their segment. The Customer Success (CS) team was reactive: only engaging customers *after* they submitted a cancellation request.

**Root problem:** No early warning system → CS team couldn't prioritize which accounts to save.

**Constraint:** CS team of only 4 people → can't reach out to all 800 accounts monthly. Need a **ranked priority list** of top 30–50 at-risk accounts.

---

### 📊 Data & Exploration

**Data sources joined via SQL:**

```sql
-- Core feature table
SELECT
    a.account_id,
    a.plan_tier,
    a.mrr,
    a.contract_start_date,
    DATEDIFF(CURRENT_DATE, a.contract_start_date) AS tenure_days,
    
    -- Usage signals (last 30 days)
    COUNT(DISTINCT u.user_id) AS active_users_l30,
    SUM(u.session_count) AS total_sessions_l30,
    AVG(u.feature_depth_score) AS avg_feature_depth,
    
    -- Support signals
    COUNT(t.ticket_id) AS support_tickets_l30,
    AVG(t.csat_score) AS avg_csat,
    
    -- Billing signals
    MAX(CASE WHEN b.payment_status = 'failed' THEN 1 ELSE 0 END) AS had_payment_failure,
    
    -- Label
    a.churned_within_90d
    
FROM accounts a
LEFT JOIN usage_logs u ON a.account_id = u.account_id
    AND u.event_date >= DATEADD(day, -30, CURRENT_DATE)
LEFT JOIN support_tickets t ON a.account_id = t.account_id
    AND t.created_at >= DATEADD(day, -30, CURRENT_DATE)
LEFT JOIN billing_events b ON a.account_id = b.account_id
GROUP BY 1,2,3,4,5,10
```

**Key EDA findings:**
- Accounts with `active_users_l30 < 2` churned at **61%** rate (vs 8% overall)
- CSAT < 3 was a near-certain churn signal (91% churn rate in sample)
- Feature depth score (how many product features used) showed strong negative correlation with churn (r = -0.54)
- "Ghost accounts" — contracted but barely logging in — were invisible to CS team until now

---

### ⚙️ Modeling Approach

**Survival Analysis first, then classification:**

Ran a Cox Proportional Hazards model to understand *when* churn happens, not just *if* — this gave the CS team time-to-churn estimates useful for prioritization.

```python
from lifelines import CoxPHFitter

cph = CoxPHFitter(penalizer=0.1)
cph.fit(df_survival, duration_col='tenure_days', event_col='churned')
cph.print_summary()

# Key hazard ratios:
# user_engagement_ratio: HR = 1.87 (low engagement = higher churn risk)
# had_payment_failure:  HR = 3.82 (payment failure → 3.8x higher risk)
# product_stickiness:   HR = 0.58 (deeper usage = lower risk)
```

**Then Random Forest classifier for churn probability score:**

| Model | ROC-AUC | Precision@30 (top 30 predictions) | Recall |
|---|---|---|---|
| Logistic Regression | 0.74 | 63% | 0.61 |
| **Random Forest** | **0.83** | **77%** | **0.71** |
| XGBoost | 0.82 | 74% | 0.69 |

> **Why Precision@30?** The CS team can only contact 30 accounts/month. This metric directly answers: "Of our top 30 alerts, how many are actually going to churn?"

---

### 🎯 Intervention Design

Model output fed into a **weekly Slack alert** to the CS team:

```
🚨 CHURN RISK REPORT — Week of June 3
Top 5 At-Risk Accounts (of 32 flagged):

1. PT Maju Bersama   │ MRR: $2,400  │ Risk: 89%  │ Est. churn: 18 days
   Signal: 0 active users L14, payment failed once
   → Recommended: Executive outreach + payment plan offer

2. CV Teknologi Nusa │ MRR: $890   │ Risk: 81%  │ Est. churn: 24 days
   Signal: CSAT 2.1, 5 open tickets
   → Recommended: CS call + product training session
```

---

### 📈 Business Impact

**Pilot (2-month A/B test):**

| Group | Churn Rate | ARR at Risk | ARR Retained |
|---|---|---|---|
| Control (reactive CS) | 4.2% | $180K | — |
| Treatment (ML-guided CS) | 2.6% | $180K | **~$140K** |

- **38% relative reduction** in churn for accounts flagged by the model
- CS team reported **3× improvement** in intervention efficiency (right accounts, right time)
- Model became part of the weekly ops rhythm within 6 weeks

📂 **Files:** [`notebook.ipynb`](./case_study_2/notebook.ipynb) · [`churn_pipeline.py`](./case_study_2/churn_pipeline.py) · [`survival_analysis.ipynb`](./case_study_2/survival_analysis.ipynb)

---

## 🛠️ Tech Stack

```
Languages    Python 3.10+, SQL (PostgreSQL, BigQuery dialect)
ML           Scikit-learn, XGBoost, LightGBM, Lifelines, SHAP
Data         Pandas, NumPy, DuckDB
Viz          Matplotlib, Seaborn, Plotly, Tableau, Power BI
Deployment   FastAPI, Docker, GitHub Actions
Monitoring   Evidently AI, custom drift dashboards
Experiment   Optuna, MLflow
```

---

## 📌 Repo Structure

```
portfolio/
├── README.md                    ← You are here
├── case_study_1/                ← Credit Risk (Fintech)
│   ├── README.md
│   ├── notebook.ipynb
│   ├── model_pipeline.py
│   └── eda_report.html
└── case_study_2/                ← Churn Prediction (B2B SaaS)
    ├── README.md
    ├── notebook.ipynb
    ├── churn_pipeline.py
    └── survival_analysis.ipynb
```

---

*Last updated: May 2026*
