FROM python:3.11-slim

WORKDIR /app

# Install system deps for shap/numba
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt pytest

COPY . .

# Verify files exist
RUN test -f README.md && \
    test -f case_study_1/model_pipeline.py && \
    test -f case_study_2/churn_pipeline.py && \
    echo "All files present"

CMD ["python", "-m", "pytest", "tests/", "-v", "--tb=short"]
