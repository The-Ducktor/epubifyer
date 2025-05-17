import { convertHtmlToXhtml } from "./htmltoxhtml";

// Test with a problematic <tk> tag
const htmlWithInvalidTag = `
<h1>Test Content</h1>
<p>This is a paragraph with <tk>invalid tag</tk> inside.</p>
<tk>This is a standalone invalid tag</tk>
<div>
  <tk>This is a nested invalid tag</tk>
  <p>This is <tk>another</tk> test.</p>
</div>
`;

const result = convertHtmlToXhtml(htmlWithInvalidTag);
console.log("Converted XHTML:");
console.log(result);
