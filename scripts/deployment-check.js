#!/usr/bin/env node

/**
 * Deployment Readiness Check
 * Validates that all necessary files and configurations are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 Checking deployment readiness...\n');

const checks = [
  {
    name: 'GitHub Actions CI/CD workflow',
    path: '.github/workflows/ci.yml',
    required: true
  },
  {
    name: 'Vercel configuration',
    path: 'vercel.json',
    required: true
  },
  {
    name: 'Package.json build script',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      return pkg.scripts && pkg.scripts.build;
    },
    required: true
  },
  {
    name: 'TypeScript configuration',
    path: 'tsconfig.json',
    required: true
  },
  {
    name: 'Vite configuration',
    path: 'vite.config.ts',
    required: true
  },
  {
    name: 'Environment example file',
    path: 'env.example',
    required: true
  },
  {
    name: 'Deployment documentation',
    path: 'DEPLOYMENT.md',
    required: false
  }
];

let allPassed = true;
let requiredPassed = true;

checks.forEach(check => {
  let passed = false;
  
  if (check.path) {
    passed = fs.existsSync(path.join(projectRoot, check.path));
  } else if (check.check) {
    try {
      passed = check.check();
    } catch (e) {
      passed = false;
    }
  }
  
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  const requirement = check.required ? '(Required)' : '(Optional)';
  
  console.log(`${icon} ${check.name} ${requirement}: ${status}`);
  
  if (!passed) {
    allPassed = false;
    if (check.required) {
      requiredPassed = false;
    }
  }
});

console.log('\n' + '='.repeat(50));

if (requiredPassed) {
  console.log('🎉 All required checks passed! Ready for deployment.');
  console.log('\n📋 Next steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Set up Vercel project');
  console.log('3. Configure environment variables');
  console.log('4. Deploy!');
  console.log('\nSee DEPLOYMENT.md for detailed instructions.');
} else {
  console.log('⚠️  Some required checks failed. Please fix them before deploying.');
  process.exit(1);
}

if (!allPassed && requiredPassed) {
  console.log('\n💡 Some optional checks failed, but you can still deploy.');
}

console.log('\n🔗 Useful commands:');
console.log('npm run pre-commit  - Run all pre-commit checks');
console.log('npm run build       - Test local build');
console.log('npm run preview     - Preview built app locally'); 