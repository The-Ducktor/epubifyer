import { htmlToXhtml } from "html-to-xhtml";
import { load } from "cheerio";
import type { AnyNode, Element } from "domhandler";

// ── EPUB 3.3 allowed elements ──────────────────────────────────────────────

const allowedElements = new Set([
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "epub:switch",
  "fieldset",
  "figure",
  "figcaption",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "meta",
  "meter",
  "nav",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);

const allowedGlobalAttrs = new Set([
  "id",
  "class",
  "lang",
  "xml:lang",
  "dir",
  "title",
  "style",
  "epub:type",
  "role",
  "aria-label",
  "aria-hidden",
  "tabindex",
]);

const allowedByTag: Record<string, string[]> = {
  a: ["href", "target", "rel", "download", "hreflang", "type", "ping"],
  img: ["src", "alt", "width", "height", "loading", "decoding", "crossorigin"],
  link: ["href", "rel", "type", "media", "sizes", "crossorigin"],
  meta: ["name", "content", "http-equiv", "charset"],
  script: ["src", "type", "async", "defer", "crossorigin"],
  input: ["type", "name", "value", "checked", "placeholder", "readonly", "disabled", "required"],
  button: ["type", "name", "value", "disabled", "form"],
  form: ["action", "method", "enctype", "name", "target", "novalidate"],
  iframe: ["src", "srcdoc", "name", "sandbox", "allow", "allowfullscreen", "loading"],
};

// ── EPUB sanitization ─────────────────────────────────────────────────────

/**
 * Pre-process HTML with Cheerio to strip elements/attributes
 * not allowed per EPUB 3.3. Returns clean body inner HTML.
 */
function sanitizeHtml(html: string): string {
  const $ = load(html);
  const body = $("body");
  const rootNodes = (body.length ? body.contents() : $.root().contents()).toArray();

  function cleanElement(node: AnyNode): void {
    if (node.type !== "tag") return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (!allowedElements.has(tag)) {
      if (el.children.length > 0) {
        const span = $("<span></span>").addClass(`converted-${tag}`);
        const children = [...el.children];
        for (const child of children) {
          span.append(child);
        }
        $(el).replaceWith(span);
        for (const child of span.contents().toArray()) {
          cleanElement(child);
        }
        return;
      }
      $(el).remove();
      return;
    }

    for (const name of Object.keys(el.attribs)) {
      if (
        !allowedGlobalAttrs.has(name) &&
        !name.startsWith("data-") &&
        !allowedByTag[tag]?.includes(name)
      ) {
        $(el).removeAttr(name);
      }
    }

    for (const child of [...el.children]) {
      cleanElement(child);
    }
  }

  for (const node of rootNodes) {
    cleanElement(node);
  }

  return body.length ? body.html() || "" : $.root().html() || "";
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Converts raw HTML to EPUB-compliant XHTML.
 *
 * Uses **parse5** (via `html-to-xhtml`) for spec-correct HTML5 parsing and
 * strict XHTML serialization — handles CDATA wrapping in `<script>`/`<style>`,
 * self-closing void elements, boolean attribute expansion,
 * `xml:lang` mirroring, SVG/MathML namespace re-assertion, illegal XML char
 * stripping, and comment `--` escaping.
 *
 * EPUB 3.3 element/attribute filtering is applied as a pre-processing step
 * with Cheerio before the XHTML conversion.
 *
 * @param html   - Raw HTML input.
 * @param options.bodyOnly - Return only the `<body>` child content (no
 *                           `<?xml?>`, DOCTYPE, `<html>`, `<head>`, or
 *                           `<body>` wrapper).
 * @param options.lang     - Language tag to stamp on `<html>` as both
 *                           `lang` and `xml:lang`.
 * @returns XHTML string compliant with EPUB 3.3.
 */
export function convertHtmlToXhtml(
  html: string,
  options: { bodyOnly?: boolean; lang?: string } = {},
): string {
  try {
    // Step 1: strip EPUB-disallowed elements/attributes
    const cleanedHtml = sanitizeHtml(html);

    // Step 2: robust HTML → XHTML via parse5
    const result = htmlToXhtml(cleanedHtml, {
      epub: true,
      pretty: false,
      lang: options.lang,
    });

    if (options.bodyOnly) {
      const bodyMatch = result.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? bodyMatch[1].trim() : cleanedHtml;
    }

    return result;
  } catch (error) {
    console.error("Error converting HTML to XHTML:", error);
    return `<div>${html.replace(/<\/?[^>]+(>|$)/g, "")}</div>`;
  }
}
