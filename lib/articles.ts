import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { ArticleFrontmatter, ArticleWithSlug } from './types';

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

export function getAllArticles(): ArticleWithSlug[] {
  const files = fs.readdirSync(ARTICLES_DIR);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, filename), 'utf8');
      const { data } = matter(raw);
      return { slug, ...(data as ArticleFrontmatter) };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getArticleBySlug(slug: string): {
  frontmatter: ArticleFrontmatter;
  content: string;
} {
  const filepath = path.join(ARTICLES_DIR, `${slug}.md`);
  const raw = fs.readFileSync(filepath, 'utf8');
  const { data, content } = matter(raw);
  return { frontmatter: data as ArticleFrontmatter, content };
}

export function getFeaturedArticle(articles: ArticleWithSlug[]): ArticleWithSlug {
  return articles.find((a) => a.featured) ?? articles[0];
}
