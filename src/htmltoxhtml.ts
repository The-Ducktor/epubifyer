import { DOMParser, XMLSerializer } from "xmldom";

/**
 * Converts an HTML string to well-formed XHTML using xmldom's DOMParser and XMLSerializer.
 * Suitable for Node.js or server-side rendering environments.
 *
 * @param html - The raw HTML input.
 * @param options - Optional settings for serialization.
 * @returns A well-formed XHTML string.
 */
export function convertHtmlToXhtml(
  html: string,
  options: { bodyOnly?: boolean } = {}
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  if (!doc) {
    throw new Error("Failed to parse HTML.");
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

  // Ensure XHTML namespace if needed
  if (!doc.documentElement.getAttribute("xmlns")) {
    doc.documentElement.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  }

  return serializer.serializeToString(doc).trim();
}

// Example usage:
// const html = `<div><img src="test.jpg"><br>Some & text</div>`;
// const xhtml = convertHtmlToXhtml(html, { bodyOnly: true });
// console.log(xhtml);
