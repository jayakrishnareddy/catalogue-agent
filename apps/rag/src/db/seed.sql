-- Seed 10–15 jewellery items for RAG demo
-- Run after schema.sql
--
-- Supabase will warn "Query has destructive operations": the DELETEs below
-- clear rag_product_embeddings and rag_products only. Safe to run if you
-- are okay resetting those two tables to the 15 sample rows.

DELETE FROM rag_product_embeddings;
DELETE FROM rag_products;

INSERT INTO rag_products (id, title, category, subcategory, stone_color, occasion, price, description, stock_qty) VALUES
  ('a1000001-0001-4000-8000-000000000001', 'White Pearl Bridal Necklace Set', 'Necklace', 'Bridal', 'white', 'Bridal', 899, 'Elegant white pearl bridal necklace set with matching earrings.', 3),
  ('a1000001-0001-4000-8000-000000000002', 'Red Kundan Bridal Earrings', 'Earrings', 'Bridal', 'red', 'Bridal', 750, 'Traditional red kundan bridal earrings with stone work.', 5),
  ('a1000001-0001-4000-8000-000000000003', 'Green Emerald Jhumka Earrings', 'Earrings', 'Jhumka', 'green', 'Party', 1200, 'Green emerald stone jhumka earrings for party wear.', 2),
  ('a1000001-0001-4000-8000-000000000004', 'Daily Wear Gold Plated Necklace', 'Necklace', 'Daily', 'gold', 'Daily', 699, 'Lightweight gold plated necklace for daily wear.', 10),
  ('a1000001-0001-4000-8000-000000000005', 'Red Stone Bridal Choker', 'Necklace', 'Bridal', 'red', 'Bridal', 950, 'Red stone bridal choker with intricate design.', 1),
  ('a1000001-0001-4000-8000-000000000006', 'White Diamond Look Earrings', 'Earrings', 'Stud', 'white', 'Party', 650, 'White diamond look stud earrings for party wear.', 8),
  ('a1000001-0001-4000-8000-000000000007', 'Green Stone Bangles Set', 'Bangles', 'Bridal', 'green', 'Bridal', 550, 'Green stone bangles set for bridal wear.', 4),
  ('a1000001-0001-4000-8000-000000000008', 'White Bridal Necklace Under 1000', 'Necklace', 'Bridal', 'white', 'Bridal', 999, 'White pearl bridal necklace under 1000.', 2),
  ('a1000001-0001-4000-8000-000000000009', 'Red Jhumka Earrings Under 1000', 'Earrings', 'Jhumka', 'red', 'Party', 899, 'Red stone jhumka earrings under 1000.', 6),
  ('a1000001-0001-4000-8000-00000000000a', 'Diamond Look Necklace Set', 'Necklace', 'Party', 'white', 'Party', 1899, 'Diamond look necklace set for party and occasions.', 3),
  ('a1000001-0001-4000-8000-00000000000b', 'Daily Wear White Pearl Studs', 'Earrings', 'Stud', 'white', 'Daily', 399, 'Simple white pearl stud earrings for daily wear.', 12),
  ('a1000001-0001-4000-8000-00000000000c', 'Green Emerald Necklace', 'Necklace', 'Party', 'green', 'Party', 2100, 'Green emerald stone necklace for special occasions.', 1),
  ('a1000001-0001-4000-8000-00000000000d', 'Red Bridal Bangles', 'Bangles', 'Bridal', 'red', 'Bridal', 450, 'Red stone bridal bangles.', 7),
  ('a1000001-0001-4000-8000-00000000000e', 'Necklace Set Around 700', 'Necklace', 'Daily', 'gold', 'Daily', 699, 'Gold tone necklace set around 700 for daily wear.', 5),
  ('a1000001-0001-4000-8000-00000000000f', 'Diamond Look Earrings and Necklace Set', 'Necklace', 'Party', 'white', 'Party', 1999, 'Diamond look set with earrings and necklace below 2000.', 2);
