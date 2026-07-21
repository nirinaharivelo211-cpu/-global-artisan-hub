-- Migration: Add atelier fields to artisans table
-- Supports the "Mon atelier" dashboard feature

ALTER TABLE public.artisans
  ADD COLUMN IF NOT EXISTS adresse TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS telephone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_contact TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS site_web TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_couverture TEXT DEFAULT '';

-- Backfill photo_couverture from existing image column
UPDATE public.artisans SET photo_couverture = image WHERE photo_couverture = '' AND image IS NOT NULL AND image != '';
