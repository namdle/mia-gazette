import styles from './Footer.module.css';
import PageWrapper from './PageWrapper';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <PageWrapper>
        <div className={styles.inner}>
          <span className={styles.name}>The Mia Gazette</span>
          <span className={styles.copy}>
            © {new Date().getFullYear()} · Nam Anh Le · All rights reserved
          </span>
        </div>
      </PageWrapper>
    </footer>
  );
}
