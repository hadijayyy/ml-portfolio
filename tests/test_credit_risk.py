"""Tests for Credit Risk Scoring Pipeline (case-study-1)."""

import sys
sys.path.insert(0, '.')
import numpy as np
import pandas as pd
import pytest

from case_study_1.model_pipeline import (
    engineer_features,
    build_preprocessor,
    predict,
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    TARGET,
)


class TestFeatureEngineering:
    def test_engineer_features_returns_copy(self, credit_risk_data):
        """Should not modify the original dataframe."""
        df_copy = credit_risk_data.copy()
        engineer_features(credit_risk_data)
        pd.testing.assert_frame_equal(credit_risk_data, df_copy)

    def test_engineered_columns_exist(self, credit_risk_data):
        """Should create all engineered features."""
        df = engineer_features(credit_risk_data)
        for col in ["pre_due_inactive", "debt_burden_ratio", "payment_stress"]:
            assert col in df.columns, f"Missing engineered column: {col}"

    def test_pre_due_inactive_logic(self, credit_risk_data):
        """days_since_last_open >= 7 should flag inactive."""
        df = engineer_features(credit_risk_data)
        inactive = df[df["days_since_last_open"] >= 7]
        assert (inactive["pre_due_inactive"] == 1).all()
        active = df[df["days_since_last_open"] < 7]
        assert (active["pre_due_inactive"] == 0).all()

    def test_debt_burden_ratio_calculation(self, credit_risk_data):
        """debt_burden_ratio = existing_loan_count * bureau_utilization_ratio."""
        df = engineer_features(credit_risk_data)
        expected = credit_risk_data["existing_loan_count"] * credit_risk_data["bureau_utilization_ratio"]
        pd.testing.assert_series_equal(df["debt_burden_ratio"], expected, check_names=False)

    def test_payment_stress_calculation(self, credit_risk_data):
        """Weighted sum of payment delays."""
        df = engineer_features(credit_risk_data)
        expected = (df["payment_delay_30d"] * 1 + df["payment_delay_60d"] * 2 + df["payment_delay_90d"] * 3)
        pd.testing.assert_series_equal(df["payment_stress"], expected, check_names=False)


class TestPreprocessor:
    def test_preprocessor_builds(self):
        """Should build a ColumnTransformer without error."""
        preprocessor = build_preprocessor()
        assert preprocessor is not None

    def test_preprocessor_fits_and_transforms(self, credit_risk_data):
        """Should fit and transform without NaN or errors."""
        df = engineer_features(credit_risk_data)
        feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES + \
            ["pre_due_inactive", "debt_burden_ratio", "payment_stress"]
        X = df[feature_cols]

        preprocessor = build_preprocessor()
        X_transformed = preprocessor.fit_transform(X)
        assert X_transformed.shape[0] == len(df)
        assert not np.any(np.isnan(X_transformed)), "NaN values after preprocessing"


class TestPredict:
    @pytest.fixture
    def trained_pipeline(self, credit_risk_data):
        """Train a quick pipeline for inference tests."""
        from sklearn.model_selection import train_test_split
        from case_study_1.model_pipeline import train

        df_train, _ = train_test_split(credit_risk_data, test_size=0.3, random_state=42)
        pipeline, _, _ = train(df_train, n_trials=2)
        return pipeline

    def test_predict_output_structure(self, trained_pipeline, credit_risk_data):
        """predict() should return DataFrame with expected columns."""
        result = predict(trained_pipeline, credit_risk_data.head(10))
        expected_cols = {"customer_id", "default_probability", "decision", "risk_tier"}
        assert expected_cols.issubset(set(result.columns)), f"Missing cols: {expected_cols - set(result.columns)}"

    def test_predict_probability_range(self, trained_pipeline, credit_risk_data):
        """probabilities should be between 0 and 1."""
        result = predict(trained_pipeline, credit_risk_data.head(20))
        assert result["default_probability"].between(0, 1).all()

    def test_predict_decision_logic(self, trained_pipeline, credit_risk_data):
        """threshold=0.38: proba >= 0.38 → REJECT, else APPROVE."""
        result = predict(trained_pipeline, credit_risk_data.head(20), threshold=0.38)
        for _, row in result.iterrows():
            expected = "REJECT" if row["default_probability"] >= 0.38 else "APPROVE"
            assert row["decision"] == expected, f"Expected {expected}, got {row['decision']}"

    def test_predict_risk_tier_categories(self, trained_pipeline, credit_risk_data):
        """risk_tier should be one of LOW, MEDIUM, HIGH, VERY_HIGH."""
        result = predict(trained_pipeline, credit_risk_data.head(20))
        valid_tiers = {"LOW", "MEDIUM", "HIGH", "VERY_HIGH"}
        assert set(result["risk_tier"].dropna()).issubset(valid_tiers)

    def test_predict_with_missing_data(self, trained_pipeline, credit_risk_data):
        """Should handle rows with null values gracefully."""
        df_missing = credit_risk_data.head(10).copy()
        df_missing.loc[0, "avg_monthly_spend"] = np.nan
        df_missing.loc[1, "bureau_utilization_ratio"] = np.nan
        result = predict(trained_pipeline, df_missing)
        assert len(result) == 10
        assert result["default_probability"].notna().all()
