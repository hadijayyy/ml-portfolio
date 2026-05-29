"""
B2B SaaS Churn Prediction Pipeline
====================================
Survival analysis + classification for early churn detection.
Output: weekly ranked account list for Customer Success team.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from lifelines import CoxPHFitter
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Feature Engineering ───────────────────────────────────────────────────────

def engineer_churn_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create behavioral and engagement signals from raw account data."""
    df = df.copy()

    # Engagement ratio: active users vs total seats
    df["user_engagement_ratio"] = df["active_users_l30"] / df["total_seats"].clip(lower=1)

    # Support burden — high tickets with low CSAT is a danger signal
    df["support_burden_score"] = df["support_tickets_l30"] * (5 - df["avg_csat"].fillna(3))

    # Stickiness: feature depth × session frequency
    df["product_stickiness"] = df["avg_feature_depth"] * np.log1p(df["total_sessions_l30"])

    # Recency flag: no sessions in last 14 days
    df["is_ghost_account"] = (df["total_sessions_l30"] == 0).astype(int)

    # Tenure buckets
    df["tenure_bucket"] = pd.cut(
        df["tenure_days"],
        bins=[0, 90, 180, 365, 730, np.inf],
        labels=["0-3m", "3-6m", "6-12m", "1-2y", "2y+"]
    ).astype(str)

    return df


# ── Survival Analysis ─────────────────────────────────────────────────────────

def run_survival_analysis(df: pd.DataFrame) -> CoxPHFitter:
    """
    Cox Proportional Hazards model to estimate time-to-churn.
    Useful for prioritizing urgency of CS intervention.
    """
    SURVIVAL_FEATURES = [
        "tenure_days", "churned",
        "user_engagement_ratio", "product_stickiness",
        "support_burden_score", "had_payment_failure",
        "mrr", "plan_tier_encoded"
    ]

    df_surv = df[SURVIVAL_FEATURES].dropna()

    cph = CoxPHFitter(penalizer=0.1)
    cph.fit(df_surv, duration_col="tenure_days", event_col="churned")

    logger.info("\n=== Cox PH Model Summary ===")
    cph.print_summary(decimals=3)

    return cph


# ── Classification Model ──────────────────────────────────────────────────────

FEATURES = [
    "user_engagement_ratio",
    "product_stickiness",
    "support_burden_score",
    "is_ghost_account",
    "had_payment_failure",
    "avg_csat",
    "mrr",
    "tenure_days",
    "plan_tier_encoded",
    "active_users_l30",
    "total_sessions_l30",
    "avg_feature_depth",
    "support_tickets_l30",
]

TARGET = "churned_within_90d"


def train_churn_model(df: pd.DataFrame) -> Pipeline:
    df = engineer_churn_features(df)

    X = df[FEATURES].fillna(df[FEATURES].median())
    y = df[TARGET]

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", RandomForestClassifier(
            n_estimators=300,
            max_depth=8,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = cross_validate(
        pipeline, X, y,
        cv=cv,
        scoring=["roc_auc", "average_precision"],
        return_train_score=False
    )

    logger.info(f"ROC-AUC:  {results['test_roc_auc'].mean():.4f} ± {results['test_roc_auc'].std():.4f}")
    logger.info(f"PR-AUC:   {results['test_average_precision'].mean():.4f} ± {results['test_average_precision'].std():.4f}")

    pipeline.fit(X, y)
    return pipeline


# ── Precision@K Evaluation ───────────────────────────────────────────────────

def precision_at_k(y_true, y_proba, k: int = 30) -> float:
    """
    Of the top-K predicted churners, what fraction actually churned?
    This is the metric that matters for a small CS team.
    """
    top_k_idx = np.argsort(y_proba)[::-1][:k]
    return y_true.iloc[top_k_idx].mean()


# ── Weekly Alert Generation ──────────────────────────────────────────────────

def generate_weekly_alert(
    pipeline: Pipeline,
    df: pd.DataFrame,
    cph: CoxPHFitter,
    top_n: int = 30,
) -> pd.DataFrame:
    """
    Produces a ranked list of at-risk accounts for the CS team.
    Includes churn probability, estimated days to churn, and recommended action.
    """
    df = engineer_churn_features(df)
    X = df[FEATURES].fillna(df[FEATURES].median())

    df = df.copy()
    df["churn_probability"] = pipeline.predict_proba(X)[:, 1]

    # Estimate median survival time from Cox model
    survival_df = df[[
        "tenure_days", "user_engagement_ratio", "product_stickiness",
        "support_burden_score", "had_payment_failure", "mrr", "plan_tier_encoded"
    ]].fillna(0)

    median_survival = cph.predict_median(survival_df)
    df["est_days_to_churn"] = (median_survival - df["tenure_days"]).clip(lower=0).round(0).astype(int)

    # Determine recommended action
    def recommend_action(row):
        if row["avg_csat"] < 3 and row["support_tickets_l30"] > 3:
            return "🔴 CS call + escalate to product team"
        elif row["had_payment_failure"] == 1:
            return "💳 Proactive billing outreach + payment plan"
        elif row["is_ghost_account"] == 1:
            return "👻 Re-engagement campaign + product training"
        elif row["user_engagement_ratio"] < 0.3:
            return "📉 Usage review call + adoption playbook"
        else:
            return "📞 Proactive check-in call"

    df["recommended_action"] = df.apply(recommend_action, axis=1)

    alert = (
        df.nlargest(top_n, "churn_probability")[[
            "account_name", "mrr", "churn_probability",
            "est_days_to_churn", "recommended_action"
        ]]
        .reset_index(drop=True)
    )
    alert.index += 1  # 1-based ranking

    return alert


# ── Save / Load ──────────────────────────────────────────────────────────────

def save_model(pipeline: Pipeline, path: str = "churn_model.pkl"):
    joblib.dump(pipeline, path)
    logger.info(f"Model saved to {path}")


if __name__ == "__main__":
    np.random.seed(42)
    n = 800

    # Synthetic account data
    df_demo = pd.DataFrame({
        "account_name": [f"Company_{i}" for i in range(n)],
        "mrr": np.random.choice([299, 499, 899, 1499], n, p=[0.3, 0.35, 0.25, 0.1]),
        "plan_tier_encoded": np.random.choice([1, 2, 3, 4], n),
        "tenure_days": np.random.exponential(400, n).astype(int),
        "total_seats": np.random.randint(3, 50, n),
        "active_users_l30": np.random.poisson(5, n),
        "total_sessions_l30": np.random.poisson(40, n),
        "avg_feature_depth": np.random.beta(2, 3, n) * 10,
        "support_tickets_l30": np.random.poisson(1, n),
        "avg_csat": np.random.uniform(2, 5, n),
        "had_payment_failure": np.random.binomial(1, 0.08, n),
        "churned_within_90d": np.random.binomial(1, 0.12, n),
        "churned": np.random.binomial(1, 0.12, n),
    })

    logger.info("Training churn model...")
    model = train_churn_model(df_demo)

    logger.info("\nRunning survival analysis...")
    cph = run_survival_analysis(df_demo)

    logger.info("\nGenerating weekly alert (top 10 shown):")
    alert = generate_weekly_alert(model, df_demo, cph, top_n=10)
    print(alert.to_string())
