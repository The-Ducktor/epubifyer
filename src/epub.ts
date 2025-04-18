import * as cheerio from "cheerio";
import JSZip from "jszip";

// Types for EPUB metadata and content items
type EpubMetadata = {
	title: string;
	creator: string;
	language: string;
	identifier: string;
	date?: string;
	publisher?: string;
	description?: string;
	rights?: string;
	cover?: string; // ID of cover image
};

type EpubItem = {
	id: string;
	href: string;
	mediaType: string;
	properties?: string;
	content: string | Uint8Array;
};

type NavPoint = {
	id: string;
	label: string;
	content: string;
	children?: NavPoint[];
};

class Epub {
	private metadata: EpubMetadata;
	private items: EpubItem[];
	private spine: string[];
	private toc: NavPoint[];
	private cssFiles: string[];
	private uniqueIdCount: number;

	/**
	 * Creates a new EPUB document
	 * @param metadata - Optional metadata for the EPUB
	 */
	constructor(metadata: Partial<EpubMetadata> = {}) {
		this.metadata = {
			title: metadata.title || "Untitled",
			creator: metadata.creator || "Unknown Author",
			language: metadata.language || "en",
			identifier: metadata.identifier || `urn:uuid:${this.generateUUID()}`,
			date: metadata.date || new Date().toISOString().split("T")[0],
			publisher: metadata.publisher,
			description: metadata.description,
			rights: metadata.rights,
			cover: metadata.cover,
		};
		this.items = [];
		this.spine = [];
		this.toc = [];
		this.cssFiles = [];
		this.uniqueIdCount = 0;
	}

	/**
	 * Generates a UUID v4 for use as unique identifier
	 * @returns A string containing a UUID v4
	 * @private
	 */
	private generateUUID(): string {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	/**
	 * Adds a chapter (HTML content file) to the EPUB
	 * @param title - The title of the chapter
	 * @param html - The HTML content
	 * @param id - Optional ID for the chapter (generated if not provided)
	 * @returns The ID of the added chapter
	 */
	async addChapter(
		title: string,
		html: string,
		id: string = "",
	): Promise<string> {
		// Create unique ID if not provided
		if (!id) {
			id = `chapter_${++this.uniqueIdCount}`;
		}

		const href = `text/${id}.xhtml`;

		// Parse HTML with Cheerio - setting xmlMode to true ensures proper XML handling
		const $ = cheerio.load(html, { xmlMode: true });

		const imgPromises: Promise<void>[] = [];
		$("img").each((_, el) => {
			const src = $(el).attr("src");
			if (!src) return;

			// Remote image (http/https)
			if (/^https?:\/\//i.test(src)) {
				const url = src;
				const ext = url.split(".").pop()?.split(/\#|\?/)[0] || "img";
				const imgId = `img_${this.uniqueIdCount++}`;
				const filename = `${imgId}.${ext}`;
				const localHref = `images/${filename}`;
				const mediaType = this.getMediaTypeFromExt(ext);

				const p = fetch(url)
					.then(async (res) => {
						if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
						const buf = new Uint8Array(await res.arrayBuffer());
						this.addImage(imgId, filename, buf, mediaType);
						$(el).attr("src", `../${localHref}`);
					})
					.catch(() => {
						// If fetch fails, leave src as is
					});
				imgPromises.push(p);
			}
			// Data URL image
			else if (/^data:image\/([a-zA-Z0-9.+-]+);base64,/.test(src)) {
				const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
				if (match) {
					const mediaType = match[1];
					const data = match[2];
					const buf = Uint8Array.from(Buffer.from(data, "base64"));
					const ext = this.getExtFromMediaType(mediaType);
					const imgId = `img_${this.uniqueIdCount++}`;
					const filename = `${imgId}.${ext}`;
					this.addImage(imgId, filename, buf, mediaType);
					$(el).attr("src", `../images/${filename}`);
				}
			}
			// Already local, do nothing
		});

		await Promise.all(imgPromises);

		// Prepare properly formatted XHTML content
		let bodyContent: string;

		// Extract content or use the whole document
		if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
			// It's a fragment, wrap the content in a div to preserve namespaces
			bodyContent = $.html();
		} else {
			// It has HTML structure already, extract the body content
			bodyContent = $("body").html() || html;
		}

		// Create a properly formatted XHTML document with correct namespaces
		const finalHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${this.metadata.language}">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  ${this.cssFiles.map((css) => `<link rel="stylesheet" type="text/css" href="../${css}"/>`).join("\n  ")}
</head>
<body>
  ${bodyContent}
</body>
</html>`;

		this.items.push({
			id,
			href,
			mediaType: "application/xhtml+xml",
			content: finalHtml,
		});

		this.spine.push(id);

		// Add to table of contents
		this.toc.push({
			id,
			label: title,
			content: href,
		});

		return id;
	}

	// Helper: get media type from extension
	private getMediaTypeFromExt(ext: string): string {
		switch (ext.toLowerCase()) {
			case "jpg":
			case "jpeg":
				return "image/jpeg";
			case "png":
				return "image/png";
			case "gif":
				return "image/gif";
			case "svg":
				return "image/svg+xml";
			case "webp":
				return "image/webp";
			default:
				return "application/octet-stream";
		}
	}

	// Helper: get extension from media type
	private getExtFromMediaType(mediaType: string): string {
		switch (mediaType) {
			case "image/jpeg":
				return "jpg";
			case "image/png":
				return "png";
			case "image/gif":
				return "gif";
			case "image/svg+xml":
				return "svg";
			case "image/webp":
				return "webp";
			default:
				return "img";
		}
	}

	/**
	 * Adds an image to the EPUB
	 * @param id - The identifier for the image
	 * @param filename - The filename for the image
	 * @param data - The binary data of the image
	 * @param mediaType - The MIME type of the image (e.g., "image/jpeg", "image/png")
	 */
	addImage(
		id: string,
		filename: string,
		data: Uint8Array,
		mediaType: string,
	): void {
		const href = `images/${filename}`;

		// Set as cover image if specified
		const properties = id === this.metadata.cover ? "cover-image" : undefined;

		this.items.push({
			id,
			href,
			mediaType,
			properties,
			content: data,
		});
	}

	/**
	 * Adds a CSS stylesheet to the EPUB
	 * @param id - The identifier for the CSS file
	 * @param css - The CSS content
	 */
	addCSS(id: string, css: string): void {
		const href = `styles/${id}.css`;

		this.items.push({
			id,
			href,
			mediaType: "text/css",
			content: css,
		});

		this.cssFiles.push(href);
	}

	/**
	 * Updates the EPUB metadata
	 * @param metadata - Partial metadata to update
	 */
	setMetadata(metadata: Partial<EpubMetadata>): void {
		this.metadata = { ...this.metadata, ...metadata };
	}

	/**
	 * Adds an entry to the table of contents
	 * @param id - The ID of the content item to add to the TOC
	 * @param title - The title to display in the TOC
	 * @param parentId - Optional parent ID for nesting TOC entries
	 */
	addToTOC(id: string, title: string, parentId?: string): void {
		const item = this.items.find((i) => i.id === id);
		if (!item) return;

		const navPoint: NavPoint = {
			id,
			label: title,
			content: item.href,
		};

		if (!parentId) {
			this.toc.push(navPoint);
		} else {
			this.addToParentNavPoint(this.toc, parentId, navPoint);
		}
	}

	/**
	 * Adds a navigation point to a parent navigation point
	 * @param navPoints - Array of navigation points to search through
	 * @param parentId - ID of the parent navigation point
	 * @param newNavPoint - Navigation point to add
	 * @returns True if the navigation point was added, false otherwise
	 * @private
	 */
	private addToParentNavPoint(
		navPoints: NavPoint[],
		parentId: string,
		newNavPoint: NavPoint,
	): boolean {
		for (const navPoint of navPoints) {
			if (navPoint.id === parentId) {
				navPoint.children = navPoint.children || [];
				navPoint.children.push(newNavPoint);
				return true;
			}
			if (
				navPoint.children &&
				this.addToParentNavPoint(navPoint.children, parentId, newNavPoint)
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Generates the OPF (Open Packaging Format) content
	 * @returns The OPF content as a string
	 * @private
	 */
	private generateOPF(): string {
		const manifestItems = [
			// Add nav file
			`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
		];

		// Add all items to manifest
		this.items.forEach((item) => {
			const props = item.properties ? ` properties="${item.properties}"` : "";
			manifestItems.push(
				`<item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"${props}/>`,
			);
		});

		// Create proper directory structure
		this.ensureDirectoriesExist();

		// Build the spine - only include XHTML files
		const xhtmlItems = this.items.filter(
			(item) => item.mediaType === "application/xhtml+xml" && item.id !== "nav",
		);

		// Use spine order if available, otherwise use all XHTML items
		const spineItems =
			this.spine.length > 0
				? this.spine
						.filter((id) => xhtmlItems.some((item) => item.id === id))
						.map((id) => `<itemref idref="${id}"/>`)
				: xhtmlItems.map((item) => `<itemref idref="${item.id}"/>`);

		// Ensure at least one itemref exists
		if (spineItems.length === 0 && xhtmlItems.length > 0) {
			spineItems.push(`<itemref idref="${xhtmlItems[0].id}"/>`);
		}
		return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${this.metadata.identifier}</dc:identifier>
    <dc:title>${this.metadata.title}</dc:title>
    <dc:creator>${this.metadata.creator}</dc:creator>
    <dc:language>${this.metadata.language}</dc:language>
    <dc:date>${this.metadata.date}</dc:date>
    ${this.metadata.publisher ? `<dc:publisher>${this.metadata.publisher}</dc:publisher>` : ""}
    ${this.metadata.description ? `<dc:description>${this.metadata.description}</dc:description>` : ""}
    ${this.metadata.rights ? `<dc:rights>${this.metadata.rights}</dc:rights>` : ""}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/, "Z")}</meta>
    ${this.metadata.cover ? `<meta name="cover" content="${this.metadata.cover}"/>` : ""}
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine>
    ${spineItems.join("\n    ")}
  </spine>
</package>`;
	}

	/**
	 * Ensures that all required directories exist in the ZIP
	 * @private
	 */
	private ensureDirectoriesExist(): void {
		// Make sure we have directories for all item paths
		const dirs = new Set<string>();

		this.items.forEach((item) => {
			const path = item.href.split("/");
			path.pop(); // Remove filename
			if (path.length > 0) {
				dirs.add(path.join("/"));
			}
		});
	}

	/**
	 * Generates the navigation document (TOC)
	 * @returns The navigation document content as a string
	 * @private
	 */
	private generateNav(): string {
		const renderToc = (navPoints: NavPoint[]): string => {
			if (navPoints.length === 0) {
				// Find the first available chapter
				const firstChapter = this.items.find(
					(item) =>
						item.mediaType === "application/xhtml+xml" && item.id !== "nav",
				);

				if (firstChapter) {
					return `<ol><li><a href="${firstChapter.href}">Start</a></li></ol>`;
				}
				// Fallback to an empty list if no chapters exist
				return `<ol><li><a href="#">Start</a></li></ol>`;
			}
			return `<ol>
        ${navPoints
					.map(
						(np) => `
          <li>
            <a href="${np.content}">${np.label}</a>
            ${np.children ? renderToc(np.children) : ""}
          </li>
        `,
					)
					.join("")}
      </ol>`;
		};

		return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8" />
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    ${renderToc(this.toc)}
  </nav>
</body>
</html>`;
	}

	/**
	 * Generates the EPUB file as a JSZip object
	 * @returns Promise resolving to a JSZip object containing the EPUB
	 */
	async generate(): Promise<JSZip> {
		const zip = new JSZip();

		// Add the mimetype file (must be first and uncompressed)
		zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

		// Add META-INF/container.xml
		zip.file(
			"META-INF/container.xml",
			`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		);

		// Add the navigation document
		zip.file("EPUB/nav.xhtml", this.generateNav());

		// Add the OPF file
		zip.file("EPUB/content.opf", this.generateOPF());

		// Create directories first
		const dirs = new Set<string>();
		this.items.forEach((item) => {
			const path = item.href.split("/");
			path.pop(); // Remove filename
			if (path.length > 0) {
				dirs.add(path.join("/"));
			}
		});

		// Ensure directories exist
		dirs.forEach((dir) => {
			zip.folder(`EPUB/${dir}`);
		});

		// Add all items
		for (const item of this.items) {
			zip.file(`EPUB/${item.href}`, item.content);
		}

		return zip;
	}

	/**
	 * Saves the EPUB to a file or returns its content
	 * @param filePath - The path where the EPUB file will be saved.
	 *                   Use "[nothing]" to return content without saving.
	 * @returns Promise resolving to the EPUB content as a Uint8Array if filePath is "[nothing]",
	 *          otherwise undefined after saving to file (Bun only).
	 */
	async save(
		filePath = "[nothing]",
	): Promise<Uint8Array<ArrayBufferLike> | undefined> {
		const zip = await this.generate();

		const content = await zip.generateAsync({ type: "uint8array" });
		if (filePath === "[nothing]") {
			return content; // Return the content for script usage
		}
		await Bun.write(filePath, content);
	}
}

export default Epub;
