CREATE TABLE IF NOT EXISTS cover_similarity (
  cover_url_a TEXT NOT NULL,
  cover_url_b TEXT NOT NULL,
  is_same BOOLEAN NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (cover_url_a, cover_url_b)
);
ALTER TABLE cover_similarity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON cover_similarity FOR ALL USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload schema';
