import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {useLocation} from '@docusaurus/router';

// The Doxygen output is generated into static/api-html by `npm run generate-api` and is
// shown here so that the site navbar stays visible. The page shown in the iframe is
// mirrored into `?page=`, so that it survives a reload and can be linked to, for example
// `/api?page=classsgct_1_1_engine.html`

// A file name in the Doxygen output, optionally followed by an anchor within it. Anything
// else, such as an absolute URL, is ignored so that `?page=` cannot point the iframe at
// another site
const PageRegex = /^[\w.-]+\.html(#[\w.-]*)?$/;

export default () => {
  const apiBase = useBaseUrl('/api-html/');
  const location = useLocation();
  // `?page=` is not part of the statically rendered HTML, and React does not update
  // attributes that differ during hydration, so the iframe is only created afterwards
  const isBrowser = useIsBrowser();

  const requested = new URLSearchParams(location.search).get('page');
  const page = requested && PageRegex.test(requested) ? requested : 'index.html';

  function onLoad(iframe: HTMLIFrameElement) {
    const frameWindow = iframe.contentWindow;
    // `contentDocument` is null if the iframe has navigated to a different origin
    const frameDocument = iframe.contentDocument;
    if (!frameWindow || !frameDocument) {
      return;
    }
    const basePath = new URL(apiBase, window.location.href).pathname;

    const sync = () => {
      const {pathname, hash} = frameWindow.location;
      if (!pathname.startsWith(basePath)) {
        return;
      }
      const current = pathname.slice(basePath.length) + hash;
      const url = new URL(window.location.href);
      if (current === '' || current === 'index.html') {
        url.searchParams.delete('page');
      }
      else {
        url.searchParams.set('page', current);
      }
      // Bypass the router so that the iframe is not reloaded. Navigating inside the
      // iframe already creates its own history entries, so the URL is replaced, not pushed
      window.history.replaceState(window.history.state, '', url);
      document.title = frameDocument.title;
    };
    sync();
    frameWindow.addEventListener('hashchange', sync);

    // Links that leave the API reference, such as to GitHub, open in the whole window
    // rather than inside the iframe
    frameDocument.addEventListener('click', (event) => {
      const link = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement;
      if (!link || !link.protocol.startsWith('http')) {
        return;
      }
      const target = new URL(link.href);
      if (target.origin !== window.location.origin || !target.pathname.startsWith(basePath)) {
        link.target = '_top';
      }
    });
  }

  return (
    <Layout title="API" description="SGCT C++ API reference" noFooter>
      {isBrowser && (
        <iframe
          // Recreate the iframe on navigation so that following a link to `/api` from
          // within the site shows the requested page even if this page was already open
          key={location.key}
          src={apiBase + page}
          title="SGCT C++ API reference"
          onLoad={(event) => onLoad(event.currentTarget)}
          style={{
            display: 'block',
            width: '100%',
            // Fill the viewport below the navbar
            height: 'calc(100vh - var(--ifm-navbar-height))',
            border: 'none'
          }}
        />
      )}
    </Layout>
  );
}
