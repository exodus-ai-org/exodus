# Philharmonic P0-2.6 — Composer image upload

**Date:** 2026-06-05
**Status:** Approved, executing
**Scope:** Add image attachments to the Philharmonic Group composer. Dual-engine: S3 when configured, base64 fallback otherwise. Mirrors the pattern Chat uses but lives in its own isolated stack — Philharmonic does NOT reuse Chat's `attachmentAtom`.

## Goal

A user sends a Group a request like "make this poster pop more" with the poster pasted in. The composer:

- accepts paste / drag-drop / file picker for images
- uploads to S3 if S3 is fully configured in settings; otherwise converts to base64
- shows thumbnail previews above the textarea with an `X` to remove
- sends `{text, attachments[]}` to the Group; the PM sees the images in its prompt

## Decisions

- **Engine selection at upload time, not send time.** When the user adds an image, we already pick S3 vs base64 and write the resulting `Attachment.url`. This keeps the message-send path linear (no async fork) and makes the preview thumbnail show the real URL the model will use.
- **S3 configured** = all four fields (region/bucket/accessKeyId/secretAccessKey) populated in settings. We check this once at attachment time. Partial config falls back to base64 with a warning toast.
- **Direct upload, not presigned.** We POST FormData to `/api/s3-uploader/direct-upload` (the existing route used by Chat's adjacent features). Simpler than presigned for the file sizes we expect (≤ 10 MB). If we later need larger files we'll add a size threshold.
- **Attachments persist in `conversation_message.parts`.** That JSONB column already carries tool cards; we co-host an `attachment` kind there. No schema change.
- **PM sees images, employees don't (v1).** When `delegateTask` runs, the PM still passes plain-text instructions. Images at the user→PM hop are enough for v1. Future P1 can thread image parts through to employees.
- **Philharmonic atom, not chat atom.** New `philharmonicAttachmentAtom` lives in `stores/philharmonic.ts` and is wiped on send / on conversation switch.

## Out of scope

- Non-image files (PDFs, audio). The composer accepts `image/*` only for v1.
- Drag-drop reordering of attachments.
- Per-employee image visibility (will need a follow-up to widen `delegateTask`).
- Image generation by employees back to the user — already covered by image-generation tool, separate flow.

## Persistence

`conversation_message.parts` becomes a heterogeneous array, distinguished by `kind`:

```ts
type ConversationMessagePart =
  // existing tool execution log (not formally named — tool cards live here today
  // via the live-bubble path; persisted messages don't currently use them but
  // the column is already typed loose)
  { kind: 'attachment'; name: string; url: string; contentType: string }
```

For tool cards we leave the current shape alone — only `attachment` adds a new `kind` discriminator. Existing rows with `null` parts continue to work.

## Service contract

```ts
// renderer
export const sendConversationMessage = (
  id: string,
  content: string,
  attachments?: Attachment[]
) => fetcher<ConversationMessageData>(...)
```

Server route:

```ts
POST /api/philharmonic/conversations/:id/messages
body: { content: string; attachments?: Attachment[] }
```

Attachment shape stays identical to Chat's: `{ name: string; url: string; contentType: string }`. We re-export the type from `@shared/types/chat` instead of forking it — same wire format, less drift.

## PM coordinator

`runPmCoordinator` gains an optional `attachments?: Attachment[]` arg. When present, the user `Message` constructed for `agentLoop` carries multimodal parts:

```ts
const userMessage: Message = {
  role: 'user',
  content: [
    { type: 'text', text: userText },
    ...attachments.map((a) => ({ type: 'image' as const, image: a.url }))
  ],
  timestamp: Date.now()
}
```

This is the standard pi-ai shape. Providers that don't support vision will reject — we surface that as a `conversation_error` (existing path).

History reconstruction (`buildHistory`) also needs to recreate image parts when re-loading prior user messages with attachments. We read `parts` and merge in attachment images alongside the text.

## UI

### `<PhilharmonicAttachmentPreview>` (new)

Tiny strip above the textarea. Each item shows a 48×48 rounded thumbnail with a tiny X. Mirrors Chat's `FilePreview` visually but uses `--ph-*` tokens.

### `<PhilharmonicUploader>` (new)

Paperclip icon button inside the Composer. Hidden `<input type="file" accept="image/*" multiple>`. On change, calls `usePhilharmonicUpload().upload(files)`. Sileo error toast on failure.

### `usePhilharmonicUpload()` hook (new)

```ts
{
  uploading: boolean,
  upload(files: File[]): Promise<void>  // sets atom inside
}
```

Logic:

1. Fetch current settings (cached via SWR or local fetch).
2. For each file:
   - If S3 fully configured → POST FormData to `/api/s3-uploader/direct-upload`. Get back `{key, bucket, region}`. Construct the URL `https://{bucket}.s3.{region}.amazonaws.com/{key}`.
   - Else → convertFileToBase64 (reuse `@/lib/utils`).
3. Push `Attachment[]` into `philharmonicAttachmentAtom`.

### Composer changes

- Renders `<PhilharmonicAttachmentPreview>` above the textarea.
- Replaces the spec §4's "no attachment button" decision with the real paperclip.
- Supports clipboard paste of images (matching Chat's `handlePaste`).
- Send button disabled iff text empty AND no attachments.
- On send: passes attachments to `onSend(text, attachments)` and clears the atom.

### GroupChat changes

- `onSend` signature widens.
- Service call widens.

### Display in bubbles

`GroupMessageBubble` reads attachments from the bubble's `parts` field (passed down through `merged`). For user bubbles, renders thumbnails after the text. Click opens full-size in a new browser window (existing pattern; lazy).

## File touchpoints

| File                                                                       | Change                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/renderer/stores/philharmonic.ts`                                      | `philharmonicAttachmentAtom`                                                 |
| `src/renderer/hooks/use-philharmonic-upload.ts` _(new)_                    | dual-engine upload                                                           |
| `src/renderer/components/philharmonic/chat/attachment-preview.tsx` _(new)_ | thumbnail strip                                                              |
| `src/renderer/components/philharmonic/chat/uploader.tsx` _(new)_           | paperclip button                                                             |
| `src/renderer/components/philharmonic/chat/composer.tsx`                   | preview + uploader + paste + clear                                           |
| `src/renderer/components/philharmonic/chat/group-chat.tsx`                 | thread attachments into sendConversationMessage                              |
| `src/renderer/components/philharmonic/chat/group-message-bubble.tsx`       | render thumbnails for user bubbles                                           |
| `src/renderer/services/philharmonic-chat.ts`                               | sendConversationMessage(id, content, attachments?)                           |
| `src/renderer/stores/philharmonic.ts`                                      | ConversationMessageData.parts already typed; reuse                           |
| `src/main/lib/server/routes/philharmonic-conversations.ts`                 | accept attachments; persist as parts                                         |
| `src/main/lib/ai/philharmonic/pm-coordinator.ts`                           | attachments arg → multimodal user message; buildHistory restores image parts |
| `src/main/lib/db/conversation-queries.ts`                                  | createConversationMessage already accepts parts; nothing to add              |

## Tests

- `use-philharmonic-upload.test.ts` (new): mocks settings + fetch, asserts S3 path when fully configured, base64 path otherwise.
- Lightweight smoke for the bubble change is covered by visual review.

## Rollout

Single commit. No migration.
