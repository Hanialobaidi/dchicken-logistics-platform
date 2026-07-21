-- Add salary column to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS salary NUMERIC;
