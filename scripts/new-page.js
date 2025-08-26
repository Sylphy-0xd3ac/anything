/* Create a new Astro page under src/pages and a spec content file using given title and description */

import fs from "fs"
import path from "path"

const args = process.argv.slice(2)

if (args.length < 1) {
  console.error(`Error: Missing required arguments\nUsage: node scripts/new-page.js <title>`)
  process.exit(1)
}

const rawTitle = args[0]

function toSlug(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-_]/gi, "")
    .replace(/\s+/g, "-")
}

const slug = toSlug(rawTitle)
if (!slug) {
  console.error("Error: Title produced an empty slug")
  process.exit(1)
}

// Ensure .astro extension for page
const pageFileName = slug.endsWith(".astro") ? slug : `${slug}.astro`

const pagesDir = "./src/pages/"
const contentDir = "./src/content/spec/"
const pageFullPath = path.join(pagesDir, pageFileName)
const contentFullPath = path.join(contentDir, `${slug}.md`)

// Guards
if (fs.existsSync(pageFullPath)) {
  console.error(`Error: Page file ${pageFullPath} already exists`)
  process.exit(1)
}
if (fs.existsSync(contentFullPath)) {
  console.error(`Error: Content file ${contentFullPath} already exists`)
  process.exit(1)
}

// Ensure directories
for (const dir of [pagesDir, contentDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Write content file under spec
const md = `# ${rawTitle}\n`
fs.writeFileSync(contentFullPath, md)

// Page content
const pageContent = `---
import { getEntry, render } from "astro:content";
import Markdown from "@components/misc/Markdown.astro";
import MainGridLayout from "../layouts/MainGridLayout.astro";

const pagePost = await getEntry("spec", ${JSON.stringify(slug)});

if (!pagePost) {
    throw new Error("Page content not found");
}

const { Content } = await render(pagePost);
---
<MainGridLayout title={${JSON.stringify(rawTitle)}} description={${JSON.stringify(rawTitle)}}>
    <div class="flex w-full rounded-[var(--radius-large)] overflow-hidden relative min-h-32">
        <div class="card-base z-10 px-9 py-6 relative w-full ">
            <Markdown class="mt-2">
                <Content />
            </Markdown>
        </div>
    </div>
</MainGridLayout>
`

fs.writeFileSync(pageFullPath, pageContent)

const relativePagePath = path.relative(process.cwd(), contentFullPath)
console.log(`Page ${relativePagePath} created`)
