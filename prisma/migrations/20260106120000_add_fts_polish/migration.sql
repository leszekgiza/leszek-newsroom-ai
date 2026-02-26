-- ============================================
-- PostgreSQL Full-Text Search with Polish Language
-- Migration: add_fts_polish
-- ============================================

-- 1. Enable unaccent extension for handling Polish diacritics
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create custom Polish text search configuration based on simple
-- (pg_catalog.polish may not be available in all PostgreSQL installations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'polish_simple') THEN
    CREATE TEXT SEARCH CONFIGURATION polish_simple (COPY = simple);
    ALTER TEXT SEARCH CONFIGURATION polish_simple
      ALTER MAPPING FOR word, hword, hword_part
      WITH unaccent, simple;
  END IF;
END $$;

-- 3. Add tsvector column for full-text search
ALTER TABLE "articles" ADD COLUMN "search_vector" tsvector;

-- 4. Create GIN index for fast full-text search
CREATE INDEX "idx_articles_search_vector" ON "articles" USING GIN("search_vector");

-- 5. Create function to update search_vector with weighted fields
-- Weights: A (highest) = title + author, B = intro, C (lowest) = summary
CREATE OR REPLACE FUNCTION articles_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('polish_simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('polish_simple', COALESCE(NEW.author, '')), 'A') ||
    setweight(to_tsvector('polish_simple', COALESCE(NEW.intro, '')), 'B') ||
    setweight(to_tsvector('polish_simple', COALESCE(NEW.summary, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for automatic updates on INSERT or UPDATE
CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, intro, summary, author
  ON "articles"
  FOR EACH ROW
  EXECUTE FUNCTION articles_search_vector_update();

-- 7. Backfill existing articles with search vectors
UPDATE "articles" SET search_vector =
  setweight(to_tsvector('polish_simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('polish_simple', COALESCE(author, '')), 'A') ||
  setweight(to_tsvector('polish_simple', COALESCE(intro, '')), 'B') ||
  setweight(to_tsvector('polish_simple', COALESCE(summary, '')), 'C');
