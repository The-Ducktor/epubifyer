# Epubifyer Source Code

This directory contains the source code for the Epubifyer library, a TypeScript library for creating EPUB 3.3 compatible e-books.

## Files Overview

### `index.ts`

The entry point of the library. It exports the main `Epub` class for use by consumers.

### `epub.ts`

The core implementation of the EPUB creation functionality. This file contains the `Epub` class, which provides methods to:

- Initialize an EPUB with metadata
- Add chapters with HTML content
- Add cover images
- Include CSS stylesheets
- Add images
- Generate and save the EPUB file

The class handles the internal structure of EPUB files, including the OPF (Open Packaging Format), spine, table of contents (TOC), and manifest.

### `types.ts`

Defines TypeScript types used throughout the library:

- `EpubMetadata`: Metadata for the EPUB (title, creator, etc.)
- `EpubItem`: Represents items in the EPUB (chapters, images, etc.)
- `NavPoint`: Structure for table of contents navigation points

### `htmltoxhtml.ts`

Provides functionality to convert raw HTML to well-formed XHTML compliant with EPUB 3.3 specifications. This includes:

- Filtering out invalid elements and attributes
- Ensuring proper XML structure
- Handling EPUB-specific requirements

### `epub.test.ts`

Contains tests for the EPUB creation functionality using Bun's test framework. Tests cover:

- Creating a basic EPUB
- Adding chapters, images, and covers
- Validating the generated EPUB with epubcheck

### `test-tk-tag.ts`

Additional test file, likely for testing specific components or edge cases.

## Architecture

The library uses a class-based approach with the `Epub` class as the main interface. It leverages:

- `jszip` for creating the ZIP-based EPUB file
- `cheerio` and `xmldom` for HTML/XML parsing and manipulation
- TypeScript for type safety

The EPUB generation process involves:

1. Collecting metadata, chapters, images, and styles
2. Processing HTML content to ensure XHTML compliance
3. Generating the required EPUB structure files (OPF, NCX, NAV)
4. Packaging everything into a ZIP file with the `.epub` extension

## Dependencies

- `cheerio`: For HTML parsing and DOM-style manipulation
- `xmldom`: For XML parsing and serialization
- `jszip`: For creating ZIP files
- `@types/xmldom`: Type definitions for xmldom

## Building

The library is built using Bun and TypeScript. The build process compiles the TypeScript source to JavaScript in the `dist` directory.

## How to Use

To use the Epubifyer library, import the `Epub` class from the built distribution or directly from source in development.

### Basic Usage

```typescript
import Epub from "./epub"; // or from "epubifyer" if installed

// Create a new EPUB instance with metadata
const epub = new Epub({
  title: "My E-Book",
  creator: "Author Name",
  language: "en",
  description: "A sample e-book created with Epubifyer",
});

// Add a cover image
await epub.addCover("path/to/cover.jpg");

// Add CSS styles
epub.addCSS("styles", "body { font-family: Arial, sans-serif; }");

// Add chapters
await epub.addChapter("Chapter 1", "<h1>Introduction</h1><p>Welcome to my book.</p>");

// Save the EPUB file
await epub.save("my-book.epub");
```

### Advanced Usage

For more advanced features like adding multiple parts to a chapter or custom metadata, refer to the main README.md in the project root.

To run tests, use `bun test` in the project directory.
