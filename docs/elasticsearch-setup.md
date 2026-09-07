# Elasticsearch Setup Guide

Exodus's built-in chat search (backed by PGlite + `pg_trgm`) works across
all languages, including Chinese, Japanese, and Korean — it just does exact
substring matching, not "smart" search: no relevance ranking, no typo
tolerance, no stemming. If that's already good enough for you, you don't
need anything in this guide — the built-in search needs zero configuration
and works out of the box.

Configure Elasticsearch if you want:

- **Real word-level segmentation** for Chinese/Japanese/Korean (e.g.
  distinguishing "北京" as one word rather than matching any message that
  happens to contain those two characters anywhere).
- **Relevance ranking** — results ordered by how well they match, not just
  "contains this text."
- To search a very large chat history faster than a substring scan.

## Exodus's contract: what it does and doesn't do

Exodus is a **consumer** of your Elasticsearch cluster, not an operator of
it. Concretely:

- Exodus only ever calls `index`, `search`, `delete_by_query`, and the bulk
  helper (for reindexing) against the index name you configure.
- **Exodus never creates the index, never sets a mapping, and never
  installs or configures an analyzer.** If you point Exodus at an index
  that doesn't exist yet, Elasticsearch's own dynamic mapping will create
  it automatically on first write — using the default `standard`
  analyzer, which has the _same_ CJK weakness as not using Elasticsearch
  at all (it tokenizes Chinese/Japanese/Korean character-by-character, not
  word-by-word).

So getting real value out of Elasticsearch requires **you** to create the
index with an explicit mapping _before_ pointing Exodus at it. This guide
shows you how.

## What Exodus writes

Understanding the document shape lets you write a correct mapping. For
each searchable chat message, Exodus writes:

| Field        | Type            | Notes                                                                        |
| ------------ | --------------- | ---------------------------------------------------------------------------- |
| `_id`        | —               | The message's UUID (used as the Elasticsearch document ID directly)          |
| `chatId`     | string          | The chat this message belongs to                                             |
| `searchText` | string          | The actual message text — **this is the field your analyzer choice affects** |
| `createdAt`  | date (ISO 8601) | When the message was created                                                 |

`chatId` is only ever used for exact-match deletion (when a chat or
project is deleted), never for full-text search — its mapping doesn't
matter for search quality. `searchText` is the field to get right.

## Step 1: Create the index with an explicit mapping

Pick one of the two options below, then run the equivalent of this against
your cluster (via `curl`, Kibana Dev Tools, or any Elasticsearch client) —
**before** configuring the URL in Exodus's Full Text Search settings:

### Option A — zero-dependency baseline (`cjk` analyzer)

Ships with core Elasticsearch, no plugin install required. Splits
non-CJK text with standard word-boundary rules and CJK text into
overlapping two-character pairs — a real improvement over the dynamic
mapping default, with no extra setup.

```bash
curl -X PUT "https://your-cluster:9200/exodus-messages" \
  -u "elastic:your-password" \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "chatId": { "type": "keyword" },
        "searchText": { "type": "text", "analyzer": "cjk" },
        "createdAt": { "type": "date" }
      }
    }
  }'
```

### Option B — real Chinese word segmentation (`ik` or `smartcn`)

For meaningfully better precision on Chinese text specifically —
segments into actual words ("北京", "烤鸭") rather than character pairs.
Requires installing a plugin on your cluster first:

- [`analysis-smartcn`](https://www.elastic.co/guide/en/elasticsearch/plugins/current/analysis-smartcn.html) —
  official Elastic-maintained plugin. Install with:
  `bin/elasticsearch-plugin install analysis-smartcn` (or the equivalent
  for your deployment — Docker image, Elastic Cloud extension, etc.), then
  restart the node.
- [`elasticsearch-analysis-ik`](https://github.com/infinilabs/analysis-ik) —
  community plugin, generally considered the most precise for Chinese,
  supports custom dictionaries. Install per that project's instructions
  for your Elasticsearch version.

Once the plugin is installed and the node restarted, create the index
with that analyzer instead:

```bash
curl -X PUT "https://your-cluster:9200/exodus-messages" \
  -u "elastic:your-password" \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "chatId": { "type": "keyword" },
        "searchText": { "type": "text", "analyzer": "smartcn" },
        "createdAt": { "type": "date" }
      }
    }
  }'
```

(Replace `"smartcn"` with `"ik_max_word"` if you installed `ik` instead.)

If your chat history is primarily English or another space-delimited
language, neither of these matters much — the `standard` analyzer (ES's
default) already handles that case well, so Option A is a safe default
regardless of language mix.

## Step 2: Point Exodus at your cluster

In Exodus, open **Settings → Full Text Search**, and fill in:

- **Elasticsearch URL** — e.g. `https://your-cluster:9200`
- **Username** / **Password** — only if your cluster has security enabled
- **Index Name** — must match the index name you created in Step 1
  exactly (defaults to `exodus-messages` if left blank, matching the
  examples above)

Click **Test Connection** to confirm Exodus can reach the cluster (this
checks cluster connectivity via a simple health check — it does not
verify the index/mapping is correct).

## Step 3: Reindex existing history

If you already have chat history before configuring Elasticsearch, click
**Reindex History** in the same settings tab. This bulk-indexes all
existing searchable messages into your newly-created index. New messages
are indexed automatically going forward — no need to re-run this unless
you recreate the index later (e.g. to change the analyzer).

## Compatibility

Exodus uses `@elastic/elasticsearch` (the official JS client) targeting
Elasticsearch 8.x/9.x-compatible clusters. If you're using a
significantly older or newer major version, check the
[official client compatibility notes](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/introduction.html)
for your specific version.

## Falling back to the built-in search

Elasticsearch is entirely optional. If it's ever unreachable, misconfigured,
or you decide you don't need it, Exodus automatically falls back to the
built-in PGlite search for that request — nothing breaks. To disable
Elasticsearch entirely, clear the URL field in Settings → Full Text Search.
