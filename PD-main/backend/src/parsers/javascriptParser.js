import fs from 'fs-extra';
import { parse } from '@babel/parser';

export async function parseJavaScript(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const ast = parse(text, {
    sourceType: 'unambiguous',
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'dynamicImport',
      'optionalChaining',
      'nullishCoalescingOperator',
      'decorators-legacy',
      'objectRestSpread'
    ]
  });
  return { language: 'JavaScript', ast, source: text, filePath };
}
