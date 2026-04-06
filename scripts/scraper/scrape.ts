#!/usr/bin/env node
/**
 * Scraper for chargeraccount.org
 * Usage: npx tsx scrape.ts [staff-page-url]
 *
 * Outputs:
 *   ../../content/articles/<slug>.md
 *   ../../public/images/<slug>-cover.<ext>
 */

import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { extractArticleUrls, scrapeArticle } from './extract';
import { writeArticle } from './write-article';

const STAFF_PAGE =
  process.argv[2] ?? 'https://chargeraccount.org/staff_name/nam-anh-le/';

const OUTPUT_DIR = path.resolve(__dirname, '../../content/articles');
const IMAGES_DIR = path.resolve(__dirname, '../../public/images');

async function main() {
  // Ensure output directories exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  console.log(`Launching browser...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  console.log(`Navigating to staff page: ${STAFF_PAGE}`);
  const listPage = await context.newPage();
  await listPage.goto(STAFF_PAGE, { waitUntil: 'networkidle', timeout: 30_000 });

  const articleUrls = await extractArticleUrls(listPage);
  await listPage.close();

  if (articleUrls.length === 0) {
    console.log('No article URLs found. The page structure may need selector updates.');
    console.log('Try running with DEBUG=1 to dump the page HTML for inspection:');
    console.log('  DEBUG=1 npx tsx scrape.ts');
    await browser.close();
    return;
  }

  console.log(`Found ${articleUrls.length} article(s). Scraping...`);

  for (let i = 0; i < articleUrls.length; i++) {
    const url = articleUrls[i];
    console.log(`\n[${i + 1}/${articleUrls.length}] ${url}`);
    try {
      const articlePage = await context.newPage();
      await articlePage.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      if (process.env.DEBUG) {
        const html = await articlePage.content();
        const debugPath = path.join(OUTPUT_DIR, `debug-article-${i}.html`);
        fs.writeFileSync(debugPath, html);
        console.log(`  Debug HTML saved to: ${debugPath}`);
      }

      const data = await scrapeArticle(articlePage, url);
      await articlePage.close();

      console.log(`  Title: ${data.title}`);
      console.log(`  Date:  ${data.date}`);
      await writeArticle(data, OUTPUT_DIR, IMAGES_DIR);
    } catch (err) {
      console.error(`  Error scraping ${url}:`, err);
    }

    // Polite delay between requests
    if (i < articleUrls.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
