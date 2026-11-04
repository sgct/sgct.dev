import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

// The Doxygen output is generated into static/api-html by `npm run generate-api` and is
// shown here so that the site navbar stays visible
export default () => {
  const src = useBaseUrl('/api-html/index.html');
  return (
    <Layout title="API" description="SGCT C++ API reference" noFooter>
      <iframe
        src={src}
        title="SGCT C++ API reference"
        style={{
          display: 'block',
          width: '100%',
          // Fill the viewport below the navbar
          height: 'calc(100vh - var(--ifm-navbar-height))',
          border: 'none'
        }}
      />
    </Layout>
  );
}
