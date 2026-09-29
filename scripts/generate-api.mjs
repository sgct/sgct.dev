/**
 * Generates the SGCT C++ API reference into `static/api/`, from where Docusaurus copies it
 * verbatim into `build/api/` and it is published as https://sgct.dev/api/.
 *
 * This is deliberately kept out of `npm run build`: the Docusaurus build stays hermetic and
 * needs neither Doxygen nor network access. CI runs this as its own stage before the build.
 *
 *   npm run generate-api                            # pinned clone of sgct/sgct
 *   SGCT_SOURCE_DIR=A:/work/sgct/sgct npm run generate-api   # work against a local checkout
 *   SGCT_REF=v2.9.3 npm run generate-api            # document a release instead of master
 *
 * Pass `--optional` to downgrade a missing `doxygen` binary from an error to a warning, for
 * contributors who only touch the Docusaurus side.
 */

import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.doxygen-cache');
const doxygenDir = join(root, 'doxygen');
const outputDir = join(root, 'static');
const warnLogfile = join(cacheDir, 'doxygen-warnings.log');

const SGCT_REPOSITORY = 'https://github.com/sgct/sgct.git';
const AWESOME_REPOSITORY = 'https://github.com/jothepro/doxygen-awesome-css.git';
const AWESOME_REF = 'v2.5.0';

const optional = process.argv.includes('--optional');

// Doxygen treats a backslash as a line continuation while parsing its configuration file, so
// every path handed to it through the environment has to use forward slashes.
const forward = (path) => path.replaceAll('\\', '/');

function git(args, cwd) {
  return execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']})
    .trim();
}

/** Shallow-clones `repository` at `ref` into `directory`, or updates it if it is already there. */
function syncCheckout(repository, ref, directory) {
  if (!existsSync(join(directory, '.git'))) {
    rmSync(directory, {recursive: true, force: true});
    mkdirSync(directory, {recursive: true});
    git(['init', '--quiet'], directory);
    git(['remote', 'add', 'origin', repository], directory);
  }
  git(['fetch', '--quiet', '--depth', '1', 'origin', ref], directory);
  git(['checkout', '--quiet', '--force', 'FETCH_HEAD'], directory);
  return directory;
}

/** Returns the SGCT checkout to document, and the ref it was fetched at if it was fetched. */
function resolveSources() {
  const local = process.env.SGCT_SOURCE_DIR;
  if (local) {
    const path = resolve(local);
    if (!existsSync(join(path, 'include', 'sgct'))) {
      throw new Error(`SGCT_SOURCE_DIR=${path} does not contain an include/sgct directory`);
    }
    console.log(`Using local SGCT sources at ${path}`);
    return {path, ref: null};
  }

  const ref = process.env.SGCT_REF ?? 'master';
  console.log(`Fetching SGCT sources at ${ref}`);
  return {path: syncCheckout(SGCT_REPOSITORY, ref, join(cacheDir, 'sgct')), ref};
}

function describe({path, ref}) {
  try {
    if (!ref) {
      // A full checkout carries the tag history: `v2.9.3` on a release, `v2.8.0-1067-g12d9c389`
      // in between. Both already identify the commit on their own.
      return git(['describe', '--tags', '--always'], path);
    }
    // A shallow fetch has no tags to describe against, so name the ref that was asked for.
    return `${ref} (${git(['rev-parse', '--short', 'HEAD'], path)})`;
  }
  catch {
    // A local checkout handed over through SGCT_SOURCE_DIR need not be a git repository.
    return 'local';
  }
}

function hasDoxygen() {
  const result = spawnSync('doxygen', ['--version'], {stdio: 'ignore', shell: false});
  return result.status === 0;
}

function main() {
  if (!hasDoxygen()) {
    const message =
      'doxygen was not found on PATH. Install it from https://www.doxygen.nl/download.html ' +
      '(or `apt install doxygen`) to generate the C++ API reference.';
    if (optional) {
      console.warn(`Skipping API generation: ${message}`);
      return;
    }
    throw new Error(message);
  }

  mkdirSync(cacheDir, {recursive: true});
  const sources = resolveSources();
  const version = describe(sources);
  console.log(`Documenting SGCT ${version}`);

  console.log(`Fetching doxygen-awesome-css ${AWESOME_REF}`);
  const awesome = syncCheckout(AWESOME_REPOSITORY, AWESOME_REF, join(cacheDir, 'doxygen-awesome-css'));

  // Doxygen merges into an existing output directory rather than replacing it, which would leave
  // behind pages for classes that have since been removed. maxRetries covers the EBUSY that
  // Windows raises while something else still holds a handle into the tree.
  rmSync(join(outputDir, 'api'), {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
  rmSync(warnLogfile, {force: true});

  const result = spawnSync('doxygen', [join(doxygenDir, 'Doxyfile')], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      SGCT_VERSION: version,
      SGCT_INCLUDE_DIR: forward(join(sources.path, 'include', 'sgct')),
      SGCT_INCLUDE_ROOT: forward(join(sources.path, 'include')),
      AWESOME_DIR: forward(awesome),
      DOXYGEN_DIR: forward(doxygenDir),
      DOXYGEN_OUTPUT: forward(outputDir),
      DOXYGEN_LOGO: forward(join(root, 'static', 'logo.webp')),
      DOXYGEN_WARN_LOGFILE: forward(warnLogfile),
    },
  });

  if (existsSync(warnLogfile)) {
    const warnings = readFileSync(warnLogfile, 'utf8').trim();
    if (warnings) {
      // Not fatal: these are defects in the sgct/sgct comment blocks, which this repository does
      // not own. Surfacing them here is what makes them fixable upstream.
      const count = warnings.split('\n').length;
      console.warn(`\nDoxygen reported ${count} warning(s) about the SGCT sources:`);
      console.warn(warnings);
    }
  }

  if (result.status !== 0) {
    throw new Error(`doxygen exited with status ${result.status}`);
  }
  if (!existsSync(join(outputDir, 'api', 'index.html'))) {
    throw new Error('doxygen reported success but static/api/index.html was not produced');
  }

  console.log('Generated the C++ API reference in static/api');
}

try {
  main();
}
catch (error) {
  console.error(`\nAPI generation failed: ${error.message}`);
  process.exit(1);
}
