import Head from 'next/head';
import type { GetStaticProps, NextPage } from 'next';
import { getAllArticles, getFeaturedArticle } from '@/lib/articles';
import type { ArticleWithSlug } from '@/lib/types';
import Masthead from '@/components/layout/Masthead';
import Footer from '@/components/layout/Footer';
import PageWrapper from '@/components/layout/PageWrapper';
import FrontPageGrid from '@/components/front-page/FrontPageGrid';

interface HomeProps {
  featured: ArticleWithSlug;
  rest: ArticleWithSlug[];
  buildDate: string;
}

const Home: NextPage<HomeProps> = ({ featured, rest, buildDate }) => {
  return (
    <>
      <Head>
        <title>The Mia Gazette</title>
        <meta
          name="description"
          content="Independent student journalism — The Mia Gazette"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Masthead buildDate={buildDate} />

      <main>
        <PageWrapper>
          <FrontPageGrid featured={featured} rest={rest} />
        </PageWrapper>
      </main>

      <Footer />
    </>
  );
};

export const getStaticProps: GetStaticProps<HomeProps> = () => {
  const all = getAllArticles();
  const featured = getFeaturedArticle(all);
  const rest = all.filter((a) => a.slug !== featured.slug);

  return {
    props: {
      featured,
      rest,
      buildDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
  };
};

export default Home;
