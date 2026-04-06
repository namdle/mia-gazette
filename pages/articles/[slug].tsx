import Head from 'next/head';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { serialize } from 'next-mdx-remote/serialize';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { getAllArticles, getArticleBySlug } from '@/lib/articles';
import type { ArticleFrontmatter } from '@/lib/types';
import Masthead from '@/components/layout/Masthead';
import Footer from '@/components/layout/Footer';
import PageWrapper from '@/components/layout/PageWrapper';
import ArticleHeader from '@/components/article/ArticleHeader';
import ArticleBody from '@/components/article/ArticleBody';
import styles from '@/components/article/ArticleBody.module.css';

interface ArticlePageProps {
  frontmatter: ArticleFrontmatter;
  mdxSource: MDXRemoteSerializeResult;
}

const ArticlePage: NextPage<ArticlePageProps> = ({ frontmatter, mdxSource }) => {
  return (
    <>
      <Head>
        <title>{frontmatter.title} — The Mia Gazette</title>
        <meta name="description" content={frontmatter.excerpt} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {frontmatter.coverImage && (
          <meta property="og:image" content={frontmatter.coverImage} />
        )}
      </Head>

      <Masthead />

      <main>
        <PageWrapper>
          <Link href="/" className={styles.backLink}>
            ← Back to The Mia Gazette
          </Link>
          <ArticleHeader frontmatter={frontmatter} />
          <ArticleBody mdxSource={mdxSource} />
        </PageWrapper>
      </main>

      <Footer />
    </>
  );
};

export const getStaticPaths: GetStaticPaths = () => {
  const articles = getAllArticles();
  return {
    paths: articles.map((a) => ({ params: { slug: a.slug } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<ArticlePageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const { frontmatter, content } = getArticleBySlug(slug);
  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug],
    },
  });
  return { props: { frontmatter, mdxSource } };
};

export default ArticlePage;
