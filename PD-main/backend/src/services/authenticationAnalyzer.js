import { visit } from './astUtils.js';

const AUTH_PATTERNS = [
  'jsonwebtoken', 'jwt', 'passport', 'oauth', 'springsecurity', 'firebase', 'auth0', 'ApiKey', 'Authorization', 'ApiKeyAuth'
];

export function analyzeAuthentication(parsedFile) {
  const auth = { jwt: false, oauth: false, passport: false, springSecurity: false, firebase: false, apiKey: false, providers: [] };

  visit(parsedFile.ast, (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const name = callee?.name || callee?.property?.name;
      if (!name) return;
      if (/jwt|jsonwebtoken/i.test(name)) auth.jwt = true;
      if (/passport/i.test(name)) auth.passport = true;
      if (/oauth/i.test(name)) auth.oauth = true;
      if (/firebase/i.test(name)) auth.firebase = true;
      if (/apikey|apiKey|Authorization/i.test(name)) auth.apiKey = true;
    }
    if (node.type === 'Decorator') {
      const name = node.expression?.callee?.name || node.expression?.name;
      if (/Auth|UseGuards|Roles|Jwt/i.test(name)) auth.providers.push(name);
    }
    if (node.type === 'ImportDeclaration' || node.type === 'ImportSpecifier') {
      const source = node.source?.value || node.module?.value;
      if (typeof source === 'string') {
        const normalized = source.toLowerCase();
        AUTH_PATTERNS.forEach((pattern) => {
          if (normalized.includes(pattern.toLowerCase())) {
            auth.providers.push(source);
          }
        });
      }
    }
  });

  auth.providers = Array.from(new Set(auth.providers));
  return auth;
}
