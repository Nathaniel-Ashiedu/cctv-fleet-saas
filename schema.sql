-- ============================================================
-- CCTV / IoT Fleet Management SaaS -- core schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- organizations (tenants) ----------
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    plan                VARCHAR(50)  NOT NULL DEFAULT 'free',
    stripe_customer_id  VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- users ----------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'technician',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_org_id ON users(org_id);

-- ---------- sites ----------
CREATE TABLE sites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    address     VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sites_org_id ON sites(org_id);

-- ---------- devices ----------
CREATE TABLE devices (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id           UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    ip_address        INET NOT NULL,
    onvif_xaddr       VARCHAR(500),
    username_enc      TEXT,
    password_enc      TEXT,
    type              VARCHAR(50) NOT NULL DEFAULT 'camera',
    firmware_version  VARCHAR(100),
    status            VARCHAR(20) NOT NULL DEFAULT 'unknown',
    last_seen_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_site_id ON devices(site_id);
CREATE INDEX idx_devices_status ON devices(status);

-- ---------- health_logs ----------
CREATE TABLE health_logs (
    id                 BIGSERIAL PRIMARY KEY,
    device_id          UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    checked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    status             VARCHAR(20) NOT NULL,
    storage_used_pct   NUMERIC(5,2),
    latency_ms         INTEGER,
    raw_response       JSONB
);
CREATE INDEX idx_health_logs_device_id ON health_logs(device_id);
CREATE INDEX idx_health_logs_checked_at ON health_logs(checked_at);

-- ---------- alerts ----------
CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    message     TEXT NOT NULL,
    resolved    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_device_id ON alerts(device_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
