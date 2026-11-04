/**
 * Loads the SGCT configuration JSON schema for the scripts that check this site against it.
 * The schema comes from a local SGCT checkout if `SGCT_SOURCE_DIR` is set, and is fetched
 * from GitHub at `SGCT_REF` (`master` by default) otherwise
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function loadSchema() {
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
