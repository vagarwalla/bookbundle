CREATE TABLE IF NOT EXISTS isbn_popularity (
  isbn TEXT PRIMARY KEY,
  holdings INT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE isbn_popularity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON isbn_popularity FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
