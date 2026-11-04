import Link from '@docusaurus/Link';
import styles from './gallery.module.css';

interface Item {
  name: string;
  to: string;
  image?: string;
}

interface Props {
  items: Item[];
}

export default ({items}: Props) => {
  return (
    <div className={styles.gallery}>
      {items.map(({name, to, image}) => (
        <Link key={to} to={to} className={styles.item}>
          <div className={styles.thumbnail}>
            {/* The name below is the link text, so the image is decorative */}
            {image && <img src={image} alt="" loading="lazy" decoding="async" />}
          </div>
          <span className={styles.name}>{name}</span>
        </Link>
      ))}
    </div>
  );
}
