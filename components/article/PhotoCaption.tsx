import styles from './PhotoCaption.module.css';

interface PhotoCaptionProps {
  src: string;
  alt?: string;
  title?: string;
}

export default function PhotoCaption({ src, alt = '', title }: PhotoCaptionProps) {
  return (
    <figure className={styles.figure}>
      <img src={src} alt={alt} className={styles.image} />
      {(title || alt) && (
        <figcaption className={styles.caption}>{title || alt}</figcaption>
      )}
    </figure>
  );
}
