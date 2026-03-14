-- Add min_price and require_stone to match_products. Run in Supabase SQL editor after schema.sql.

CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_count int DEFAULT 12,
  category_filter text DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  min_price numeric DEFAULT NULL,
  stone_color_filter text DEFAULT NULL,
  require_stone boolean DEFAULT FALSE,
  occasion_filter text DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid,
  title text,
  category text,
  subcategory text,
  stone_color text,
  occasion text,
  price numeric,
  description text,
  stock_qty int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.title,
    p.category,
    p.subcategory,
    p.stone_color,
    p.occasion,
    p.price,
    p.description,
    p.stock_qty,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM rag_product_embeddings pe
  JOIN rag_products p ON p.id = pe.product_id
  WHERE
    (category_filter IS NULL OR p.category ILIKE '%' || category_filter || '%')
    AND (max_price IS NULL OR p.price IS NULL OR p.price <= max_price)
    AND (min_price IS NULL OR p.price IS NULL OR p.price >= min_price)
    AND (stone_color_filter IS NULL OR p.stone_color ILIKE '%' || stone_color_filter || '%')
    AND (NOT require_stone OR (p.stone_color IS NOT NULL AND trim(p.stone_color) != ''))
    AND (occasion_filter IS NULL OR p.occasion ILIKE '%' || occasion_filter || '%')
    AND p.stock_qty > 0
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
