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

This command generates static content into the `build` directory and can be served using any static contents hosting service. The build fails on broken links and broken anchors.

## Checks
```bash
npm run lint
npm run validate-configs
npm run check-reference
```

`npm run lint` runs [markdownlint](https://github.com/DavidAnson/markdownlint) with the rules in `.markdownlint.json` over the documentation pages and this README. `npm run validate-configs` validates every JSON file in `docs/` against the `sgct.schema.json` of the SGCT repository, which ensures that the configuration files offered for download can be loaded by SGCT.

`npm run check-reference` compares the `Parameter` tables of the configuration reference with the same schema. It reports parameters that do not exist in the schema, schema properties that are not documented, `optional` badges that disagree with the schema's `required` lists, and types or enumeration values that disagree with the schema. Which page documents which part of the schema is listed in `Pages` at the top of `scripts/check-reference.mjs`, so a new reference page has to be added there. Deliberate differences, where the reference follows SGCT's behavior rather than the schema, are listed with their reason in `KnownDifferences` in the same file.

Both scripts fetch the schema from GitHub and accept the same `SGCT_SOURCE_DIR` and `SGCT_REF` environment variables as the [API generation](#c-api-reference). All three checks run on every build in the `Jenkinsfile`.

## Writing documentation
The documentation pages are MDX files in `docs/`, split into the `overview`, `reference`, `building`, and `examples` folders that each have their own sidebar. The sidebars are generated from the folder structure; the order of the pages is set by the `sidebar_position` in the front matter of a page or by a `_category_.json` file in a folder. Links between pages use absolute paths such as `/docs/reference/configuration/window#stereo`.

Lists are indented by two spaces, ordered lists use `1.` for every item, and the prose uses "server" and "client" for the roles of the nodes.

### Components
The following components are registered in `src/theme/MDXComponents.tsx` and can be used on every page:

| Component | Used for |
| --- | --- |
| `Parameter` | A value of a configuration file object. Takes `name`, `type`, `optional`, and `default`; the description is the content, and nested `Parameter`s describe the values of an object |
| `Argument` | A commandline argument. Takes `name`, `alias`, `value`, and `default`; the description is the content |
| `Example` | A configuration file next to the image it produces, with a download link for the file. Takes the file contents as `json`, the download name as `file`, and the rendering as `image`; the optional content is shown as a description above |
| `Gallery` | A grid of linked thumbnails, as used on the projections overview. Takes `items`, a list of `name`, `to`, and an optional `image` |

```mdx
<Parameter name="size" type={<Link to="/docs/reference/configuration/basetypes#ivec2">ivec2</Link>}>
Sets the size of the window in pixels.
</Parameter>
```

Every `Parameter` and `Argument` creates an anchor from its name. Nested parameters prefix their anchor with the anchor of their parent, so the `author` inside `meta` can be linked as `#meta-author`.

### Adding an example
Each example is a folder that contains the page, the configuration file, and an image of the result:

1. Create a folder in `docs/examples` (or next to the reference page the example belongs to) with an `index.mdx`
1. Add the configuration file. It has to use the current configuration file version and has to pass `npm run validate-configs`
1. Run the [Calibrator](https://sgct.dev/docs/building/calibrator) application with the configuration file, take a screenshot with the `P` key, and convert it to WebP, for example with `cwebp`
1. Import both files into the page and pass them to the `Example` component. The `?raw` suffix imports the configuration file as text, which the component displays and offers for download unchanged

```mdx
import json from './two-windows.json?raw';
import image from './two-windows.webp';

# Two Windows
<Example json={json} file="two-windows.json" image={image}>
A short description of what the example shows.
</Example>
```

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

To move to a newer Doxygen, regenerate the template with that release and re-apply the local changes to it:

```bash
doxygen -w html doxygen/header.html /dev/null /dev/null
```

1. the doxygen-awesome-css `<script>` block at the end of `<head>`
1. the sgct.dev integration `<script>` block after it, which redirects pages opened outside of `/api` into it and makes the light/dark theme follow the site's navbar switch
1. the two `$relpath^../` links with `target="_top"` wrapped around `#projectlogo` and `#projectname`

Pages of the reference are linked from the documentation as `/api?page=<file>.html`, which opens them inside the site rather than as bare Doxygen output.
