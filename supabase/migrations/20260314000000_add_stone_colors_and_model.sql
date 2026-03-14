-- Add stone_colors (array of text) and model (unique alphanumeric code, nullable) to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stone_colors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS model text;

COMMENT ON COLUMN products.stone_colors IS 'Array of stone/gem colors (e.g. red, blue, emerald)';
COMMENT ON COLUMN products.model IS 'Unique alphanumeric product code displayed on the item; NULL if not visible';
