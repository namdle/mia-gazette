import styles from './Masthead.module.css';
import PageWrapper from './PageWrapper';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface MastheadProps {
  buildDate?: string;
}

export default function Masthead({ buildDate }: MastheadProps) {
  const dateStr = buildDate ?? formatDate(new Date());
  return (
    <header className={styles.header}>
      <PageWrapper>
        <div className={styles.topBar}>
          <span className={styles.tagline}>Independent Student Journalism</span>
          <span className={styles.date}>{dateStr}</span>
        </div>
        <div className={styles.nameplate}>
          <h1 className={styles.title}>The Mia Gazette</h1>
        </div>
        <div className={styles.editionBar}>
          <span>Est. 2024</span>
          <span className={styles.divider}>·</span>
          <span>All the news fit to read</span>
        </div>
      </PageWrapper>
    </header>
  );
}
