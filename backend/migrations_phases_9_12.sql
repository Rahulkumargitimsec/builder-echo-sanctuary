-- GridSense AI Phases 9-12 additive migration.
-- The application startup also creates these tables for SQLite MVP deployments.

CREATE TABLE IF NOT EXISTS explainability_results (
    id INTEGER PRIMARY KEY,
    prediction_id INTEGER NOT NULL REFERENCES predictions(id),
    model_name VARCHAR(120) NOT NULL,
    feature_contributions_json TEXT NOT NULL DEFAULT '{}',
    explanation TEXT NOT NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_explainability_results_prediction_id ON explainability_results(prediction_id);

CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY,
    category VARCHAR(60) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    action TEXT NOT NULL,
    expected_reduction_mw FLOAT,
    expected_savings FLOAT,
    time_window VARCHAR(120) NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    type VARCHAR(60) NOT NULL,
    format VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    generated_by VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL,
    content TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    dataset_version VARCHAR(80),
    parameters_json TEXT NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'created',
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS research_results (
    id INTEGER PRIMARY KEY,
    experiment_id INTEGER NOT NULL REFERENCES experiments(id),
    model_name VARCHAR(120) NOT NULL,
    metrics_json TEXT NOT NULL DEFAULT '{}',
    reproducibility_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_research_results_experiment_id ON research_results(experiment_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY,
    actor_id VARCHAR(64) REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(80),
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs(actor_id);

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL DEFAULT '',
    updated_by VARCHAR(64) NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL
);
