export interface ArticleFrontmatter {
  title: string;
  date: string;
  author: string;
  coverImage: string;
  excerpt: string;
  tags: string[];
  featured: boolean;
  sourceUrl?: string;
}

export interface ArticleWithSlug extends ArticleFrontmatter {
  slug: string;
}
