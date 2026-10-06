export class SecurityAgent {
  /**
   * Scans repository files for security controls, vulnerabilities, and hardcoded secrets.
   * STRICT PRINCIPLE: Never expose plaintext secrets in generated output. Always mask.
   */
  static analyzeSecurity(inventory, sourceFiles = []) {
    const findings = [];
    const files = inventory.files || [];
    const filePaths = files.map(f => f.relativePath.toLowerCase());

    // 1. Authentication & Session Management
    const hasJwt = filePaths.some(p => p.includes('jwt')) || sourceFiles.some(f => (f.source || '').includes('jsonwebtoken') || (f.source || '').includes('jwt'));
    const hasBcrypt = sourceFiles.some(f => (f.source || '').includes('bcrypt') || (f.source || '').includes('argon2') || (f.source || '').includes('pbkdf2'));
    const hasSession = filePaths.some(p => p.includes('session')) || sourceFiles.some(f => (f.source || '').includes('express-session'));

    findings.push({
      category: 'Authentication',
      control: 'JWT Token Authentication',
      status: hasJwt ? 'Observed' : 'Not observed',
      riskLevel: hasJwt ? 'Low' : 'Needs review',
      details: hasJwt ? 'Stateless JSON Web Token authentication implementation detected in source files.' : 'No standard JWT authentication package identified.',
      evidence: files.filter(f => f.relativePath.toLowerCase().includes('jwt') || f.relativePath.toLowerCase().includes('auth')).map(f => f.relativePath).slice(0, 3)
    });

    findings.push({
      category: 'Cryptography',
      control: 'Cryptographic Password Hashing',
      status: hasBcrypt ? 'Observed' : 'Potential risk',
      riskLevel: hasBcrypt ? 'Low' : 'Needs review',
      details: hasBcrypt ? 'Robust cryptographic hashing library (bcrypt/argon2/pbkdf2) detected.' : 'No standard password hashing library detected. Ensure passwords are not stored in plaintext.',
      evidence: files.filter(f => f.relativePath.toLowerCase().includes('auth') || f.relativePath.toLowerCase().includes('user')).map(f => f.relativePath).slice(0, 3)
    });

    // 2. Secret & Sensitive Key Detection (with strict masking)
    const secretRegexes = [
      { type: 'AWS Access Key', regex: /(?:AKIA[0-9A-Z]{16})/g },
      { type: 'Private Key Block', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
      { type: 'Generic API Key / Secret Token', regex: /(?:api_key|apiKey|secret|password|passwd|token)\s*[:=]\s*['"]([A-Za-z0-9_\-.~+]{8,})['"]/gi },
      { type: 'Database Connection String', regex: /(?:mongodb(?:\+srv)?|postgres|postgresql|mysql):\/\/[A-Za-z0-9_]+:([^@]+)@/gi }
    ];

    let secretsFoundCount = 0;

    for (const file of sourceFiles) {
      const content = file.source || '';
      const path = file.relativePath || file.filePath || '';

      // Skip test mocks or config templates
      if (path.includes('.example') || path.includes('test') || path.includes('mock')) continue;

      for (const rule of secretRegexes) {
        let match;
        const re = new RegExp(rule.regex);
        while ((match = re.exec(content)) !== null) {
          secretsFoundCount++;
          const secretValue = match[1] || match[0];
          const masked = this.maskSecret(secretValue);

          findings.push({
            category: 'Secrets Management',
            control: `Exposed ${rule.type}`,
            status: 'Potential risk',
            riskLevel: 'High',
            details: `Potential hardcoded secret discovered in ${path}. Masked value: ${masked}`,
            evidence: [path, `Masked: ${masked}`]
          });
        }
      }
    }

    // 3. CORS & CSRF Controls
    const hasCors = sourceFiles.some(f => (f.source || '').includes('cors('));
    findings.push({
      category: 'Network Security',
      control: 'Cross-Origin Resource Sharing (CORS)',
      status: hasCors ? 'Observed' : 'Needs review',
      riskLevel: hasCors ? 'Low' : 'Medium',
      details: hasCors ? 'CORS middleware configuration detected.' : 'No explicit CORS middleware policy detected.',
      evidence: files.filter(f => f.relativePath.toLowerCase().includes('server') || f.relativePath.toLowerCase().includes('app')).map(f => f.relativePath).slice(0, 2)
    });

    return {
      totalChecks: findings.length,
      highRisks: findings.filter(f => f.riskLevel === 'High').length,
      mediumRisks: findings.filter(f => f.riskLevel === 'Medium').length,
      secretsDetectedCount: secretsFoundCount,
      findings
    };
  }

  static maskSecret(secret = '') {
    if (!secret || secret.length < 4) return '****';
    const visibleChars = Math.min(2, Math.floor(secret.length / 4));
    return secret.substring(0, visibleChars) + '****************' + secret.substring(secret.length - visibleChars);
  }
}
