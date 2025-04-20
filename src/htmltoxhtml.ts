import { DOMParser, XMLSerializer } from "xmldom";

/**
 * Converts HTML to well-formed XHTML using xmldom's DOMParser and XMLSerializer.
 * This approach is more robust and standards-compliant than manual string manipulation.
 *
 * @param html The HTML string to convert.
 * @returns XHTML string.
 */
export function convertHtmlToXhtml(html: string): string {
	// Parse the HTML string into a DOM Document
	const parser = new DOMParser();
	// "text/html" parsing in xmldom is limited, so "text/xml" is more strict, but for best HTML support, "text/html" is used here.
	// If HTML is not well-formed, you may get better results with "text/xml".
	const doc = parser.parseFromString(html, "text/html");
	if (!doc) throw new Error("Failed to parse HTML");

	// Find the body element (if present) and serialize only its children,
	// or serialize the whole document if you want the full XHTML output.
	const body = doc.getElementsByTagName("body")[0];

	// Prepare the XMLSerializer
	const serializer = new XMLSerializer();

	// Serialize the body content as XHTML (children only) or the whole document
	if (body) {
		let xhtml = "";
		for (let i = 0; i < body.childNodes.length; i++) {
			xhtml += serializer.serializeToString(body.childNodes[i]);
			if (i < body.childNodes.length - 1) xhtml += "\n";
		}
		return xhtml.trim();
	}
	// Fallback: serialize the whole document
	return serializer.serializeToString(doc).trim();
}

// Example usage
// const html = `<div><img src="test.jpg"><br>Some & text</div>`;
// const xhtml = convertHtmlToXhtml(html);
// console.log(xhtml);
