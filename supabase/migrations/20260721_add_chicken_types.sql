-- Create chicken_types table for custom chicken type management
CREATE TABLE IF NOT EXISTS chicken_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chicken_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON chicken_types
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chicken_types_name ON chicken_types(name);
