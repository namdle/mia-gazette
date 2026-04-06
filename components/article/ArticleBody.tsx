import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import PhotoCaption from './PhotoCaption';
import styles from './ArticleBody.module.css';

const components = {
  img: PhotoCaption,
};

interface ArticleBodyProps {
  mdxSource: MDXRemoteSerializeResult;
}

export default function ArticleBody({ mdxSource }: ArticleBodyProps) {
  return (
    <div className={styles.body}>
      <MDXRemote {...mdxSource} components={components} />
    </div>
  );
}
