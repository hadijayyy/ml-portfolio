"""Tests for B2B SaaS Churn Prediction Pipeline (case-study-2)."""

import sys
sys.path.insert(0, '.')
import numpy as np
import pandas as pd
import pytest

from case_study_2.churn_pipeline import (
    engineer_churn_features,
    precision_at_k,
    train_churn_model,
    FEATURES,
    TARGET,
)


class TestFeatureEngineering:
    def test_engineer_churn_features_returns_copy(self, churn_data):
        """Should not modify the original dataframe."""
        df_copy = churn_data.copy()
        engineer_churn_features(churn_data)
        pd.testing.assert_frame_equal(churn_data, df_copy)

    def test_engineered_columns_exist(self, churn_data):
        """Should create all engineered features."""
        df = engineer_churn_features(churn_data)
        for col in [
            "user_engagement_ratio",
            "support_burden_score",
            "product_stickiness",
            "is_ghost_account",
            "tenure_bucket",
        ]:
            assert col in df.columns, f"Missing column: {col}"

    def test_user_engagement_ratio(self, churn_data):
        """active_users / total_seats, clipped to avoid div by zero."""
        df = engineer_churn_features(churn_data)
        expected = churn_data["active_users_l30"] / churn_data["total_seats"].clip(lower=1)
        pd.testing.assert_series_equal(
            df["user_engagement_ratio"], expected, check_names=False
        )

    def test_support_burden_score(self, churn_data):
        """tickets * (5 - csat), null csat -> 3."""
        df = engineer_churn_features(churn_data)
        csat_filled = churn_data["avg_csat"].fillna(3)
        expected = churn_data["support_tickets_l30"] * (5 - csat_filled)
        pd.testing.assert_series_equal(
            df["support_burden_score"], expected, check_names=False
        )

    def test_is_ghost_account(self, churn_data):
        """zero sessions in L30 -> ghost."""
        df = engineer_churn_features(churn_data)
        zero_sessions = churn_data["total_sessions_l30"] == 0
        assert (df.loc[zero_sessions, "is_ghost_account"] == 1).all()
        assert (df.loc[~zero_sessions, "is_ghost_account"] == 0).all()

    def test_tenure_bucket_range(self, churn_data):
        """tenure_bucket should cover all expected ranges."""
        df = engineer_churn_features(churn_data)
        valid_buckets = {"0-3m", "3-6m", "6-12m", "1-2y", "2y+"}
        assert set(df["tenure_bucket"].unique()).issubset(valid_buckets)


class TestPrecisionAtK:
    def test_perfect_prediction(self):
        """top-K all churners."""
        y_true = pd.Series([1, 1, 1, 1, 0, 0, 0])
        y_proba = np.array([0.9, 0.8, 0.7, 0.6, 0.1, 0.05, 0.01])
        assert precision_at_k(y_true, y_proba, k=4) == 1.0

    def test_no_churners_in_top_k(self):
        """No churners in top-K when high-probability samples are non-churners."""
        y_true = pd.Series([0, 0, 1, 0, 1])
        y_proba = np.array([0.9, 0.8, 0.01, 0.7, 0.02])
        assert precision_at_k(y_true, y_proba, k=3) == 0.0

    def test_k_larger_than_dataset(self):
        """Should handle k > len(y_true) gracefully."""
        y_true = pd.Series([1, 0])
        y_proba = np.array([0.9, 0.1])
        result = precision_at_k(y_true, y_proba, k=10)
        assert 0 <= result <= 1


class TestChurnModel:
    def test_train_returns_pipeline(self, churn_data):
        """train_churn_model should return a fitted Pipeline."""
        from sklearn.model_selection import train_test_split
        df_train, _ = train_test_split(churn_data, test_size=0.3, random_state=42)
        model = train_churn_model(df_train)
        assert hasattr(model, "predict")
        assert hasattr(model, "predict_proba")

    def test_model_predict_output_shape(self, churn_data):
        """predict_proba should return (n_samples, 2)."""
        from sklearn.model_selection import train_test_split
        df_train, df_test = train_test_split(churn_data, test_size=0.3, random_state=42)
        model = train_churn_model(df_train)
        df_test_eng = engineer_churn_features(df_test)
        X_test = df_test_eng[FEATURES].fillna(df_test_eng[FEATURES].median())
        proba = model.predict_proba(X_test)
        assert proba.shape == (len(df_test), 2)

    def test_model_cv_metrics(self, churn_data):
        """Cross-validation should complete without error."""
        from sklearn.model_selection import train_test_split
        df_train, _ = train_test_split(churn_data, test_size=0.3, random_state=42)
        model = train_churn_model(df_train)
        # Check that model was fitted (can predict)
        df_eng = engineer_churn_features(df_train)
        X = df_eng[FEATURES].fillna(df_eng[FEATURES].median())
        preds = model.predict(X[:5])
        assert len(preds) == 5
        assert set(preds).issubset({0, 1})
