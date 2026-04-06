#!/usr/bin/env node
/**
 * Convert locally-saved HTML files into CMS-ready Markdown articles.
 *
 * Usage:
 *   1. In your browser: File > Save As > "Webpage, HTML Only" for each article.
 *   2. Put all .html files into a folder (default: ./html-input/).
 *   3. Run: npx tsx convert-html.ts [input-folder]
 *
 * Outputs:
 *   ../../content/articles/<slug>.md
 *   ../../public/images/<slug>-<n>.<ext>
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { parse } from 'node-html-parser';
import matter from 'gray-matter';
import slugify from 'slugify';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TurndownService = require('turndown');

const INPUT_DIR = path.resolve(process.argv[2] ?? 'html-input');
const OUTPUT_DIR = path.resolve(__dirname, '../../content/articles');
const IMAGES_DIR = path.resolve(__dirname, '../../public/images');

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSlug(title: string): string {
  return slugify(title, { lower: true, strict: true }).slice(0, 80);
}

function parseIsoDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch { /* fall through */ }
  return new Date().toISOString().slice(0, 10);
}

function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (res) => {
      // Follow redirects once
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode >= 400) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function htmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  // Don't strip images — keep them as markdown ![alt](src)
  td.keep([]);
  return td.turndown(html);
}

// ── Extract metadata from parsed HTML ───────────────────────────────────────
// Selectors ordered: SNO (School Newspaper Online) platform first, then
// common WordPress classes as fallback.

function extractTitle(root: ReturnType<typeof parse>): string {
  // SNO platform uses h1.sno-story-headline; generic h1 matches the site logo
  const candidates = [
    root.querySelector('h1.sno-story-headline'),
    root.querySelector('h1.entry-title'),
    root.querySelector('h1.post-title'),
    root.querySelector('h1.article-title'),
    root.querySelector('article h1'),
  ];
  for (const el of candidates) {
    const text = el?.text?.trim();
    if (text) return text;
  }
  // Fall back to <title> tag, stripping the " – Site Name" suffix
  const pageTitle = root.querySelector('title')?.text?.trim() ?? '';
  return pageTitle.replace(/\s*[–—-]\s*[^–—-]+$/, '').trim() || 'Untitled';
}

function extractDate(root: ReturnType<typeof parse>): string {
  const candidates = [
    // SNO uses a plain <span class="time-wrapper"> with human-readable date
    root.querySelector('.time-wrapper')?.text,
    root.querySelector('time[datetime]')?.getAttribute('datetime'),
    root.querySelector('.entry-date')?.text,
    root.querySelector('.post-date')?.text,
    root.querySelector('.published')?.text,
    root.querySelector('time')?.text,
  ];
  for (const raw of candidates) {
    if (raw?.trim()) return parseIsoDate(raw.trim());
  }
  return new Date().toISOString().slice(0, 10);
}

function extractAuthor(root: ReturnType<typeof parse>): string {
  const candidates = [
    // SNO: .byline-name contains the author link
    root.querySelector('.byline-name'),
    root.querySelector('[rel="author"]'),
    root.querySelector('.author'),
    root.querySelector('.byline'),
    root.querySelector('.post-author'),
  ];
  for (const el of candidates) {
    const text = el?.text?.trim();
    if (text) return text.replace(/^by\s+/i, '').trim();
  }
  return 'Nam Anh Le';
}

function extractBodyHtml(root: ReturnType<typeof parse>): string {
  const selectors = [
    // SNO: body lives in a div with id="sno-story-body-content"
    '#sno-story-body-content',
    '.sno-story-body-content',
    '.entry-content',
    '.post-content',
    '.article-content',
    '.article-body',
    'article',
  ];
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const html = el?.innerHTML?.trim();
    if (html && html.length > 200) return html;
  }
  return root.querySelector('main')?.innerHTML
    ?? root.querySelector('body')?.innerHTML
    ?? '';
}

function extractCoverImageUrl(root: ReturnType<typeof parse>): string {
  // SNO: feature image is .catboxphoto.feature-image inside .sno-story-photo-area
  const featureImg = root.querySelector('.sno-story-photo-area img');
  if (featureImg) {
    const src = featureImg.getAttribute('src') ?? '';
    if (src && !src.startsWith('data:')) return src;
  }
  // Fallback: og:image meta tag
  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '';
  if (ogImage) return ogImage;
  return '';
}

function extractImageUrls(root: ReturnType<typeof parse>, bodyHtml: string): string[] {
  const bodyRoot = parse(bodyHtml);
  const seen = new Set<string>();
  const urls: string[] = [];
  bodyRoot.querySelectorAll('img').forEach((img) => {
    // Prefer largest srcset image, fall back to src
    const srcset = img.getAttribute('srcset') ?? '';
    let src = img.getAttribute('src') ?? '';
    if (srcset) {
      // Pick the largest width from srcset
      const largest = srcset
        .split(',')
        .map((s) => {
          const [url, w] = s.trim().split(/\s+/);
          return { url, w: parseInt(w) || 0 };
        })
        .sort((a, b) => b.w - a.w)[0];
      if (largest?.url) src = largest.url;
    }
    if (src && !src.startsWith('data:') && !src.includes('gravatar') && !seen.has(src)) {
      seen.add(src);
      urls.push(src);
    }
  });
  return urls;
}

function extractSourceUrl(root: ReturnType<typeof parse>): string {
  // Look for canonical link tag
  return root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
}

// ── Process one HTML file ────────────────────────────────────────────────────

async function processFile(htmlPath: string): Promise<void> {
  const filename = path.basename(htmlPath, '.html');
  console.log(`\nProcessing: ${path.basename(htmlPath)}`);

  const html = fs.readFileSync(htmlPath, 'utf8');
  const root = parse(html);

  const title = extractTitle(root);
  const date = extractDate(root);
  const author = extractAuthor(root);
  const sourceUrl = extractSourceUrl(root);
  const coverImageUrl = extractCoverImageUrl(root);
  const bodyHtml = extractBodyHtml(root);
  const imageUrls = extractImageUrls(root, bodyHtml);

  const slug = makeSlug(title) || makeSlug(filename);
  const outPath = path.join(OUTPUT_DIR, `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.log(`  Skipping — already exists: ${slug}.md`);
    return;
  }

  console.log(`  Title:  ${title}`);
  console.log(`  Date:   ${date}`);
  console.log(`  Author: ${author}`);
  console.log(`  Images: ${imageUrls.length} found in body`);

  // Download cover image (dedicated feature image, or fall back to first body image)
  let coverImage = '';
  const firstImageUrl = coverImageUrl || imageUrls[0];
  if (firstImageUrl) {
    const coverUrl = firstImageUrl;
    try {
      let ext = path.extname(new URL(coverUrl).pathname).split('?')[0] || '.jpg';
      // Sanitize extension
      if (!/^\.[a-z0-9]+$/i.test(ext)) ext = '.jpg';
      const imgFile = `${slug}-cover${ext}`;
      const imgPath = path.join(IMAGES_DIR, imgFile);
      if (!fs.existsSync(imgPath)) {
        process.stdout.write(`  Downloading cover image...`);
        await downloadImage(coverUrl, imgPath);
        process.stdout.write(` done\n`);
      }
      coverImage = `/images/${imgFile}`;
    } catch (e) {
      console.warn(`\n  Warning: could not download cover image: ${e}`);
    }
  }

  // Convert body HTML → Markdown
  const bodyMarkdown = htmlToMarkdown(bodyHtml);

  // Build excerpt from first substantial paragraph
  const excerpt = bodyMarkdown
    .split('\n')
    .find((l) => l.trim().length > 60 && !l.startsWith('#') && !l.startsWith('!'))
    ?.replace(/[*_`[\]]/g, '')
    .slice(0, 200) ?? '';

  const frontmatter = {
    title,
    date,
    author,
    coverImage,
    excerpt: excerpt.length > 160 ? excerpt.slice(0, 160) + '...' : excerpt,
    tags: [] as string[],
    featured: false,
    sourceUrl,
  };

  const fileContent = matter.stringify('\n' + bodyMarkdown, frontmatter);
  fs.writeFileSync(outPath, fileContent, 'utf8');
  console.log(`  Written: content/articles/${slug}.md`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
    console.log(`Created input folder: ${INPUT_DIR}`);
    console.log(`\nHow to use:`);
    console.log(`  1. In Chrome/Firefox: File > Save As > "Webpage, HTML Only"`);
    console.log(`  2. Save each article's .html file into: ${INPUT_DIR}`);
    console.log(`  3. Run this script again: npx tsx convert-html.ts`);
    return;
  }

  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.html'));

  if (files.length === 0) {
    console.log(`No .html files found in: ${INPUT_DIR}`);
    console.log(`Save article pages as "Webpage, HTML Only" into that folder and re-run.`);
    return;
  }

  console.log(`Found ${files.length} HTML file(s) in ${INPUT_DIR}`);

  for (const file of files) {
    try {
      await processFile(path.join(INPUT_DIR, file));
    } catch (err) {
      console.error(`  Error processing ${file}:`, err);
    }
  }

  console.log('\nDone! Next steps:');
  console.log('  • Review the generated .md files in content/articles/');
  console.log('  • Set featured: true on one article to make it the hero story');
  console.log('  • Run: npm run build (from project root) to rebuild the site');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
