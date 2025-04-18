import { expect, test } from "bun:test";
import Epub from "./epub";

const outputPath = "./sample-book.epub";

test("Create EPUB book", async () => {
	// Initialize a new EPUB
	const book = new Epub({
		title: "Sample EPUB Book",
		creator: "EPUBifyer",
		language: "en",
		description: "A sample book created with EPUBifyer",
	});

	// Add CSS
	book.addCSS(
		"style",
		`
    body { font-family: Arial, sans-serif; margin: 2em; }
    h1 { color: #2c3e50; }
    p { line-height: 1.5; }
  `,
	);

	// Add chapters
	book.addChapter(
		"Introduction",
		`
    <h1>Introduction</h1>
    <p>This is a sample EPUB book created with the EPUBifyer library.</p>
    <p>It demonstrates how to create a basic EPUB3 file with multiple chapters and styling.</p>
  `,
	);

	book.addChapter(
		"Chapter 1",
		`
    <h1>Getting Started with EPUB</h1>
    <p>EPUB is an e-book file format that uses the .epub file extension.</p>
    <p>EPUB is supported by many e-readers, and compatible software is available for most smartphones, tablets, and computers.</p>
  `,
	);

	book.addChapter(
		"Chapter 2",
		`
    <h1>Creating EPUB Files</h1>
    <p>EPUB files are essentially ZIP files that contain HTML, CSS, and image files, along with metadata.</p>
    <p>The EPUBifyer library makes it easy to create these files without worrying about the underlying structure.</p>
  `,
	);

	// Add an image (you would normally read this from a file)
	// For demo purposes, we're using a small Base64 encoded transparent PNG
	const sampleImageData = Uint8Array.from(
		atob(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
		),
		(c) => c.charCodeAt(0),
	);
	book.addImage("img1", "sample.png", sampleImageData, "image/png");

	try {
		// Save the EPUB file
		await book.save(outputPath);
		console.log(`EPUB created successfully at ${outputPath}`);

		// Verify file exists - using size instead of trying to parse as JSON
		const file = Bun.file(outputPath);
		const size = file.size;
		expect(size).toBeGreaterThan(0);

		// Additional verification could include checking file content
		const exists = await file.exists();
		expect(exists).toBe(true);
	} catch (error) {
		console.error("Error creating EPUB:", error);
		throw error;
	}
});

test("Validate EPUB with epubcheck", async () => {
	try {
		// Check if file exists first
		const exists = await Bun.file(outputPath).exists();
		expect(exists).toBe(true);

		// Run epubcheck command on the previously created file
		const proc = Bun.spawn(["epubcheck", outputPath]);

		// Wait for process to complete
		await proc.exited;
		const stdout = await new Response(proc.stdout).arrayBuffer();
		const stderr = await new Response(proc.stderr).arrayBuffer();
		const output = new TextDecoder().decode(new Uint8Array(stdout));
		const error = new TextDecoder().decode(new Uint8Array(stderr));

		console.log("EPUBCheck Output:", output);
		if (error.length > 0) console.error("EPUBCheck Errors:", error);

		const exitCode = await proc.exitCode;
		// If exitCode is null, epubcheck might not be installed
		if (exitCode === null) {
			console.warn(
				"Warning: epubcheck may not be installed or accessible in PATH",
			);
			// Skip this test with a pending message
			expect.skip("Skipping due to epubcheck not being available");
		} else {
			expect(exitCode).toBe(0);
		}
	} catch (error) {
		console.error("Error validating EPUB:", error);
		throw error;
	}
});
