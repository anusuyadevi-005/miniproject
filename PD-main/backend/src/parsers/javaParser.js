import fs from 'fs-extra';
import { parse } from 'java-parser';

export async function parseJava(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const cst = parse(text);
  return { language: 'Java', ast: cst, source: text, filePath };
}
