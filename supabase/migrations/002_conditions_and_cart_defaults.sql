-- Add conditions[] array and max_price to cart_items (replaces condition_min)
-- Add per-cart defaults for conditions, format, and max_price

-- 1. Add new columns to cart_items
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS conditions TEXT[] DEFAULT ARRAY['new', 'like_new'],
  ADD COLUMN IF NOT EXISTS max_price NUMERIC DEFAULT NULL;

-- 2. Migrate existing condition_min values into the new conditions array
--    (condition_min was a minimum threshold; expand it to all acceptable conditions)
UPDATE cart_items SET conditions =
  CASE condition_min
    WHEN 'new'        THEN ARRAY['new']
    WHEN 'like_new'   THEN ARRAY['like_new', 'new']
    WHEN 'very_good'  THEN ARRAY['very_good', 'like_new', 'new']
    WHEN 'good'       THEN ARRAY['good', 'very_good', 'like_new', 'new']
    ELSE ARRAY['new', 'like_new']
  END
WHERE condition_min IS NOT NULL AND conditions = ARRAY['new', 'like_new'];

-- 3. Drop the old condition_min column
ALTER TABLE cart_items DROP COLUMN IF EXISTS condition_min;

-- 4. Add cart-level defaults
ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS default_conditions TEXT[] DEFAULT ARRAY['new', 'like_new'],
  ADD COLUMN IF NOT EXISTS default_format TEXT DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS default_max_price NUMERIC DEFAULT NULL;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
