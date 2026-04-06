import Link from 'next/link';
import type { ArticleWithSlug } from '@/lib/types';
import styles from './StoryCard.module.css';

interface StoryCardProps {
  article: ArticleWithSlug;
  size?: 'normal' | 'compact' | 'secondary';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StoryCard({ article, size = 'normal' }: StoryCardProps) {
  const { slug, title, excerpt, coverImage, date, author, tags } = article;
  return (
    <article className={`${styles.card} ${styles[size]}`}>
      {coverImage && (
        <Link href={`/articles/${slug}`} className={styles.imageLink}>
          <img src={coverImage} alt={title} className={styles.cover} />
        </Link>
      )}
      <div className={styles.body}>
        {tags?.length > 0 && (
          <span className={styles.tag}>{tags[0].toUpperCase()}</span>
        )}
        <h2 className={styles.headline}>
          <Link href={`/articles/${slug}`}>{title}</Link>
        </h2>
        <p className={styles.excerpt}>{excerpt}</p>
        <div className={styles.meta}>
          <span className={styles.author}>{author}</span>
          <span className={styles.metaDot}>·</span>
          <time dateTime={date} className={styles.date}>
            {formatDate(date)}
          </time>
        </div>
      </div>
    </article>
  );
}
