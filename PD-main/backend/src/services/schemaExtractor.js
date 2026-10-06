import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import toml from 'toml';

const CONFIG_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml', '.sql'];

export async function extractSchemaDefinitions(inventory) {
  const files = inventory.files || [];
  const schemaFiles = files.filter((file) => CONFIG_EXTENSIONS.includes(path.extname(file.relativePath).toLowerCase()));
  const schemas = [];

  for (const file of schemaFiles) {
    const content = await fs.readFile(file.absolutePath, 'utf8').catch(() => null);
    if (!content) continue;

    const ext = path.extname(file.relativePath).toLowerCase();
    const parsed = parseConfigFile(content, ext);
    if (!parsed) continue;

    schemas.push({
      file: file.relativePath,
      extension: ext,
      data: parsed
    });
  }

  return schemas;
}

function parseConfigFile(content, ext) {
  try {
    if (ext === '.json') return JSON.parse(content);
    if (ext === '.yaml' || ext === '.yml') return yaml.load(content);
    if (ext === '.toml') return toml.parse(content);
    if (ext === '.sql') return { sql: content };
  } catch (err) {
    return null;
  }
  return null;
}
