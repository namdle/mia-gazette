import type { ArticleFrontmatter } from '@/lib/types';
import styles from './ArticleHeader.module.css';

interface ArticleHeaderProps {
  frontmatter: ArticleFrontmatter;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ArticleHeader({ frontmatter }: ArticleHeaderProps) {
  const { title, author, date, coverImage, tags, excerpt } = frontmatter;
  return (
    <header className={styles.header}>
      {tags?.length > 0 && (
        <div className={styles.tagRow}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <h1 className={styles.title}>{title}</h1>

      {excerpt && <p className={styles.deck}>{excerpt}</p>}

      <div className={styles.byline}>
        <span className={styles.author}>By {author}</span>
        <span className={styles.bylineDot}>·</span>
        <time dateTime={date}>{formatDate(date)}</time>
      </div>

      <div className={styles.rule} />

      {coverImage && (
        <figure className={styles.coverFigure}>
          <img src={coverImage} alt={title} className={styles.coverImage} />
        </figure>
      )}
    </header>
  );
}
