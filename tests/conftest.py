"""Shared fixtures for portfolio tests."""

import numpy as np
import pandas as pd
import pytest


@pytest.fixture(scope="session")
def credit_risk_data():
    """Generate synthetic credit risk dataset matching model_pipeline.py schema."""
    np.random.seed(42)
    n = 1000
    df = pd.DataFrame({
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
        "employment_type": np.random.choice(
            ["salaried", "self_employed", "gig"], n, p=[0.6, 0.3, 0.1]
        ),
        "city_tier": np.random.choice(
            ["tier_1", "tier_2", "tier_3"], n, p=[0.4, 0.4, 0.2]
        ),
        "is_default": np.random.binomial(1, 0.18, n),
    })
    return df


@pytest.fixture(scope="session")
def churn_data():
    """Generate synthetic churn dataset matching churn_pipeline.py schema."""
    np.random.seed(42)
    n = 500
    df = pd.DataFrame({
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
    return df
