import type { Page } from 'playwright';

export interface ScrapedArticle {
  title: string;
  date: string;
  author: string;
  bodyHtml: string;
  imageUrls: string[];
  coverImageUrl: string;
  sourceUrl: string;
}

/**
 * Extract all article URLs from the staff listing page.
 * Tries several common selector patterns used by WordPress-based newspaper sites.
 */
export async function extractArticleUrls(page: Page): Promise<string[]> {
  const urls = await page.evaluate(() => {
    const selectors = [
      'article a[href]',
      '.post-title a',
      '.entry-title a',
      'h2 a[href]',
      'h3 a[href]',
      '.story-title a',
      '.article-title a',
    ];

    const seen = new Set<string>();
    const results: string[] = [];

    for (const sel of selectors) {
      document.querySelectorAll<HTMLAnchorElement>(sel).forEach((el) => {
        const href = el.href;
        if (href && !seen.has(href) && !href.includes('#') && !href.endsWith('/')) {
          seen.add(href);
          results.push(href);
        }
      });
      if (results.length > 0) break;
    }
    return results;
  });

  // Filter to only article URLs on the same domain
  const base = new URL(page.url()).origin;
  return urls.filter((u) => u.startsWith(base));
}

/**
 * Scrape a single article page.
 */
export async function scrapeArticle(page: Page, url: string): Promise<ScrapedArticle> {
  // --- Title ---
  const title = await page
    .locator('h1.entry-title, h1.post-title, h1.article-title, h1')
    .first()
    .textContent()
    .then((t) => t?.trim() ?? 'Untitled');

  // --- Date ---
  let date = '';
  try {
    date = await page
      .locator('time[datetime], .entry-date, .post-date, .published, time')
      .first()
      .getAttribute('datetime')
      .then((d) => d ?? '');
    if (!date) {
      date = await page
        .locator('time[datetime], .entry-date, .post-date, .published, time')
        .first()
        .textContent()
        .then((t) => t?.trim() ?? '');
    }
  } catch {
    date = new Date().toISOString().slice(0, 10);
  }

  // --- Author ---
  let author = 'Nam Anh Le';
  try {
    const bylineText = await page
      .locator('.author, .byline, .post-author, [rel="author"]')
      .first()
      .textContent()
      .then((t) => t?.trim() ?? '');
    if (bylineText) author = bylineText.replace(/^by\s+/i, '').trim();
  } catch {
    /* keep default */
  }

  // --- Body HTML ---
  let bodyHtml = '';
  const bodySelectors = [
    '.entry-content',
    '.post-content',
    '.article-content',
    '.article-body',
    'article .content',
    'main article',
  ];
  for (const sel of bodySelectors) {
    try {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        bodyHtml = await el.innerHTML();
        if (bodyHtml.trim().length > 100) break;
      }
    } catch {
      continue;
    }
  }

  // --- Images ---
  const imageUrls: string[] = await page.evaluate((bodySelector) => {
    const selectors = [
      bodySelector,
      'article',
      'main',
    ];
    for (const sel of selectors) {
      const container = document.querySelector(sel);
      if (container) {
        const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
        const urls = imgs
          .map((img) => img.src)
          .filter((src) => src && !src.includes('data:') && !src.includes('gravatar'));
        if (urls.length > 0) return urls;
      }
    }
    return [];
  }, bodySelectors[0]);

  const coverImageUrl = imageUrls[0] ?? '';

  return { title, date, author, bodyHtml, imageUrls, coverImageUrl, sourceUrl: url };
}
