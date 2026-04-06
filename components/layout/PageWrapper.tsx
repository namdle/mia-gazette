import React from 'react';
import styles from './PageWrapper.module.css';

interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return <div className={styles.wrapper}>{children}</div>;
}
