-- Optional shorter title for search results / browser tabs (the page H1
-- keeps the full headline). Used when the site is built from the API.
ALTER TABLE articles ADD COLUMN seo_title TEXT;
