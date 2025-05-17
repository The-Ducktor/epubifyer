import { DOMParser as XmldomParser, XMLSerializer } from "xmldom";
import { DOMParser as DenoDOMParser } from "@b-fuze/deno-dom";

/**
 * Preprocesses HTML using Deno DOM to remove invalid attributes and elements.
 * Returns clean HTML string only.
 *
 * @param html - Raw HTML input.
 * @returns Cleaned HTML string (inner body content).
 */
function preprocessHtmlWithDenoDom(html: string): string {
	const denoParser = new DenoDOMParser();
	const doc = denoParser.parseFromString(html, "text/html");

	if (!doc) {
		throw new Error("Failed to parse HTML with Deno DOM.");
	}

	// Set of allowed elements in EPUB XHTML content
	// Based on EPUB 3.3 spec and XHTML requirements
	const allowedElements = new Set([
		// Document elements
		"html",
		"head",
		"body",
		"meta",
		// Section elements
		"section",
		"nav",
		"article",
		"aside",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"header",
		"footer",
		"address",
		// Grouping content
		"p",
		"hr",
		"pre",
		"blockquote",
		"ol",
		"ul",
		"li",
		"dl",
		"dt",
		"dd",
		"figure",
		"figcaption",
		"main",
		"div",
		// Text-level semantics
		"a",
		"abbr",
		"area",
		"audio",
		"b",
		"bdi",
		"bdo",
		"br",
		"button",
		"canvas",
		"cite",
		"code",
		"data",
		"datalist",
		"del",
		"dfn",
		"em",
		"embed",
		"i",
		"iframe",
		"img",
		"input",
		"ins",
		"kbd",
		"label",
		"link",
		"map",
		"mark",
		"meter",
		"object",
		"output",
		"picture",
		"progress",
		"q",
		"ruby",
		"s",
		"samp",
		"script",
		"select",
		"slot",
		"small",
		"span",
		"strong",
		"sub",
		"sup",
		"template",
		"textarea",
		"time",
		"u",
		"var",
		"video",
		"wbr",
		// Table content
		"table",
		"caption",
		"colgroup",
		"col",
		"tbody",
		"thead",
		"tfoot",
		"tr",
		"td",
		"th",
		// Forms
		"form",
		"fieldset",
		"legend",
		"optgroup",
		"option",
		// EPUB specific
		"epub:switch",
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
		img: [
			"src",
			"alt",
			"width",
			"height",
			"loading",
			"decoding",
			"crossorigin",
		],
		link: ["href", "rel", "type", "media", "sizes", "crossorigin"],
		meta: ["name", "content", "http-equiv", "charset"],
		script: ["src", "type", "async", "defer", "crossorigin"],
		input: [
			"type",
			"name",
			"value",
			"checked",
			"placeholder",
			"readonly",
			"disabled",
			"required",
		],
		button: ["type", "name", "value", "disabled", "form"],
		form: ["action", "method", "enctype", "name", "target", "novalidate"],
		iframe: [
			"src",
			"srcdoc",
			"name",
			"sandbox",
			"allow",
			"allowfullscreen",
			"loading",
		],
	};

	function cleanElement(el: any) {
		if (!el) return;

		// Skip non-element nodes
		if (el.nodeType !== 1) return;

		const tag = el.tagName?.toLowerCase?.() ?? "";

		// Handle invalid elements - replace with spans or remove
		if (!allowedElements.has(tag)) {
			if (el.childNodes && el.childNodes.length > 0) {
				// If element has content, replace with span to preserve content
				const span = doc.createElement("span");
				span.className = `converted-${tag}`;

				// Move all children to the new span
				while (el.firstChild) {
					span.appendChild(el.firstChild);
				}

				// Clean the new span's children
				for (const child of span.childNodes) {
					cleanElement(child);
				}

				// Replace the original element with the span
				if (el.parentNode) {
					el.parentNode.replaceChild(span, el);
				}
				return; // Element already processed
			} else {
				// If no content, remove the element
				if (el.parentNode) {
					el.parentNode.removeChild(el);
				}
				return; // Element already removed
			}
		}

		// Clean attributes for valid elements
		if (el.attributes) {
			for (const attr of [...el.attributes]) {
				const name = attr.name;

				const isAllowed =
					allowedGlobalAttrs.has(name) ||
					name.startsWith("data-") ||
					(allowedByTag[tag] && allowedByTag[tag].includes(name));

				if (!isAllowed) {
					el.removeAttribute(name);
				}
			}
		}

		// Process children recursively
		if (el.childNodes) {
			for (const child of [...el.childNodes]) {
				cleanElement(child);
			}
		}
	}

	// Start cleaning from body
	if (doc.body) {
		// Process all nodes in body
		for (const node of [...doc.body.childNodes]) {
			cleanElement(node);
		}
	}

	return doc.body?.innerHTML || ""; // Return only the cleaned markup
}

/**
 * Converts an HTML string to well-formed EPUB-compatible XHTML using xmldom.
 * Filters out invalid elements and attributes according to EPUB 3.3 spec.
 *
 * @param html - Raw HTML input.
 * @param options - Configuration options.
 * @param options.bodyOnly - Whether to return only the body content.
 * @returns XHTML string compliant with EPUB 3.3.
 */
export function convertHtmlToXhtml(
	html: string,
	options: { bodyOnly?: boolean } = {},
): string {
	try {
		// First pass: use Deno DOM to clean up invalid elements and attributes
		const cleanedHtml = preprocessHtmlWithDenoDom(html);

		// Second pass: ensure well-formed XML with xmldom parser
		const parser = new XmldomParser({
			errorHandler: {
				warning: (msg) => console.warn(`XHTML parser warning: ${msg}`),
				error: (msg) => console.error(`XHTML parser error: ${msg}`),
				fatalError: (msg) => {
					throw new Error(`Fatal XHTML parsing error: ${msg}`);
				},
			},
		});

		const doc = parser.parseFromString(cleanedHtml, "text/html");

		if (!doc) {
			throw new Error("Failed to parse cleaned HTML with xmldom.");
		}

		const serializer = new XMLSerializer();

		if (options.bodyOnly) {
			const body = doc.getElementsByTagName("body")[0];
			if (!body) return "";

			return Array.from(body.childNodes)
				.map((node) => serializer.serializeToString(node))
				.join("\n")
				.trim();
		}

		// Ensure XHTML namespace
		if (!doc.documentElement.getAttribute("xmlns")) {
			doc.documentElement.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
		}

		return serializer.serializeToString(doc).trim();
	} catch (error) {
		console.error("Error converting HTML to XHTML:", error);
		// Return a fallback clean version that removes problematic content
		return `<div>${html.replace(/<\/?[^>]+(>|$)/g, "")}</div>`;
	}
}

// Example usage:
// const rawHtml = `<div 14-year-old opportunity: --><img src="x.jpg"><br>Some & text</div>`;
// const xhtml = convertHtmlToXhtml(rawHtml, { bodyOnly: true });
// console.log(xhtml);
