# Seed pages

`contacts.json` and `sgotinish.json` hold the Contacts and Sgotinish content as Puck documents. Each file has `name`, `slug`, `description`, `visibility`, `page_content` (Puck `Data`) and `content_text` (what `pageContentText` yields for it).

To publish one:

1. In the UI, create a Page with the file's `name` and `slug`, set visibility to `public`, and save it.
2. In the `pages` row for that slug, set `page_content` to the file's `page_content` and `content_text` to its `content_text`.
3. Open the Page in the editor and press Publish once: that recomputes `content_text` and updates the search index, which a direct row edit skips.

Sgotinish's live stats (appeal counts) have no block and are not included.
