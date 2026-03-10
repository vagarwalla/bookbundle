-- Initial schema (already applied at project creation)
-- Included here for completeness so the migration runner has the full history.

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  work_id TEXT,
  isbn_preferred TEXT,
  cover_url TEXT,
  format TEXT DEFAULT 'any',
  condition_min TEXT DEFAULT 'good',
  max_price NUMERIC DEFAULT NULL,
  flexible BOOLEAN DEFAULT false,
  quantity INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT NOT NULL,
  listings JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS price_cache_isbn_idx ON price_cache(isbn);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items(cart_id);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='carts' AND policyname='public_all') THEN
    CREATE POLICY "public_all" ON carts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cart_items' AND policyname='public_all') THEN
    CREATE POLICY "public_all" ON cart_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='price_cache' AND policyname='public_all') THEN
    CREATE POLICY "public_all" ON price_cache FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
