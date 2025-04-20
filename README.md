# Epubifyer

[![npm version](https://img.shields.io/npm/v/epubifyer.svg)](https://www.npmjs.com/package/epubifyer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern JavaScript/TypeScript library for creating EPUB files with a clean,
web-friendly format. Perfect for converting web content, articles, and documents
into EPUB format for e-readers.

## Features

- Create EPUB 3.0 compatible e-books
- Add chapters with HTML content
- Automatic image processing (including remote images)
- Customizable metadata
- CSS styling support
- Table of contents generation
- Cover image support

## Installation

```bash
# Using npm
npm install epubifyer

# Using Yarn
yarn add epubifyer

# Using Bun
bun add epubifyer
```

## Usage

### Basic Example

```typescript
import Epub from "epubifyer";

// Create a new EPUB
const epub = new Epub({
    title: "My First E-Book",
    creator: "Your Name",
    language: "en",
});

// Add a cover image
await epub.addCover("example.com/image.jpg");

// Add CSS styles
epub.addCSS(
    "styles",
    `
  body { 
    font-family: 'Georgia', serif; 
    line-height: 1.5;
    margin: 2em;
  }
  h1 { color: #333; }
`,
);

// Add chapters
await epub.addChapter(
    "Chapter 1",
    `
  <h1>My First Chapter</h1>
  <p>This is the content of my first chapter.</p>
  <img src="https://example.com/image.jpg" alt="Example image" />
`,
);

await epub.addChapter(
    "Chapter 2",
    `
  <h1>My Second Chapter</h1>
  <p>This chapter has multiple sections.</p>
`,
);

// Save the EPUB file
await epub.save("my-ebook.epub");
```

### Advanced Features

#### Adding Multiple HTML Parts as One Chapter

```typescript
// Add a chapter with multiple parts (for large chapters)
await epub.addChapter("Long Chapter", [
    "<h1>Part 1</h1><p>Beginning of the chapter</p>",
    "<h2>Part 2</h2><p>Continuation of the chapter</p>",
    "<h2>Part 3</h2><p>End of the chapter</p>",
]);

// Or with specific ordering
await epub.addChapter("Ordered Chapter", [
    [2, "<h2>This appears second</h2>"],
    [1, "<h1>This appears first</h1>"],
    [3, "<p>This appears third</p>"],
]);
```

#### Custom Metadata

```typescript
const epub = new Epub({
    title: "Advanced E-Book",
    creator: "Author Name",
    language: "en",
    publisher: "My Publishing Company",
    description: "A detailed description of this amazing e-book",
    rights: "Copyright © 2023 Author Name",
    identifier: "com.example.my-ebook-id", // Custom identifier
    date: "2023-10-15", // Publication date
});

// Or update metadata later
epub.setMetadata({
    title: "Updated Title",
    description: "New description",
});
```

## API Reference

### Constructor

```typescript
new Epub(metadata: Partial<EpubMetadata>)
```

Create a new EPUB document with optional metadata.

#### Metadata Properties

| Property    | Type   | Description                                        |
| ----------- | ------ | -------------------------------------------------- |
| title       | string | Book title                                         |
| creator     | string | Author name                                        |
| language    | string | Language code (e.g., 'en')                         |
| identifier  | string | Unique identifier (auto-generated if not provided) |
| date        | string | Publication date (YYYY-MM-DD)                      |
| publisher   | string | Publisher name                                     |
| description | string | Book description                                   |
| rights      | string | Copyright information                              |
| cover       | string | Cover image ID                                     |

### Methods

#### `addChapter(title: string, html: string | Array<[number, string]> | Array<string>, id?: string): Promise<string>`

Add a chapter to the EPUB. Returns the ID of the added chapter.

#### `addCover(source: string): Promise<string>`

Add a cover image from a file path, URL, or base64-encoded data. Returns the ID
of the added cover image.

#### `addCSS(id: string, css: string): void`

Add a CSS stylesheet to the EPUB.

#### `addImage(id: string, filename: string, data: Uint8Array, mediaType: string): void`

Add an image to the EPUB.

#### `setMetadata(metadata: Partial<EpubMetadata>): void`

Update the EPUB metadata.

#### `addToTOC(id: string, title: string, parentId?: string): void`

Add an entry to the table of contents.

#### `generate(): Promise<JSZip>`

Generate the EPUB as a JSZip object.

#### `save(filePath?: string): Promise<Uint8Array | undefined>`

Save the EPUB to a file or return its content as a Uint8Array.

## Browser Support

Epubifyer works in both Node.js and browser environments. (maby) In browsers, use the
`save()` method without a filepath to get the EPUB data for download.

```javascript
// Browser example
const epubData = await epub.save();
const blob = new Blob([epubData], { type: "application/epub+zip" });
const url = URL.createObjectURL(blob);

const a = document.createElement("a");
a.href = url;
a.download = "book.epub";
a.click();
```

## License

MIT © The Ducktor
