-- Применить ПОСЛЕ `prisma migrate dev` (этот файл — для ручного запуска)
-- Полнотекстовый поиск по статьям библиотеки на русском языке.
-- Добавляет GIN-индекс по сгенерированному tsvector (title + excerpt + body).

ALTER TABLE library_articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce(title, '')),   'A') ||
    setweight(to_tsvector('russian', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(body, '')),    'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS library_articles_search_idx
  ON library_articles USING GIN (search_vector);
