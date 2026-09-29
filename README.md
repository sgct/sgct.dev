# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

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

The Doxygen reference published at `/api/` is not part of `npm run build`; it is generated
separately so that building the site needs neither Doxygen nor network access:

```bash
npm run generate-api
```

This writes `static/api/`, which Docusaurus then copies verbatim into `build/api/`. Both that
directory and the `.doxygen-cache/` checkouts it works from are ignored by git, so a fresh clone has
no API reference until this has been run once, and the link from the
[C++ API reference](docs/building/cpp-api-reference.mdx) page will 404 until then. CI runs it as its
own stage before the build, which is why the build agent needs `doxygen` on its `PATH`.

By default the SGCT sources are shallow-cloned from GitHub. Two environment variables change that:

| Variable | Effect |
| --- | --- |
| `SGCT_SOURCE_DIR` | Use an existing local SGCT checkout instead of cloning |
| `SGCT_REF` | Branch or tag to clone, `master` by default |

```bash
SGCT_SOURCE_DIR=../sgct npm run generate-api   # document a local working copy
SGCT_REF=v2.9.3 npm run generate-api           # document a release
```

The Doxygen settings live in `doxygen/Doxyfile`, alongside the HTML header template and the
stylesheet that aligns [doxygen-awesome-css](https://github.com/jothepro/doxygen-awesome-css) with
this site's palette.

### Toolchain requirements

`doxygen/header.html` is a version-specific template: it carries conditional markers and
`$placeholder` substitutions that only the Doxygen release which generated it knows how to process,
and an older Doxygen writes them into the page verbatim instead. The generation script therefore
reads the version from the template's first line and refuses to run against anything older.
Distribution packages lag a long way behind here (Ubuntu 22.04 ships 1.9.1), so install a current
release from [doxygen.nl](https://www.doxygen.nl/download.html) rather than from `apt`.

Because `HAVE_DOT = YES`, Graphviz is required as well; without it every class and include graph
would be quietly missing from the output, so the script checks for `dot` too.

To move to a newer Doxygen, regenerate the template with that release and re-apply the two local
changes to it:

```bash
doxygen -w html doxygen/header.html /dev/null /dev/null
```

1. the doxygen-awesome-css `<script>` block at the end of `<head>`
2. the two `https://sgct.dev/` links wrapped around `#projectlogo` and `#projectname`

## Deployment

Using SSH:

```bash
USE_SSH=true npm run deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

If you are using GitHub Pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
