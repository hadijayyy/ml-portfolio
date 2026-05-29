"""
Credit Risk Scoring Pipeline — BNPL Fintech
============================================
End-to-end ML pipeline: preprocessing → training → evaluation → explainability
"""

import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.impute import KNNImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import average_precision_score, classification_report
from xgboost import XGBClassifier
import shap
import optuna
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Feature Groups ────────────────────────────────────────────────────────────

NUMERIC_FEATURES = [
    "age",
    "avg_monthly_spend",
    "payment_delay_30d",
    "payment_delay_60d",
    "payment_delay_90d",
    "bureau_utilization_ratio",
    "existing_loan_count",
    "app_open_freq_30d",
    "support_ticket_count",
    "days_since_last_open",
]

CATEGORICAL_FEATURES = [
    "employment_type",   # salaried / self_employed / gig
    "city_tier",         # tier_1 / tier_2 / tier_3
]

TARGET = "is_default"


# ── Feature Engineering ───────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add behavioral and interaction features."""
    df = df.copy()

    # Behavioral signal: inactive before due date
    df["pre_due_inactive"] = (df["days_since_last_open"] >= 7).astype(int)

    # Debt burden ratio
    df["debt_burden_ratio"] = df["existing_loan_count"] * df["bureau_utilization_ratio"]

    # Payment stress index (weighted delays)
    df["payment_stress"] = (
        df["payment_delay_30d"] * 1
        + df["payment_delay_60d"] * 2
        + df["payment_delay_90d"] * 3
    )

    return df


# ── Preprocessing Pipeline ───────────────────────────────────────────────────

def build_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline([
        ("imputer", KNNImputer(n_neighbors=5)),
        ("scaler", StandardScaler()),
    ])
    categorical_transformer = Pipeline([
        ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
    ])
    return ColumnTransformer([
        ("num", numeric_transformer, NUMERIC_FEATURES + ["pre_due_inactive", "debt_burden_ratio", "payment_stress"]),
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
    ])


# ── Optuna Objective ─────────────────────────────────────────────────────────

def build_objective(X_train, y_train, preprocessor):
    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "max_depth": trial.suggest_int("max_depth", 3, 8),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "scale_pos_weight": trial.suggest_float("scale_pos_weight", 3.0, 6.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-4, 1.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-4, 1.0, log=True),
            "eval_metric": "aucpr",
            "random_state": 42,
        }
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("model", XGBClassifier(**params)),
        ])
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        scores = cross_val_score(pipeline, X_train, y_train, scoring="average_precision", cv=cv)
        return scores.mean()
    return objective


# ── Training ─────────────────────────────────────────────────────────────────

def train(df: pd.DataFrame, n_trials: int = 50):
    logger.info("Engineering features...")
    df = engineer_features(df)

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES + ["pre_due_inactive", "debt_burden_ratio", "payment_stress"]]
    y = df[TARGET]

    preprocessor = build_preprocessor()

    logger.info(f"Running Optuna tuning ({n_trials} trials)...")
    study = optuna.create_study(direction="maximize")
    study.optimize(build_objective(X, y, preprocessor), n_trials=n_trials, show_progress_bar=True)

    best_params = study.best_params
    best_params.update({"eval_metric": "aucpr", "random_state": 42})

    logger.info(f"Best PR-AUC: {study.best_value:.4f}")
    logger.info(f"Best params: {best_params}")

    final_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", XGBClassifier(**best_params)),
    ])
    final_pipeline.fit(X, y)

    return final_pipeline, X, y


# ── Evaluation ───────────────────────────────────────────────────────────────

def evaluate(pipeline, X_test, y_test, threshold: float = 0.38):
    """Evaluate with business-optimized threshold (F2-score maximization)."""
    proba = pipeline.predict_proba(X_test)[:, 1]
    preds = (proba >= threshold).astype(int)

    pr_auc = average_precision_score(y_test, proba)
    logger.info(f"\nPR-AUC: {pr_auc:.4f}")
    logger.info(f"\nClassification Report (threshold={threshold}):")
    logger.info(classification_report(y_test, preds, target_names=["Non-Default", "Default"]))

    return proba, preds


# ── SHAP Explainability ──────────────────────────────────────────────────────

def explain(pipeline, X_sample: pd.DataFrame):
    """Generate SHAP explanations for model transparency / compliance."""
    X_processed = pipeline.named_steps["preprocessor"].transform(X_sample)
    model = pipeline.named_steps["model"]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_processed)

    shap.summary_plot(shap_values, X_processed, show=False)
    return shap_values


# ── Save / Load ──────────────────────────────────────────────────────────────

def save_pipeline(pipeline, path: str = "model_pipeline.pkl"):
    joblib.dump(pipeline, path)
    logger.info(f"Pipeline saved to {path}")


def load_pipeline(path: str = "model_pipeline.pkl"):
    return joblib.load(path)


# ── Inference ────────────────────────────────────────────────────────────────

def predict(pipeline, df: pd.DataFrame, threshold: float = 0.38) -> pd.DataFrame:
    """Production inference with feature engineering applied."""
    df = engineer_features(df)
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES + ["pre_due_inactive", "debt_burden_ratio", "payment_stress"]]
    proba = pipeline.predict_proba(X)[:, 1]
    return pd.DataFrame({
        "customer_id": df.get("customer_id", range(len(df))),
        "default_probability": proba,
        "decision": np.where(proba >= threshold, "REJECT", "APPROVE"),
        "risk_tier": pd.cut(proba, bins=[0, 0.2, 0.38, 0.6, 1.0],
                            labels=["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]),
    })


if __name__ == "__main__":
    # Example usage with synthetic data
    import warnings
    from sklearn.model_selection import train_test_split
    warnings.filterwarnings("ignore")

    logger.info("Generating synthetic dataset for demo...")
    np.random.seed(42)
    n = 5000
    df_demo = pd.DataFrame({
        "age": np.random.randint(20, 55, n),
        "avg_monthly_spend": np.random.exponential(3_000_000, n),
        "payment_delay_30d": np.random.poisson(0.5, n),
        "payment_delay_60d": np.random.poisson(0.2, n),
        "payment_delay_90d": np.random.poisson(0.1, n),
        "bureau_utilization_ratio": np.random.beta(2, 5, n),
        "existing_loan_count": np.random.poisson(1.5, n),
        "app_open_freq_30d": np.random.poisson(8, n),
        "support_ticket_count": np.random.poisson(0.3, n),
        "days_since_last_open": np.random.exponential(5, n),
        "employment_type": np.random.choice(["salaried", "self_employed", "gig"], n, p=[0.6, 0.3, 0.1]),
        "city_tier": np.random.choice(["tier_1", "tier_2", "tier_3"], n, p=[0.4, 0.4, 0.2]),
        "is_default": np.random.binomial(1, 0.18, n),  # ~18% default rate
    })

    df_train, df_test = train_test_split(df_demo, test_size=0.2, random_state=42)
    logger.info(f"Train: {len(df_train)} rows, Test: {len(df_test)} rows")

    pipeline, X_train, y_train = train(df_train, n_trials=40)  # 40 trials for demo
    evaluate(pipeline, engineer_features(df_test)[NUMERIC_FEATURES + CATEGORICAL_FEATURES + ["pre_due_inactive", "debt_burden_ratio", "payment_stress"]], df_test[TARGET])
    logger.info("\nSample predictions:")
    print(predict(pipeline, df_test.head(10)))
