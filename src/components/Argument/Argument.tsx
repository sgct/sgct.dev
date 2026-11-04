import type {ReactNode} from 'react';
import styles from './argument.module.css';

// `--screenshot-path` becomes the anchor `screenshot-path`.
const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Props {
  name: string;
  alias?: string;
  value?: ReactNode;
  default?: ReactNode;
  documentation?: ReactNode;
  id?: string;
  children?: ReactNode;
}

export default ({
  name,
  alias,
  value,
  default: defaultValue,
  documentation,
  id,
  children
}: Props) => {
  const anchor = id ?? slug(name);
  const content = children ?? documentation;

  return (
    <div id={anchor} className={styles.argument}>
      <div className={styles.header}>
        <a
          href={`#${anchor}`}
          className={styles.nameLink}
          aria-label={`Direct link to ${name}`}>
          <code className={styles.name}>{name}</code>
          <span className={styles.hash} aria-hidden="true">#</span>
        </a>
        {alias && <code className={styles.alias}>{alias}</code>}
        <span className={styles.meta}>
          {value && <span className={styles.value}>{value}</span>}
          {defaultValue != null && (
            <span className={styles.default}>
              default <code>{defaultValue}</code>
            </span>
          )}
        </span>
      </div>
      {content && <div className={styles.body}>{content}</div>}
    </div>
  );
}
