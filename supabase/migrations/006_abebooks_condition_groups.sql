-- Remap conditions to match AbeBooks' 4 filter groups exactly:
--   new          → new              (unchanged)
--   like_new     → fine             (AbeBooks: "As New, Fine or Near Fine")
--   very_good    → good             (AbeBooks: "Very Good or Good" — combined tier)
--   good         → good             (AbeBooks: "Very Good or Good" — combined tier)
--   acceptable   → fair             (AbeBooks: "Fair or Poor")

-- Update cart_items conditions arrays
UPDATE cart_items
SET conditions = (
  SELECT array_agg(DISTINCT mapped ORDER BY mapped)
  FROM unnest(conditions) AS c,
  LATERAL (
    SELECT CASE c
      WHEN 'like_new'   THEN 'fine'
      WHEN 'very_good'  THEN 'good'
      WHEN 'acceptable' THEN 'fair'
      ELSE c
    END AS mapped
  ) t
)
WHERE conditions && ARRAY['like_new', 'very_good', 'acceptable'];

-- Update carts default_conditions arrays
UPDATE carts
SET default_conditions = (
  SELECT array_agg(DISTINCT mapped ORDER BY mapped)
  FROM unnest(default_conditions) AS c,
  LATERAL (
    SELECT CASE c
      WHEN 'like_new'   THEN 'fine'
      WHEN 'very_good'  THEN 'good'
      WHEN 'acceptable' THEN 'fair'
      ELSE c
    END AS mapped
  ) t
)
WHERE default_conditions && ARRAY['like_new', 'very_good', 'acceptable'];
