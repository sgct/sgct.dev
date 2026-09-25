import {useId, useMemo, useState} from 'react';
import type {KeyboardEvent, ReactNode} from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';
import styles from './example.module.css';

const tabs = ['image', 'json'] as const;
type Tab = (typeof tabs)[number];

const label: Record<Tab, string> = {image: 'Image', json: 'Configuration'};

interface Props {
  json: string;
  file: string;
  image: string;
  alt?: string;
  caption?: ReactNode;
  defaultTab?: Tab;
  children?: ReactNode;
}

export default ({
  json,
  file,
  image,
  alt,
  caption,
  defaultTab = 'image',
  children
}: Props) => {
  const [tab, setTab] = useState<Tab>(defaultTab);
  // React puts punctuation in generated ids; strip it so the ids stay usable in
  // selectors as well as in the aria-controls / aria-labelledby wiring below.
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '');

  // The configuration is downloaded straight from the text we already hold, which
  // keeps the bytes identical to the file on disk without emitting a second asset.
  const href = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    [json]
  );

  // A tablist is expected to move between its tabs with the arrow keys.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) {
      return;
    }
    event.preventDefault();
    const next = tabs[(tabs.indexOf(tab) + offset + tabs.length) % tabs.length];
    setTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  return (
    <div className={styles.example}>
      {children && <div className={styles.description}>{children}</div>}
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label={`${file} example`}>
          {tabs.map((name) => (
            <button
              key={name}
              id={`${id}-tab-${name}`}
              type="button"
              role="tab"
              aria-selected={tab === name}
              aria-controls={`${id}-panel-${name}`}
              tabIndex={tab === name ? 0 : -1}
              className={clsx(styles.tab, tab === name && styles.active)}
              onClick={() => setTab(name)}
              onKeyDown={onKeyDown}>
              {label[name]}
            </button>
          ))}
        </div>
        {/* The download belongs to the configuration, so it shows with it. Keeping the
            link in the layout while hidden stops the toolbar jumping between tabs. */}
        <a
          className={clsx(styles.download, tab !== 'json' && styles.concealed)}
          href={href}
          download={file}
          tabIndex={tab === 'json' ? 0 : -1}
          aria-hidden={tab !== 'json'}>
          <span className={styles.arrow} aria-hidden="true">↓</span>
          {file}
        </a>
      </div>
      <div
        id={`${id}-panel-image`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-image`}
        hidden={tab !== 'image'}
        className={styles.panel}>
        {/* These renderings run to several megabytes, so the page gets a scaled copy
            and a click opens the original. */}
        <a href={image} target="_blank" rel="noreferrer" className={styles.imageLink}>
          <img
            src={image}
            alt={alt ?? `Rendering produced by ${file}`}
            loading="lazy"
            decoding="async"
          />
        </a>
        {caption && <div className={styles.caption}>{caption}</div>}
      </div>
      <div
        id={`${id}-panel-json`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-json`}
        hidden={tab !== 'json'}
        className={clsx(styles.panel, styles.code)}>
        <CodeBlock language="json">{json}</CodeBlock>
      </div>
    </div>
  );
}
