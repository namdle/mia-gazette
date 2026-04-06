import type { ArticleWithSlug } from '@/lib/types';
import FeaturedStory from './FeaturedStory';
import StoryCard from './StoryCard';
import styles from './FrontPageGrid.module.css';

interface FrontPageGridProps {
  featured: ArticleWithSlug;
  rest: ArticleWithSlug[];
}

export default function FrontPageGrid({ featured, rest }: FrontPageGridProps) {
  const [second, third, ...remaining] = rest;
  return (
    <div className={styles.grid}>
      {/* Row 1: Featured (2 cols) + secondary story */}
      <div className={styles.featuredCell}>
        <FeaturedStory article={featured} />
      </div>

      {second && (
        <div className={styles.secondaryCell}>
          <StoryCard article={second} size="secondary" />
          {third && (
            <>
              <div className={styles.horizontalRule} />
              <StoryCard article={third} size="secondary" />
            </>
          )}
        </div>
      )}

      {/* Horizontal rule between rows */}
      {remaining.length > 0 && (
        <div className={styles.rowDivider} />
      )}

      {/* Row 2: up to 3 more stories */}
      {remaining.slice(0, 3).map((article) => (
        <div key={article.slug} className={styles.bottomCell}>
          <StoryCard article={article} size="normal" />
        </div>
      ))}
    </div>
  );
}
