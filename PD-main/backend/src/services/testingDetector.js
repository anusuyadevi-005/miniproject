import fs from 'fs-extra';

function findFile(files, fileName) {
  return files.find((file) => file.relativePath.toLowerCase() === fileName.toLowerCase());
}

export async function detectTesting(inventory) {
  const files = inventory.files || [];
  const packageJsonFile = findFile(files, 'package.json');
  const testing = {
    frameworks: []
  };

  if (packageJsonFile) {
    const content = await fs.readFile(packageJsonFile.absolutePath, 'utf8');
    try {
      const packageJson = JSON.parse(content);
      const scripts = packageJson.scripts || {};
      const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

      if (deps.jest || scripts.test?.includes('jest')) {
        testing.frameworks.push('Jest');
      }
      if (deps.mocha || scripts.test?.includes('mocha')) {
        testing.frameworks.push('Mocha');
      }
      if (deps.chai) {
        testing.frameworks.push('Chai');
      }
      if (deps.vitest || scripts.test?.includes('vitest')) {
        testing.frameworks.push('Vitest');
      }
      if (deps['@playwright/test']) {
        testing.frameworks.push('Playwright');
      }
    } catch (err) {
      // ignore parse errors
    }
  }

  if (findFile(files, 'pom.xml')) {
    testing.frameworks.push('JUnit');
  }
  if (findFile(files, 'build.gradle') || findFile(files, 'settings.gradle')) {
    testing.frameworks.push('JUnit');
  }
  if (findFile(files, 'pytest.ini') || findFile(files, 'conftest.py')) {
    testing.frameworks.push('PyTest');
  }
  if (findFile(files, 'tox.ini')) {
    testing.frameworks.push('PyTest');
  }

  // Python requirements.txt check
  const reqFile = findFile(files, 'requirements.txt');
  if (reqFile) {
    try {
      const reqContent = await fs.readFile(reqFile.absolutePath, 'utf8');
      if (reqContent.toLowerCase().includes('pytest')) {
        testing.frameworks.push('PyTest');
      }
    } catch (e) {}
  }

  // Python test files inspection
  const pyTestFiles = files.filter(f => f.relativePath && (f.relativePath.toLowerCase().startsWith('test_') || f.relativePath.toLowerCase().endsWith('_test.py') || f.relativePath.toLowerCase().includes('/test_') || f.relativePath.toLowerCase().includes('\\test_')));
  for (const tFile of pyTestFiles) {
    try {
      const tContent = await fs.readFile(tFile.absolutePath, 'utf8');
      if (tContent.includes('unittest') || tContent.includes('TestCase')) {
        testing.frameworks.push('unittest');
      }
      if (tContent.includes('pytest') || tContent.includes('def test_')) {
        if (!testing.frameworks.includes('unittest')) {
          testing.frameworks.push('PyTest');
        }
      }
    } catch (e) {}
  }

  return {
    frameworks: Array.from(new Set(testing.frameworks))
  };
}
