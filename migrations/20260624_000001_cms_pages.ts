import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Creates the `pages` CMS collection: the `pages` table + its block tables
 * (hero / hero_ctas / rich_text / media_block / cta / cta_buttons), the
 * `_pages_v*` draft-version mirror tables, the @payloadcms/plugin-seo `meta_*`
 * columns, all enums, FKs and indexes, plus the `pages_id` reverse-relation
 * column on `payload_locked_documents_rels`.
 *
 * Derived from the drizzle-pushed schema (dev) and verified up/down +
 * idempotent against a clone of the prod schema. Auto-applies on deploy via
 * instrumentation.ts. Idempotent (IF NOT EXISTS / guarded constraints).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
-- enums

DO $$ BEGIN
CREATE TYPE public.enum_pages_status AS ENUM (
    'draft',
    'published'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum_pages_blocks_hero_background AS ENUM (
    'cream',
    'yellow',
    'blue',
    'deep'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum_pages_blocks_hero_ctas_variant AS ENUM (
    'primary',
    'secondary'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum_pages_blocks_media_block_aspect AS ENUM (
    'video',
    'portrait'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum_pages_blocks_cta_background AS ENUM (
    'yellow',
    'pink',
    'blue',
    'deep'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum__pages_v_version_status AS ENUM (
    'draft',
    'published'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum__pages_v_blocks_hero_background AS ENUM (
    'cream',
    'yellow',
    'blue',
    'deep'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum__pages_v_blocks_hero_ctas_variant AS ENUM (
    'primary',
    'secondary'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum__pages_v_blocks_media_block_aspect AS ENUM (
    'video',
    'portrait'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
CREATE TYPE public.enum__pages_v_blocks_cta_background AS ENUM (
    'yellow',
    'pink',
    'blue',
    'deep'
);
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- tables

CREATE TABLE IF NOT EXISTS public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying,
    slug character varying,
    meta_title character varying,
    meta_description character varying,
    meta_image_id uuid,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_pages_status DEFAULT 'draft'::public.enum_pages_status
);

CREATE TABLE IF NOT EXISTS public.pages_blocks_hero (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    eyebrow character varying,
    heading character varying,
    subcopy character varying,
    background public.enum_pages_blocks_hero_background DEFAULT 'cream'::public.enum_pages_blocks_hero_background,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public.pages_blocks_hero_ctas (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    link_label character varying,
    link_url character varying,
    link_new_tab boolean DEFAULT false,
    variant public.enum_pages_blocks_hero_ctas_variant DEFAULT 'primary'::public.enum_pages_blocks_hero_ctas_variant
);

CREATE TABLE IF NOT EXISTS public.pages_blocks_rich_text (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    content jsonb,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public.pages_blocks_media_block (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    media_id uuid,
    caption character varying,
    aspect public.enum_pages_blocks_media_block_aspect DEFAULT 'video'::public.enum_pages_blocks_media_block_aspect,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public.pages_blocks_cta (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id character varying NOT NULL,
    heading character varying,
    subcopy character varying,
    background public.enum_pages_blocks_cta_background DEFAULT 'yellow'::public.enum_pages_blocks_cta_background,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public.pages_blocks_cta_buttons (
    _order integer NOT NULL,
    _parent_id character varying NOT NULL,
    id character varying NOT NULL,
    link_label character varying,
    link_url character varying,
    link_new_tab boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public._pages_v (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    version_title character varying,
    version_slug character varying,
    version_meta_title character varying,
    version_meta_description character varying,
    version_meta_image_id uuid,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__pages_v_version_status DEFAULT 'draft'::public.enum__pages_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    latest boolean
);

CREATE TABLE IF NOT EXISTS public._pages_v_blocks_hero (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eyebrow character varying,
    heading character varying,
    subcopy character varying,
    background public.enum__pages_v_blocks_hero_background DEFAULT 'cream'::public.enum__pages_v_blocks_hero_background,
    _uuid character varying,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public._pages_v_blocks_hero_ctas (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_label character varying,
    link_url character varying,
    link_new_tab boolean DEFAULT false,
    variant public.enum__pages_v_blocks_hero_ctas_variant DEFAULT 'primary'::public.enum__pages_v_blocks_hero_ctas_variant,
    _uuid character varying
);

CREATE TABLE IF NOT EXISTS public._pages_v_blocks_rich_text (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content jsonb,
    _uuid character varying,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public._pages_v_blocks_media_block (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_id uuid,
    caption character varying,
    aspect public.enum__pages_v_blocks_media_block_aspect DEFAULT 'video'::public.enum__pages_v_blocks_media_block_aspect,
    _uuid character varying,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public._pages_v_blocks_cta (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    _path text NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    heading character varying,
    subcopy character varying,
    background public.enum__pages_v_blocks_cta_background DEFAULT 'yellow'::public.enum__pages_v_blocks_cta_background,
    _uuid character varying,
    block_name character varying
);

CREATE TABLE IF NOT EXISTS public._pages_v_blocks_cta_buttons (
    _order integer NOT NULL,
    _parent_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_label character varying,
    link_url character varying,
    link_new_tab boolean DEFAULT false,
    _uuid character varying
);


-- locked-docs reverse relation column

ALTER TABLE public.payload_locked_documents_rels ADD COLUMN IF NOT EXISTS pages_id uuid;


-- constraints (FK / PK / unique)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_cta_buttons_pkey') THEN
    ALTER TABLE ONLY public._pages_v_blocks_cta_buttons
    ADD CONSTRAINT _pages_v_blocks_cta_buttons_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_cta_pkey') THEN
    ALTER TABLE ONLY public._pages_v_blocks_cta
    ADD CONSTRAINT _pages_v_blocks_cta_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_hero_ctas_pkey') THEN
    ALTER TABLE ONLY public._pages_v_blocks_hero_ctas
    ADD CONSTRAINT _pages_v_blocks_hero_ctas_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_hero_pkey') THEN
    ALTER TABLE ONLY public._pages_v_blocks_hero
    ADD CONSTRAINT _pages_v_blocks_hero_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_media_block_pkey') THEN
    ALTER TABLE ONLY public._pages_v_blocks_media_block
    ADD CONSTRAINT _pages_v_blocks_media_block_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_rich_text_pkey') THEN
    ALTER TABLE ONLY public._pages_v_blocks_rich_text
    ADD CONSTRAINT _pages_v_blocks_rich_text_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_pkey') THEN
    ALTER TABLE ONLY public._pages_v
    ADD CONSTRAINT _pages_v_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_cta_buttons_pkey') THEN
    ALTER TABLE ONLY public.pages_blocks_cta_buttons
    ADD CONSTRAINT pages_blocks_cta_buttons_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_cta_pkey') THEN
    ALTER TABLE ONLY public.pages_blocks_cta
    ADD CONSTRAINT pages_blocks_cta_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_hero_ctas_pkey') THEN
    ALTER TABLE ONLY public.pages_blocks_hero_ctas
    ADD CONSTRAINT pages_blocks_hero_ctas_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_hero_pkey') THEN
    ALTER TABLE ONLY public.pages_blocks_hero
    ADD CONSTRAINT pages_blocks_hero_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_media_block_pkey') THEN
    ALTER TABLE ONLY public.pages_blocks_media_block
    ADD CONSTRAINT pages_blocks_media_block_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_rich_text_pkey') THEN
    ALTER TABLE ONLY public.pages_blocks_rich_text
    ADD CONSTRAINT pages_blocks_rich_text_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_pkey') THEN
    ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_cta_buttons_parent_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_cta_buttons
    ADD CONSTRAINT _pages_v_blocks_cta_buttons_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._pages_v_blocks_cta(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_cta_parent_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_cta
    ADD CONSTRAINT _pages_v_blocks_cta_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._pages_v(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_hero_ctas_parent_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_hero_ctas
    ADD CONSTRAINT _pages_v_blocks_hero_ctas_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._pages_v_blocks_hero(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_hero_parent_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_hero
    ADD CONSTRAINT _pages_v_blocks_hero_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._pages_v(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_media_block_media_id_site_media_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_media_block
    ADD CONSTRAINT _pages_v_blocks_media_block_media_id_site_media_id_fk FOREIGN KEY (media_id) REFERENCES public.site_media(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_media_block_parent_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_media_block
    ADD CONSTRAINT _pages_v_blocks_media_block_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._pages_v(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_blocks_rich_text_parent_id_fk') THEN
    ALTER TABLE ONLY public._pages_v_blocks_rich_text
    ADD CONSTRAINT _pages_v_blocks_rich_text_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public._pages_v(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_parent_id_pages_id_fk') THEN
    ALTER TABLE ONLY public._pages_v
    ADD CONSTRAINT _pages_v_parent_id_pages_id_fk FOREIGN KEY (parent_id) REFERENCES public.pages(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_pages_v_version_meta_image_id_site_media_id_fk') THEN
    ALTER TABLE ONLY public._pages_v
    ADD CONSTRAINT _pages_v_version_meta_image_id_site_media_id_fk FOREIGN KEY (version_meta_image_id) REFERENCES public.site_media(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_cta_buttons_parent_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_cta_buttons
    ADD CONSTRAINT pages_blocks_cta_buttons_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages_blocks_cta(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_cta_parent_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_cta
    ADD CONSTRAINT pages_blocks_cta_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_hero_ctas_parent_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_hero_ctas
    ADD CONSTRAINT pages_blocks_hero_ctas_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages_blocks_hero(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_hero_parent_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_hero
    ADD CONSTRAINT pages_blocks_hero_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_media_block_media_id_site_media_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_media_block
    ADD CONSTRAINT pages_blocks_media_block_media_id_site_media_id_fk FOREIGN KEY (media_id) REFERENCES public.site_media(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_media_block_parent_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_media_block
    ADD CONSTRAINT pages_blocks_media_block_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_blocks_rich_text_parent_id_fk') THEN
    ALTER TABLE ONLY public.pages_blocks_rich_text
    ADD CONSTRAINT pages_blocks_rich_text_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_meta_image_id_site_media_id_fk') THEN
    ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_meta_image_id_site_media_id_fk FOREIGN KEY (meta_image_id) REFERENCES public.site_media(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_pages_fk') THEN
    ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pages_fk FOREIGN KEY (pages_id) REFERENCES public.pages(id) ON DELETE CASCADE;
  END IF;
END $$;


-- indexes

CREATE INDEX IF NOT EXISTS _pages_v_blocks_cta_buttons_order_idx ON public._pages_v_blocks_cta_buttons USING btree (_order);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_cta_buttons_parent_id_idx ON public._pages_v_blocks_cta_buttons USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_cta_order_idx ON public._pages_v_blocks_cta USING btree (_order);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_cta_parent_id_idx ON public._pages_v_blocks_cta USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_cta_path_idx ON public._pages_v_blocks_cta USING btree (_path);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_hero_ctas_order_idx ON public._pages_v_blocks_hero_ctas USING btree (_order);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_hero_ctas_parent_id_idx ON public._pages_v_blocks_hero_ctas USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_hero_order_idx ON public._pages_v_blocks_hero USING btree (_order);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_hero_parent_id_idx ON public._pages_v_blocks_hero USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_hero_path_idx ON public._pages_v_blocks_hero USING btree (_path);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_media_block_media_idx ON public._pages_v_blocks_media_block USING btree (media_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_media_block_order_idx ON public._pages_v_blocks_media_block USING btree (_order);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_media_block_parent_id_idx ON public._pages_v_blocks_media_block USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_media_block_path_idx ON public._pages_v_blocks_media_block USING btree (_path);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_rich_text_order_idx ON public._pages_v_blocks_rich_text USING btree (_order);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_rich_text_parent_id_idx ON public._pages_v_blocks_rich_text USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_blocks_rich_text_path_idx ON public._pages_v_blocks_rich_text USING btree (_path);

CREATE INDEX IF NOT EXISTS _pages_v_created_at_idx ON public._pages_v USING btree (created_at);

CREATE INDEX IF NOT EXISTS _pages_v_latest_idx ON public._pages_v USING btree (latest);

CREATE INDEX IF NOT EXISTS _pages_v_parent_idx ON public._pages_v USING btree (parent_id);

CREATE INDEX IF NOT EXISTS _pages_v_updated_at_idx ON public._pages_v USING btree (updated_at);

CREATE INDEX IF NOT EXISTS _pages_v_version_meta_version_meta_image_idx ON public._pages_v USING btree (version_meta_image_id);

CREATE INDEX IF NOT EXISTS _pages_v_version_version__status_idx ON public._pages_v USING btree (version__status);

CREATE INDEX IF NOT EXISTS _pages_v_version_version_created_at_idx ON public._pages_v USING btree (version_created_at);

CREATE INDEX IF NOT EXISTS _pages_v_version_version_slug_idx ON public._pages_v USING btree (version_slug);

CREATE INDEX IF NOT EXISTS _pages_v_version_version_updated_at_idx ON public._pages_v USING btree (version_updated_at);

CREATE INDEX IF NOT EXISTS pages__status_idx ON public.pages USING btree (_status);

CREATE INDEX IF NOT EXISTS pages_blocks_cta_buttons_order_idx ON public.pages_blocks_cta_buttons USING btree (_order);

CREATE INDEX IF NOT EXISTS pages_blocks_cta_buttons_parent_id_idx ON public.pages_blocks_cta_buttons USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS pages_blocks_cta_order_idx ON public.pages_blocks_cta USING btree (_order);

CREATE INDEX IF NOT EXISTS pages_blocks_cta_parent_id_idx ON public.pages_blocks_cta USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS pages_blocks_cta_path_idx ON public.pages_blocks_cta USING btree (_path);

CREATE INDEX IF NOT EXISTS pages_blocks_hero_ctas_order_idx ON public.pages_blocks_hero_ctas USING btree (_order);

CREATE INDEX IF NOT EXISTS pages_blocks_hero_ctas_parent_id_idx ON public.pages_blocks_hero_ctas USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS pages_blocks_hero_order_idx ON public.pages_blocks_hero USING btree (_order);

CREATE INDEX IF NOT EXISTS pages_blocks_hero_parent_id_idx ON public.pages_blocks_hero USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS pages_blocks_hero_path_idx ON public.pages_blocks_hero USING btree (_path);

CREATE INDEX IF NOT EXISTS pages_blocks_media_block_media_idx ON public.pages_blocks_media_block USING btree (media_id);

CREATE INDEX IF NOT EXISTS pages_blocks_media_block_order_idx ON public.pages_blocks_media_block USING btree (_order);

CREATE INDEX IF NOT EXISTS pages_blocks_media_block_parent_id_idx ON public.pages_blocks_media_block USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS pages_blocks_media_block_path_idx ON public.pages_blocks_media_block USING btree (_path);

CREATE INDEX IF NOT EXISTS pages_blocks_rich_text_order_idx ON public.pages_blocks_rich_text USING btree (_order);

CREATE INDEX IF NOT EXISTS pages_blocks_rich_text_parent_id_idx ON public.pages_blocks_rich_text USING btree (_parent_id);

CREATE INDEX IF NOT EXISTS pages_blocks_rich_text_path_idx ON public.pages_blocks_rich_text USING btree (_path);

CREATE INDEX IF NOT EXISTS pages_created_at_idx ON public.pages USING btree (created_at);

CREATE INDEX IF NOT EXISTS pages_meta_meta_image_idx ON public.pages USING btree (meta_image_id);

CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx ON public.pages USING btree (slug);

CREATE INDEX IF NOT EXISTS pages_updated_at_idx ON public.pages USING btree (updated_at);

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_pages_id_idx ON public.payload_locked_documents_rels USING btree (pages_id);
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
DROP TABLE IF EXISTS public._pages_v_blocks_cta_buttons CASCADE;
DROP TABLE IF EXISTS public._pages_v_blocks_cta CASCADE;
DROP TABLE IF EXISTS public._pages_v_blocks_media_block CASCADE;
DROP TABLE IF EXISTS public._pages_v_blocks_rich_text CASCADE;
DROP TABLE IF EXISTS public._pages_v_blocks_hero_ctas CASCADE;
DROP TABLE IF EXISTS public._pages_v_blocks_hero CASCADE;
DROP TABLE IF EXISTS public._pages_v CASCADE;
DROP TABLE IF EXISTS public.pages_blocks_cta_buttons CASCADE;
DROP TABLE IF EXISTS public.pages_blocks_cta CASCADE;
DROP TABLE IF EXISTS public.pages_blocks_media_block CASCADE;
DROP TABLE IF EXISTS public.pages_blocks_rich_text CASCADE;
DROP TABLE IF EXISTS public.pages_blocks_hero_ctas CASCADE;
DROP TABLE IF EXISTS public.pages_blocks_hero CASCADE;
DROP TABLE IF EXISTS public.pages CASCADE;
ALTER TABLE public.payload_locked_documents_rels DROP COLUMN IF EXISTS pages_id;
DROP TYPE IF EXISTS public.enum_pages_status;
DROP TYPE IF EXISTS public.enum_pages_blocks_hero_background;
DROP TYPE IF EXISTS public.enum_pages_blocks_hero_ctas_variant;
DROP TYPE IF EXISTS public.enum_pages_blocks_media_block_aspect;
DROP TYPE IF EXISTS public.enum_pages_blocks_cta_background;
DROP TYPE IF EXISTS public.enum__pages_v_version_status;
DROP TYPE IF EXISTS public.enum__pages_v_blocks_hero_background;
DROP TYPE IF EXISTS public.enum__pages_v_blocks_hero_ctas_variant;
DROP TYPE IF EXISTS public.enum__pages_v_blocks_media_block_aspect;
DROP TYPE IF EXISTS public.enum__pages_v_blocks_cta_background;
  `);
}
