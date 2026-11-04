/**
 * Checks the `<Parameter>` tables of the configuration reference against the SGCT JSON
 * schema, so that the reference cannot drift away from what SGCT accepts. For every
 * documented object it reports
 *
 *   - parameters that are documented but do not exist in the schema
 *   - schema properties that are not documented
 *   - `optional` badges that disagree with the schema's `required` list
 *   - types that disagree with the schema, including the values of enumerations
 *
 *   npm run check-reference                              # schema from sgct/sgct master
 *   SGCT_SOURCE_DIR=<source/sgct> npm run check-reference  # schema from a local checkout
 *   SGCT_REF=v2.9.3 npm run check-reference              # schema from a release
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSchema } from './sgct-schema.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const referenceDir = join(root, 'docs', 'reference', 'configuration');

// Which part of the schema each page documents. Pages that document several types, such
// as the base types, map each of their headings to a separate part of the schema
const Pages = [
  { file: 'cluster.mdx', schema: '#' },
  { file: 'node.mdx', schema: '#/$defs/node' },
  { file: 'window.mdx', schema: '#/$defs/window' },
  { file: 'viewport.mdx', schema: '#/$defs/viewport' },
  { file: 'user.mdx', schema: '#/$defs/user' },
  { file: 'scene.mdx', schema: '#/$defs/scene' },
  { file: 'settings.mdx', schema: '#/$defs/settings' },
  { file: 'capture.mdx', schema: '#/$defs/capture' },
  { file: 'tracker.mdx', schema: '#/$defs/tracker' },
  { file: 'device.mdx', schema: '#/$defs/device' },
  {
    file: 'basetypes.mdx',
    sections: {
      'ivec2': '#/$defs/ivec2',
      'vec2': '#/$defs/vec2',
      'vec3': '#/$defs/vec3',
      'vec4': '#/$defs/vec4',
      'color': '#/$defs/color',
      'Yaw/Pitch/Roll': '#/$defs/orientation/anyOf/0',
      'Quaternion': '#/$defs/orientation/anyOf/1',
    },
  },
  { file: 'projections/cubemapprojection/index.mdx', schema: '#/$defs/cubemapprojection' },
  {
    file: 'projections/cylindricalprojection/index.mdx',
    schema: '#/$defs/cylindricalprojection',
  },
  {
    file: 'projections/equirectangularprojection/index.mdx',
    schema: '#/$defs/equirectangularprojection',
  },
  { file: 'projections/fisheyeprojection/index.mdx', schema: '#/$defs/fisheyeprojection' },
  { file: 'projections/planarprojection/index.mdx', schema: '#/$defs/planarprojection' },
  { file: 'projections/projectionplane/index.mdx', schema: '#/$defs/projectionplane' },
  {
    file: 'projections/sphericalmirrorprojection/index.mdx',
    schema: '#/$defs/sphericalmirrorprojection',
  },
  {
    file: 'projections/texturemappedprojection/index.mdx',
    schema: '#/$defs/texturemappedprojection',
  },
];

// Deliberate differences between the reference and the schema, each with the reason why
// the reference does not follow the schema. A difference that is listed here but no longer
// occurs is reported, so that this list cannot go stale
const KnownDifferences = [
  {
    file: 'user.mdx',
    path: 'tracking',
    check: 'type',
    reason: 'The schema describes an array, but SGCT only loads a single object',
  },
];

// Schema definitions whose name the reference spells differently
const TypeAliases = { projectionquality: 'quality' };

// Docs type labels that only name the kind of value; any other label of a parameter whose
// schema is an enumeration has to list exactly the enumeration's values
const GenericTypes = new Set(['string', 'integer', 'number', 'boolean', 'object']);


//
// Parsing the documentation
//

/**
 * Replaces the contents of fenced code blocks with empty lines, so that the examples in
 * them are neither parsed as parameters nor as headings but line numbers stay intact.
 */
function blankCodeBlocks(text) {
  return text.replace(/^```[^\n]*\n[\s\S]*?^```/gm, (block) => block.replace(/[^\n]/g, ''));
}

/**
 * Reads the attributes of a JSX tag starting at `pos`, which is directly after the tag
 * name. Values in braces can contain further JSX, so the braces are counted rather than
 * matched with a regular expression.
 */
function parseAttributes(text, pos) {
  const attributes = {};
  while (pos < text.length) {
    while (/\s/.test(text[pos])) {
      pos += 1;
    }
    if (text.startsWith('/>', pos)) {
      return { attributes, end: pos + 2, selfClosing: true };
    }
    if (text[pos] === '>') {
      return { attributes, end: pos + 1, selfClosing: false };
    }

    const name = /^[A-Za-z_][\w-]*/.exec(text.slice(pos))?.[0];
    if (!name) {
      throw new Error(`Unexpected character '${text[pos]}' in a Parameter tag`);
    }
    pos += name.length;
    if (text[pos] !== '=') {
      attributes[name] = true;
      continue;
    }

    pos += 1;
    if (text[pos] === '"') {
      const end = text.indexOf('"', pos + 1);
      attributes[name] = text.slice(pos + 1, end);
      pos = end + 1;
    }
    else if (text[pos] === '{') {
      let depth = 0;
      let quote = null;
      const start = pos;
      for (; pos < text.length; pos += 1) {
        const c = text[pos];
        if (quote) {
          quote = c === quote ? null : quote;
        }
        else if (c === '"' || c === "'") {
          quote = c;
        }
        else if (c === '{') {
          depth += 1;
        }
        else if (c === '}') {
          depth -= 1;
          if (depth === 0) {
            break;
          }
        }
      }
      attributes[name] = text.slice(start + 1, pos);
      pos += 1;
    }
    else {
      throw new Error(`Unsupported value for the '${name}' attribute of a Parameter tag`);
    }
  }
  throw new Error('Unterminated Parameter tag');
}

/**
 * The type of a parameter as a reader sees it, for example `Node[]` for
 * `{<><Link to="...">Node</Link>[]</>}`.
 */
function typeLabel(type) {
  if (type === undefined || type === true) {
    return null;
  }
  return type.replace(/<[^>]*>/g, '').trim();
}

/**
 * Returns the `<Parameter>` elements of `text` as a tree, with every top-level parameter
 * attributed to the heading that precedes it.
 */
function parseParameters(text) {
  text = blankCodeBlocks(text);
  const lineOf = (pos) => text.slice(0, pos).split('\n').length;

  const top = [];
  const stack = [];
  let section = null;
  const token = /<Parameter\b|<\/Parameter>|^#{1,6} +(.*)$/gm;
  for (let match = token.exec(text); match; match = token.exec(text)) {
    if (match[0].startsWith('#')) {
      if (stack.length === 0) {
        section = match[1].trim();
      }
      continue;
    }
    if (match[0] === '</Parameter>') {
      if (stack.length === 0) {
        throw new Error(`Unmatched </Parameter> in line ${lineOf(match.index)}`);
      }
      stack.pop();
      continue;
    }

    const { attributes, end, selfClosing } = parseAttributes(text, token.lastIndex);
    token.lastIndex = end;
    const parameter = {
      name: attributes.name,
      optional: attributes.optional === true,
      type: typeLabel(attributes.type),
      line: lineOf(match.index),
      section,
      children: [],
    };
    if (typeof parameter.name !== 'string') {
      throw new Error(`Parameter without a name in line ${parameter.line}`);
    }
    (stack.length > 0 ? stack.at(-1).children : top).push(parameter);
    if (!selfClosing) {
      stack.push(parameter);
    }
  }
  if (stack.length > 0) {
    throw new Error(`Unclosed Parameter '${stack.at(-1).name}' in line ${stack.at(-1).line}`);
  }
  return top;
}


//
// Interpreting the schema
//

function pointer(schema, ref) {
  return ref
    .replace(/^#\/?/, '')
    .split('/')
    .filter((part) => part !== '')
    .reduce((node, part) => node?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], schema);
}

function resolveRef(schema, node) {
  while (node?.$ref) {
    node = pointer(schema, node.$ref);
  }
  return node;
}

/**
 * The properties and required properties of the object that `node` describes, looking
 * through references, arrays, and alternatives. For alternatives, a property is only
 * required if every alternative requires it. Returns null if `node` is no object.
 */
function objectShape(schema, node) {
  node = resolveRef(schema, node);
  if (!node) {
    return null;
  }
  if (node.type === 'array' && node.items) {
    return objectShape(schema, node.items);
  }

  const variants = node.oneOf ?? node.anyOf;
  if (!node.properties && variants) {
    const shapes = variants.map((variant) => objectShape(schema, variant)).filter(Boolean);
    if (shapes.length === 0) {
      return null;
    }
    const properties = new Map(shapes.flatMap((shape) => [...shape.properties]));
    const required = new Set(
      [...properties.keys()].filter((name) => shapes.every((s) => s.required.has(name)))
    );
    return { properties, required };
  }

  if (!node.properties) {
    return null;
  }
  return {
    properties: new Map(Object.entries(node.properties)),
    required: new Set(node.required ?? []),
  };
}

/**
 * The type labels under which the reference may describe `node`, in lowercase: the name
 * of a referenced definition, the JSON type, and `[]` suffixes for arrays.
 */
function typeLabels(schema, node) {
  if (node.$ref) {
    const name = node.$ref.split('/').at(-1);
    return [TypeAliases[name] ?? name, ...typeLabels(schema, pointer(schema, node.$ref))];
  }
  if (node.type === 'array') {
    return node.items ? typeLabels(schema, node.items).map((label) => `${label}[]`) : [];
  }
  if (node.type) {
    return [node.type];
  }
  if (node.oneOf || node.anyOf) {
    return ['object'];
  }
  return [];
}

/**
 * Whether the value of `node` is an object that is spelled out on the page itself, rather
 * than a reference to a type that is documented elsewhere.
 */
function isInlineObject(node) {
  if (node.$ref) {
    return false;
  }
  if (node.type === 'array') {
    return node.items !== undefined && isInlineObject(node.items);
  }
  return node.properties !== undefined;
}

/**
 * The values listed in a type label such as `8, 16, or 32`.
 */
function enumerationValues(label) {
  return label
    .split(/,\s*|\s+or\s+/)
    .map((value) => value.replace(/^or\s+/, '').trim())
    .filter((value) => value !== '');
}


//
// Comparing
//

function compare(schema, parameters, shape, context, report) {
  const documented = new Map();
  for (const parameter of parameters) {
    const path = context.path ? `${context.path}.${parameter.name}` : parameter.name;
    const at = { file: context.file, line: parameter.line, path };

    if (documented.has(parameter.name)) {
      report(at, 'duplicate', 'is documented more than once');
      continue;
    }
    documented.set(parameter.name, parameter);

    const property = shape.properties.get(parameter.name);
    if (!property) {
      report(at, 'unknown', 'is documented but does not exist in the schema');
      continue;
    }

    const required = shape.required.has(parameter.name);
    if (required === parameter.optional) {
      report(
        at,
        'required',
        required ?
          'is required by the schema but documented as optional' :
          'is optional in the schema but documented as required'
      );
    }

    checkType(schema, parameter, property, at, report);

    if (parameter.children.length > 0 || isInlineObject(property)) {
      const childShape = objectShape(schema, property);
      if (childShape) {
        compare(
          schema,
          parameter.children,
          childShape,
          { file: context.file, line: parameter.line, path },
          report
        );
      }
      else {
        report(at, 'type', 'has nested parameters, but the schema does not describe an object');
      }
    }
  }

  for (const name of shape.properties.keys()) {
    if (!documented.has(name)) {
      const path = context.path ? `${context.path}.${name}` : name;
      report(
        { file: context.file, line: context.line, path },
        'missing',
        'exists in the schema but is not documented'
      );
    }
  }
}

function checkType(schema, parameter, property, at, report) {
  if (!parameter.type) {
    report(at, 'type', 'has no type');
    return;
  }

  const label = parameter.type.toLowerCase();
  const labels = typeLabels(schema, property).map((l) => l.toLowerCase());
  if (labels.includes(label)) {
    return;
  }

  const enumeration = resolveRef(schema, property).enum;
  if (enumeration && !GenericTypes.has(label)) {
    const expected = enumeration.map(String).sort();
    const actual = enumerationValues(parameter.type).sort();
    if (expected.join('\n') !== actual.join('\n')) {
      report(
        at,
        'type',
        `lists the values ${actual.join(', ')}, but the schema allows ${expected.join(', ')}`
      );
    }
    return;
  }

  report(
    at,
    'type',
    `is documented as '${parameter.type}', but the schema describes ${labels.join(' / ')}`
  );
}

function checkPage(schema, page, report) {
  const text = readFileSync(join(referenceDir, page.file), 'utf8');
  const parameters = parseParameters(text);
  const at = (line) => ({ file: page.file, line, path: '' });

  if (page.schema) {
    const shape = objectShape(schema, pointer(schema, page.schema));
    if (!shape) {
      report(at(1), 'schema', `${page.schema} does not describe an object in the schema`);
      return;
    }
    compare(schema, parameters, shape, { file: page.file, line: 1, path: '' }, report);
    return;
  }

  for (const [section, ref] of Object.entries(page.sections)) {
    const inSection = parameters.filter((parameter) => parameter.section === section);
    if (inSection.length === 0) {
      report(at(1), 'missing', `has no parameters in the section '${section}'`);
      continue;
    }
    const shape = objectShape(schema, pointer(schema, ref));
    if (!shape) {
      report(at(inSection[0].line), 'schema', `${ref} does not describe an object`);
      continue;
    }
    compare(
      schema,
      inSection,
      shape,
      { file: page.file, line: inSection[0].line, path: section },
      report
    );
  }
  for (const parameter of parameters) {
    if (!(parameter.section in page.sections)) {
      report(
        at(parameter.line),
        'unknown',
        `'${parameter.name}' is in the section '${parameter.section}', which has no schema`
      );
    }
  }
}

async function main() {
  const schema = await loadSchema();

  const problems = [];
  const used = new Set();
  const report = (at, check, message) => {
    const known = KnownDifferences.findIndex((difference) =>
      difference.file === at.file && difference.path === at.path && difference.check === check
    );
    if (known !== -1) {
      used.add(known);
      return;
    }
    problems.push({ ...at, message });
  };

  for (const page of Pages) {
    checkPage(schema, page, report);
  }
  KnownDifferences.forEach((difference, index) => {
    if (!used.has(index)) {
      problems.push({
        file: difference.file,
        line: 1,
        path: difference.path,
        message: `is listed as a known '${difference.check}' difference that no longer occurs`,
      });
    }
  });

  for (const problem of problems) {
    const name = problem.path ? `'${problem.path}' ` : '';
    console.error(`${problem.file}:${problem.line}: ${name}${problem.message}`);
  }
  if (problems.length > 0) {
    throw new Error(`Found ${problems.length} difference(s) between reference and schema`);
  }
  console.log(`The configuration reference on ${Pages.length} pages matches the schema`);
}

try {
  await main();
}
catch (error) {
  console.error(`\nReference check failed: ${error.message}`);
  process.exit(1);
}
