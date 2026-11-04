import {createContext, useContext} from 'react';
import type {ReactNode} from 'react';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import clsx from 'clsx';
import styles from './parameter.module.css';

// Nested parameters inherit the depth and the anchor prefix of their enclosing
// parameter. The prefix keeps anchors unique on pages where field names repeat,
// so the `x` inside `size` becomes `size-x` rather than a second `x`.
const ParameterContext = createContext({depth: 0, idPrefix: ''});

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Props {
  name: string;
  type?: ReactNode;
  optional?: boolean;
  default?: ReactNode;
  documentation?: ReactNode;
  id?: string;
  children?: ReactNode;
}

export default ({
  name,
  type,
  optional,
  default: defaultValue,
  documentation,
  id,
  children
}: Props) => {
  const {depth, idPrefix} = useContext(ParameterContext);
  const anchor = id ?? (idPrefix ? `${idPrefix}-${slug(name)}` : slug(name));
  const content = children ?? documentation;
  // Registers the anchor so that links to it pass the build's broken anchor check
  useBrokenLinks().collectAnchor(anchor);

  return (
    <div id={anchor} className={clsx(styles.parameter, depth > 0 && styles.nested)}>
      <div className={styles.header}>
        <a
          href={`#${anchor}`}
          className={styles.nameLink}
          aria-label={`Direct link to ${name}`}>
          <code className={styles.name}>{name}</code>
          <span className={styles.hash} aria-hidden="true">#</span>
        </a>
        <span className={styles.meta}>
          {type && <span className={styles.type}>{type}</span>}
          <span className={clsx(styles.badge, optional ? styles.optional : styles.required)}>
            {optional ? 'optional' : 'required'}
          </span>
          {defaultValue != null && (
            <span className={styles.default}>
              default <code>{defaultValue}</code>
            </span>
          )}
        </span>
      </div>
      {content && (
        <div className={styles.body}>
          <ParameterContext.Provider value={{depth: depth + 1, idPrefix: anchor}}>
            {content}
          </ParameterContext.Provider>
        </div>
      )}
    </div>
  );
}
