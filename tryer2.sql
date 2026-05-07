-- ============================================================
--  SweetCasa — fresh schema
--  Run this ONCE in Railway Query tab to recreate all tables
-- ============================================================

-- Drop everything cleanly first
DROP TABLE IF EXISTS public.casamatch_history CASCADE;
DROP TABLE IF EXISTS public.saved_listings    CASCADE;
DROP TABLE IF EXISTS public.listings_videos   CASCADE;
DROP TABLE IF EXISTS public.listings_images   CASCADE;
DROP TABLE IF EXISTS public.listings          CASCADE;
DROP TABLE IF EXISTS public.users             CASCADE;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE public.users (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(100)  NOT NULL,
    company_name VARCHAR(100)  DEFAULT NULL,
    email        VARCHAR(255)  NOT NULL UNIQUE,
    password     VARCHAR(255)  NOT NULL,
    phone        BIGINT        DEFAULT 0,
    role         VARCHAR(50)   NOT NULL DEFAULT 'BUYER',
    country      VARCHAR(50)   DEFAULT NULL,
    region       VARCHAR(50)   DEFAULT NULL,
    city         VARCHAR(50)   DEFAULT NULL,
    street       TEXT          DEFAULT NULL,
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON public.users (email);

-- ── listings ─────────────────────────────────────────────────
CREATE TABLE public.listings (
    id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id             INTEGER       DEFAULT NULL,
    title                VARCHAR(120)  NOT NULL,
    price                NUMERIC(12,2) NOT NULL,
    type                 VARCHAR(50)   NOT NULL,
    status               VARCHAR       NOT NULL,
    country              VARCHAR(50)   NOT NULL DEFAULT 'Cameroon',
    city                 VARCHAR(50)   NOT NULL,
    region               VARCHAR(50)   NOT NULL,
    neighborhood         VARCHAR(100)  DEFAULT NULL,
    description          TEXT          NOT NULL,
    bedrooms             INTEGER       DEFAULT 0,
    bathrooms            INTEGER       DEFAULT 0,
    toilets              INTEGER       DEFAULT 0,
    parlors              INTEGER       DEFAULT 0,
    verandas             INTEGER       DEFAULT 0,
    area_sqm             NUMERIC(10,2) DEFAULT NULL,
    floor_number         INTEGER       DEFAULT NULL,
    payment_frequency    VARCHAR(20)   DEFAULT NULL,
    visit_hours          VARCHAR(120)  DEFAULT NULL,
    contact_methods      JSONB         DEFAULT NULL,
    facilities           JSONB         DEFAULT NULL,
    floor_plan_url       TEXT          DEFAULT NULL,
    legal_document_urls  JSONB         DEFAULT NULL,
    approved_at          TIMESTAMP     DEFAULT NULL,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listings_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_listings_owner_id ON public.listings (owner_id);

-- ── listings_images ──────────────────────────────────────────
CREATE TABLE public.listings_images (
    id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id           INTEGER       DEFAULT NULL,
    image_url            TEXT          NOT NULL,
    cloudinary_public_id VARCHAR(255)  DEFAULT NULL,
    is_primary           BOOLEAN       DEFAULT false,
    sort_order           INTEGER       DEFAULT 0,
    uploaded             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listings_images_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

-- ── listings_videos ──────────────────────────────────────────
CREATE TABLE public.listings_videos (
    id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id           INTEGER       DEFAULT NULL,
    video_url            TEXT          NOT NULL,
    thumbnail_url        TEXT          DEFAULT NULL,
    cloudinary_public_id VARCHAR(255)  DEFAULT NULL,
    duration_second      INTEGER       DEFAULT NULL,
    file_size            BIGINT        DEFAULT NULL,
    uploaded             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT listings_videos_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

-- ── saved_listings ───────────────────────────────────────────
CREATE TABLE public.saved_listings (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    INTEGER   NOT NULL,
    listing_id INTEGER   NOT NULL,
    saved_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT saved_listings_user_id_fkey
        FOREIGN KEY (user_id)    REFERENCES public.users(id)    ON DELETE CASCADE,
    CONSTRAINT saved_listings_listing_id_fkey
        FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_saved_listing UNIQUE (user_id, listing_id)
);

-- ── casamatch_history ────────────────────────────────────────
CREATE TABLE public.casamatch_history (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    INTEGER   NOT NULL,
    message    TEXT      DEFAULT NULL,
    ai_reply   TEXT      DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT casamatch_history_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);