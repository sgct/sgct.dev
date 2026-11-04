# Website
This website is built using [Docusaurus](https://docusaurus.io/)

## Installation
```bash
npm install
```

## Local Development
```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build
```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## C++ API reference
The Doxygen reference embedded in the site at `/api/` is not part of `npm run build`; it is generated separately so that building the site needs neither Doxygen nor network access:

```bash
npm run generate-api
```

This writes `static/api-html/`, which Docusaurus then copies verbatim into `build/api-html/`. By default the SGCT sources are shallow-cloned from GitHub. Two environment variables change that:

| Variable | Effect |
| --- | --- |
| `SGCT_SOURCE_DIR` | Use an existing local SGCT checkout instead of cloning |
| `SGCT_REF` | Branch or tag to clone, `master` by default |

```bash
SGCT_SOURCE_DIR=../sgct npm run generate-api   # document a local working copy
SGCT_REF=v2.9.3 npm run generate-api           # document a release
```

### Toolchain requirements
`doxygen/header.html` is a version-specific template: it carries conditional markers and `$placeholder` substitutions that only the Doxygen release which generated it knows how to process, and an older Doxygen writes them into the page verbatim instead. The generation script therefore reads the version from the template's first line and refuses to run against anything older. Distribution packages lag a long way behind here (Ubuntu 22.04 ships 1.9.1), so install a current release from [doxygen.nl](https://www.doxygen.nl/download.html) rather than from `apt`.

Graphviz is not required: the Doxyfile sets `HAVE_DOT = NO`, so no class or include graphs are generated.

To move to a newer Doxygen, regenerate the template with that release and re-apply the two local changes to it:

```bash
doxygen -w html doxygen/header.html /dev/null /dev/null
```

1. the doxygen-awesome-css `<script>` block at the end of `<head>`
1. the two `https://sgct.dev/` links wrapped around `#projectlogo` and `#projectname`
