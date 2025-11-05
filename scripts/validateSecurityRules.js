/**
 * Script to validate Firebase Security Rules syntax
 *
 * Usage:
 *   node scripts/validateSecurityRules.js
 *
 * This script checks:
 *   1. Firestore rules file exists and is valid
 *   2. Storage rules file exists and is valid
 *   3. Firebase configuration exists
 *   4. All required files are present
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    log(`✅ ${description} exists: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description} missing: ${filePath}`, 'red');
    return false;
  }
}

function validateFirestoreRules() {
  log('\n📋 Validating Firestore Rules...', 'cyan');

  const rulesPath = path.join(__dirname, '..', 'firestore.rules');

  if (!fs.existsSync(rulesPath)) {
    log('❌ firestore.rules file not found', 'red');
    return false;
  }

  const content = fs.readFileSync(rulesPath, 'utf8');

  // Basic syntax checks
  const checks = [
    {
      test: content.includes("rules_version = '2'"),
      message: 'Rules version 2 specified'
    },
    {
      test: content.includes('service cloud.firestore'),
      message: 'Firestore service declaration found'
    },
    {
      test: content.includes('function isAuthenticated()'),
      message: 'Authentication helper function defined'
    },
    {
      test: content.includes('function isOwner('),
      message: 'Ownership helper function defined'
    },
    {
      test: content.includes('match /users/{userId}'),
      message: 'Users collection rules defined'
    },
    {
      test: content.includes('match /gigs/{gigId}'),
      message: 'Gigs collection rules defined'
    },
    {
      test: content.includes('match /applications/{applicationId}'),
      message: 'Applications collection rules defined'
    },
    {
      test: content.includes('match /payments/{paymentId}'),
      message: 'Payments collection rules defined'
    },
    {
      test: content.includes('match /conversations/{conversationId}'),
      message: 'Conversations collection rules defined'
    },
    {
      test: content.includes('match /messages/{messageId}'),
      message: 'Messages collection rules defined'
    },
    {
      test: content.includes('match /verification-results/{resultId}'),
      message: 'Verification results collection rules defined'
    },
    {
      test: content.includes('match /verification-documents/{documentId}'),
      message: 'Verification documents collection rules defined'
    },
    {
      test: content.includes('match /emergency-contacts/{contactId}'),
      message: 'Emergency contacts collection rules defined'
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    if (check.test) {
      log(`  ✅ ${check.message}`, 'green');
    } else {
      log(`  ❌ ${check.message}`, 'red');
      allPassed = false;
    }
  });

  return allPassed;
}

function validateStorageRules() {
  log('\n📦 Validating Storage Rules...', 'cyan');

  const rulesPath = path.join(__dirname, '..', 'storage.rules');

  if (!fs.existsSync(rulesPath)) {
    log('❌ storage.rules file not found', 'red');
    return false;
  }

  const content = fs.readFileSync(rulesPath, 'utf8');

  // Basic syntax checks
  const checks = [
    {
      test: content.includes("rules_version = '2'"),
      message: 'Rules version 2 specified'
    },
    {
      test: content.includes('service firebase.storage'),
      message: 'Storage service declaration found'
    },
    {
      test: content.includes('function isAuthenticated()'),
      message: 'Authentication helper function defined'
    },
    {
      test: content.includes('function isValidSize('),
      message: 'File size validation function defined'
    },
    {
      test: content.includes('match /profilePhotos/{userId}'),
      message: 'Profile photos rules defined'
    },
    {
      test: content.includes('match /portfolios/{userId}'),
      message: 'Portfolio rules defined'
    },
    {
      test: content.includes('match /verificationDocuments/{userId}'),
      message: 'Verification documents rules defined'
    },
    {
      test: content.includes('match /messages/{conversationId}'),
      message: 'Message attachments rules defined'
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    if (check.test) {
      log(`  ✅ ${check.message}`, 'green');
    } else {
      log(`  ❌ ${check.message}`, 'red');
      allPassed = false;
    }
  });

  return allPassed;
}

function validateFirebaseConfig() {
  log('\n⚙️  Validating Firebase Configuration...', 'cyan');

  const configPath = path.join(__dirname, '..', 'firebase.json');

  if (!fs.existsSync(configPath)) {
    log('❌ firebase.json not found', 'red');
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const checks = [
      {
        test: config.firestore && config.firestore.rules,
        message: 'Firestore rules path configured'
      },
      {
        test: config.storage && config.storage.rules,
        message: 'Storage rules path configured'
      },
      {
        test: config.firestore && config.firestore.indexes,
        message: 'Firestore indexes configured'
      }
    ];

    let allPassed = true;
    checks.forEach(check => {
      if (check.test) {
        log(`  ✅ ${check.message}`, 'green');
      } else {
        log(`  ⚠️  ${check.message}`, 'yellow');
        allPassed = false;
      }
    });

    return allPassed;
  } catch (error) {
    log(`❌ Invalid JSON in firebase.json: ${error.message}`, 'red');
    return false;
  }
}

function checkRequiredFiles() {
  log('\n📁 Checking Required Files...', 'cyan');

  const files = [
    { path: 'firestore.rules', desc: 'Firestore Security Rules' },
    { path: 'storage.rules', desc: 'Storage Security Rules' },
    { path: 'firebase.json', desc: 'Firebase Configuration' },
    { path: 'firestore.indexes.json', desc: 'Firestore Indexes' },
    { path: 'SECURITY_RULES_DEPLOYMENT.md', desc: 'Deployment Documentation' }
  ];

  let allExist = true;
  files.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      allExist = false;
    }
  });

  return allExist;
}

function printSummary(results) {
  log('\n' + '='.repeat(60), 'blue');
  log('VALIDATION SUMMARY', 'blue');
  log('='.repeat(60), 'blue');

  const allPassed = Object.values(results).every(r => r === true);

  Object.entries(results).forEach(([key, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const color = passed ? 'green' : 'red';
    log(`${status} - ${key}`, color);
  });

  log('='.repeat(60), 'blue');

  if (allPassed) {
    log('\n✅ All validations passed!', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Test rules locally: firebase emulators:start', 'cyan');
    log('  2. Deploy rules: firebase deploy --only firestore:rules,storage', 'cyan');
    log('  3. Set admin claims: node scripts/setAdminClaim.js <email>', 'cyan');
    log('  4. Read deployment guide: SECURITY_RULES_DEPLOYMENT.md\n', 'cyan');
  } else {
    log('\n❌ Some validations failed. Please fix the issues above.\n', 'red');
  }

  return allPassed;
}

function main() {
  log('\n🔐 Firebase Security Rules Validation', 'blue');
  log('='.repeat(60), 'blue');

  const results = {
    'Required Files': checkRequiredFiles(),
    'Firebase Config': validateFirebaseConfig(),
    'Firestore Rules': validateFirestoreRules(),
    'Storage Rules': validateStorageRules()
  };

  const allPassed = printSummary(results);
  process.exit(allPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateFirestoreRules,
  validateStorageRules,
  validateFirebaseConfig,
  checkRequiredFiles
};
