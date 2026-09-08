import sanitizeHtml from "sanitize-html";

/**
 * Text-block rich content is admin-authored (single-owner account, see
 * AGENTS.md), but is still rendered as raw HTML on the public site
 * (ChapterMosaic) — sanitize on write rather than trust the editor's
 * output, as defense in depth against a compromised admin session or a
 * pasted-in snippet. Keeps only what the Tiptap toolbar can produce:
 * paragraphs, bold/italic, and links (with a safe rel/target).
 */
export function sanitizeTextBlockHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "strong", "em", "a", "br"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  }).trim();
}
