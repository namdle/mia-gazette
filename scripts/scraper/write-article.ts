import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import matter from 'gray-matter';
import slugify from 'slugify';
import type { ScrapedArticle } from './extract';

function parseIsoDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {
    /* fall through */
  }
  return new Date().toISOString().slice(0, 10);
}

function makeSlug(title: string): string {
  return slugify(title, { lower: true, strict: true }).slice(0, 80);
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

function htmlToMarkdown(html: string): string {
  // Use turndown for HTML→Markdown conversion
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TurndownService = require('turndown');
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  // Preserve images as markdown
  td.keep(['figure', 'figcaption']);
  return td.turndown(html);
}

export async function writeArticle(
  data: ScrapedArticle,
  outputDir: string,
  imagesDir: string
): Promise<void> {
  const slug = makeSlug(data.title);
  const filename = `${slug}.md`;
  const outputPath = path.join(outputDir, filename);

  // Skip if already scraped
  if (fs.existsSync(outputPath)) {
    console.log(`  Skipping (already exists): ${filename}`);
    return;
  }

  // Download cover image
  let coverImage = '';
  if (data.coverImageUrl) {
    try {
      const ext = path.extname(new URL(data.coverImageUrl).pathname).split('?')[0] || '.jpg';
      const imgFilename = `${slug}-cover${ext}`;
      const imgPath = path.join(imagesDir, imgFilename);
      if (!fs.existsSync(imgPath)) {
        await downloadFile(data.coverImageUrl, imgPath);
      }
      coverImage = `/images/${imgFilename}`;
    } catch (e) {
      console.warn(`  Warning: could not download cover image for "${data.title}": ${e}`);
    }
  }

  // Convert body to markdown
  const bodyMarkdown = htmlToMarkdown(data.bodyHtml);

  // Build excerpt from first non-empty line
  const firstParagraph = bodyMarkdown
    .split('\n')
    .find((line) => line.trim().length > 40 && !line.startsWith('#'))
    ?.replace(/[*_`[\]]/g, '')
    .slice(0, 200) ?? '';
  const excerpt = firstParagraph.endsWith('...')
    ? firstParagraph
    : firstParagraph.slice(0, 160) + (firstParagraph.length > 160 ? '...' : '');

  const frontmatter = {
    title: data.title,
    date: parseIsoDate(data.date),
    author: data.author,
    coverImage,
    excerpt,
    tags: [],
    featured: false,
    sourceUrl: data.sourceUrl,
  };

  const fileContent = matter.stringify('\n' + bodyMarkdown, frontmatter);
  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`  Written: ${filename}`);
}
