import { DOMParser, Element, Node, Text } from "@b-fuze/deno-dom";

function fixText(text: string): string {
	return String(text)
		.replace(/\n{2,}/g, "\n")
		.replace(/&(?!([a-zA-Z]+|#[0-9]+);)/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\u00A0/g, "&#160;"); // Use numeric entity for nbsp
}

function fixAttribute(text: string): string {
	return String(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/\u00A0/g, "&#160;"); // Use numeric entity for nbsp
}

export function convertHtmlToXhtml(html: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	if (!doc) {
		throw new Error("Failed to parse HTML");
	}

	function processNode(node: Node): string {
		switch (node.nodeType) {
			case node.TEXT_NODE:
				return fixText((node as Text).data || "");

			case node.ELEMENT_NODE: {
				const elem = node as Element;
				const tag = elem.tagName.toLowerCase();

				// Start tag
				let result = `<${tag}`;

				// Add attributes
				for (const attr of Array.from(elem.attributes)) {
					result += ` ${attr.name}="${fixAttribute(attr.value)}"`;
				}

				// Handle self-closing tags
				if (
					/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(
						tag,
					)
				) {
					return result + " />";
				}

				result += ">";

				// Process children
				if (elem.childNodes) {
					for (const child of Array.from(elem.childNodes)) {
						result += processNode(child);
					}
				}

				// End tag
				return result + `</${tag}>`;
			}

			default:
				return "";
		}
	}

	const body = doc.querySelector("body");
	if (!body) {
		throw new Error("No body element found");
	}

	// Use type assertion for body.childNodes since we know it exists
	return Array.from(body.childNodes as ArrayLike<Node>)
		.map((node) => processNode(node))
		.join("\n");
}
