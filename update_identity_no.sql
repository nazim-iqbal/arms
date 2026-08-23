-- SQL script to add identity_no column to rickshaws table
-- Identity No is a 3-digit unique identifier (101+ for Rickshaw, 201+ for Auto)

ALTER TABLE public.rickshaws ADD COLUMN identity_no TEXT UNIQUE;
