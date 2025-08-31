/* This is a script to create a new page with a markdown file */

import fs from "node:fs";
import path from "node:path";

function toSlug(fileName) {
	return fileName
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fa5\s-_]/gi, "")
		.replace(/\s+/g, "-");
}

const args = process.argv.slice(2);

if (args.length < 1) {
	console.error(`Error: No filename argument provided
Usage: npm run new-page -- <pagename> [--only-page]`);
	process.exit(1); // Terminate the script and return error code 1
}

let pageName = args[0];
const onlyPage = args[1] === "--only-page";

pageName = toSlug(pageName);
if (!pageName) {
	console.error("Error: Title produced an empty slug");
	process.exit(1);
}

const pageFileName = `${pageName}.astro`;

const pagesDir = "./src/pages/";
const contentDir = "./src/content/spec/";
const pageFullPath = path.join(pagesDir, pageFileName);
const contentFullPath = path.join(contentDir, `${pageName}.md`);

// check if the page file already exists
if (fs.existsSync(pageFullPath)) {
	console.error(`Error: Page file ${pageFullPath} already exists `);
	process.exit(1);
}

// only check content file if not using --only-page
if (!onlyPage && fs.existsSync(contentFullPath)) {
	console.error(`Error: Content file ${contentFullPath} already exists `);
	process.exit(1);
}

// create directories if they don't exist
if (!fs.existsSync(pagesDir)) {
	console.log(`Error: Directory ${pagesDir} does not exist `);
	process.exit(1); // Terminate the script and return error code 1
}

// only check content directory if not using --only-page
if (!onlyPage && !fs.existsSync(contentDir)) {
	console.log(`Error: Directory ${contentDir} does not exist `);
	process.exit(1); // Terminate the script and return error code 1
}

// write markdown content file only if not using --only-page
if (!onlyPage) {
	const md = `# ${pageName}\n`;
	fs.writeFileSync(contentFullPath, md);
}

// write astro page content
const pageContent = onlyPage
	? `---
import MainGridLayout from "../layouts/MainGridLayout.astro";
---
<MainGridLayout title={${JSON.stringify(pageName)}} description={${JSON.stringify(pageName)}}>
  <div class="flex w-full rounded-[var(--radius-large)] overflow-hidden relative min-h-32">
    <div class="card-base z-10 px-9 py-6 relative w-full ">
    </div>
  </div>
</MainGridLayout>
`
	: `---
import { getEntry, render } from "astro:content";
import Markdown from "@components/misc/Markdown.astro";
import MainGridLayout from "../layouts/MainGridLayout.astro";

const pagePost = await getEntry("spec", ${JSON.stringify(pageName)});

if (!pagePost) {
    throw new Error("Page content not found");
}

const { Content } = await render(pagePost);
---
<MainGridLayout title={${JSON.stringify(pageName)}} description={${JSON.stringify(pageName)}}>
    <div class="flex w-full rounded-[var(--radius-large)] overflow-hidden relative min-h-32">
        <div class="card-base z-10 px-9 py-6 relative w-full ">
            <Markdown class="mt-2">
                <Content />
            </Markdown>
        </div>
    </div>
</MainGridLayout>
`;
fs.writeFileSync(pageFullPath, pageContent);

if (onlyPage) {
	const relativePagePath = path.relative(process.cwd(), pageFullPath);
	console.log(`Page ${relativePagePath} created`);
} else {
	const relativeContentPath = path.relative(process.cwd(), contentFullPath);
	const relativePagePath = path.relative(process.cwd(), pageFullPath);
	console.log(
		`Page ${relativePagePath} and content ${relativeContentPath} created`,
	);
}
