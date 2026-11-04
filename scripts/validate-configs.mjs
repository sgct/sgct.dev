/**
 * Validates every example configuration file in `docs/` against the SGCT JSON schema, so
 * that the files offered for download on the site are loadable by the current SGCT
 *
 *   npm run validate-configs                             # schema from sgct/sgct master
 *   SGCT_SOURCE_DIR=<source/sgct> npm run validate-configs # schema from a local checkout
 *   SGCT_REF=v2.9.3 npm run validate-configs             # schema from a release
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(root, 'docs');

async function loadSchema() {
  const local = process.env.SGCT_SOURCE_DIR;
  if (local) {
    const path = join(resolve(local), 'sgct.schema.json');
    console.log(`Using schema at ${path}`);
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  const ref = process.env.SGCT_REF ?? 'master';
  const url = `https://raw.githubusercontent.com/sgct/sgct/${ref}/sgct.schema.json`;
  console.log(`Fetching schema from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetching ${url} failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * All JSON files below `directory`, except Docusaurus' own `_category_.json` files.
 */
function configFiles(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .filter((entry) => entry.name !== '_category_.json')
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

async function main() {
  const schema = await loadSchema();
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  const files = configFiles(docsDir);
  let failures = 0;
  for (const file of files) {
    const name = relative(root, file).replaceAll('\\', '/');
    let config;
    try {
      config = JSON.parse(readFileSync(file, 'utf8'));
    }
    catch (error) {
      console.error(`${name}: not valid JSON (${error.message})`);
      failures += 1;
      continue;
    }

    if (!validate(config)) {
      failures += 1;
      console.error(`${name}:`);
      for (const error of validate.errors) {
        const params = JSON.stringify(error.params);
        console.error(`  ${error.instancePath || '/'} ${error.message} ${params}`);
      }
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} of ${files.length} configuration files are invalid`);
  }
  console.log(`All ${files.length} configuration files are valid`);
}

try {
  await main();
}
catch (error) {
  console.error(`\nConfiguration validation failed: ${error.message}`);
  process.exit(1);
}
