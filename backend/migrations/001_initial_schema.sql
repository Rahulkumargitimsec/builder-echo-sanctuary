CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL UNIQUE,
    description VARCHAR(160) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_load (
    id SERIAL PRIMARY KEY,
    recorded_at TIMESTAMPTZ NOT NULL,
    demand_mw DOUBLE PRECISION NOT NULL,
    source VARCHAR(80) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS historical_load_recorded_at_idx ON historical_load (recorded_at);

CREATE TABLE IF NOT EXISTS weather_observations (
    id SERIAL PRIMARY KEY,
    recorded_at TIMESTAMPTZ NOT NULL,
    temperature_c DOUBLE PRECISION,
    rainfall_mm DOUBLE PRECISION,
    source VARCHAR(80) NOT NULL DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS weather_observations_recorded_at_idx ON weather_observations (recorded_at);

CREATE TABLE IF NOT EXISTS calendar_context (
    id SERIAL PRIMARY KEY,
    calendar_date TIMESTAMPTZ NOT NULL UNIQUE,
    is_weekend BOOLEAN NOT NULL DEFAULT FALSE,
    is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    festival_name VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    forecast_for TIMESTAMPTZ NOT NULL,
    demand_mw DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION,
    model_name VARCHAR(120) NOT NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS predictions_forecast_for_idx ON predictions (forecast_for);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
