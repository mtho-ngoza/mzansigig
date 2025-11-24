/**
 * Script to set admin custom claims for Firebase users
 *
 * Usage:
 *   node scripts/setAdminClaim.js <email>
 *
 * Example:
 *   node scripts/setAdminClaim.js admin@mzansigigs.co.za
 *
 * Prerequisites:
 *   1. Install firebase-admin: npm install firebase-admin
 *   2. Download service account key from Firebase Console:
 *      Project Settings → Service Accounts → Generate New Private Key
 *   3. Save as 'serviceAccountKey.json' in project root (git ignored)
 *   4. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  // Try to use service account key file
  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin SDK initialized with service account');
} catch (error) {
  // Fallback to application default credentials
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log('✅ Firebase Admin SDK initialized with application default credentials');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK');
    console.error('Please ensure you have either:');
    console.error('  1. A serviceAccountKey.json file in the project root, OR');
    console.error('  2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    process.exit(1);
  }
}

/**
 * Set admin custom claim for a user
 * @param {string} email - User email address
 * @param {boolean} isAdmin - Whether to set or remove admin claim
 */
async function setAdminClaim(email, isAdmin = true) {
  try {
    console.log(`\n🔍 Looking up user: ${email}`);

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${user.uid}`);

    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: isAdmin });

    if (isAdmin) {
      console.log(`✅ Admin claim set for ${email}`);
      console.log(`   User ID: ${user.uid}`);
      console.log(`\n⚠️  IMPORTANT: User must sign out and sign back in for changes to take effect`);
    } else {
      console.log(`✅ Admin claim removed for ${email}`);
    }

    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\n📋 Current custom claims:', updatedUser.customClaims);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User not found: ${email}`);
      console.error('   Make sure the user has registered in the app first');
    } else {
      console.error('❌ Error setting admin claim:', error.message);
    }
    throw error;
  }
}

/**
 * List all admin users
 */
async function listAdmins() {
  try {
    console.log('\n📋 Listing all admin users...\n');

    let admins = [];
    let nextPageToken;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

      listUsersResult.users.forEach((userRecord) => {
        if (userRecord.customClaims && userRecord.customClaims.admin === true) {
          admins.push({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName || 'N/A'
          });
        }
      });

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    if (admins.length === 0) {
      console.log('No admin users found');
    } else {
      console.log(`Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`);
        console.log(`   UID: ${admin.uid}`);
        console.log(`   Name: ${admin.displayName}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error listing admins:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  Set admin claim:     node scripts/setAdminClaim.js <email>
  Remove admin claim:  node scripts/setAdminClaim.js <email> --remove
  List all admins:     node scripts/setAdminClaim.js --list

Examples:
  node scripts/setAdminClaim.js admin@mzansigigs.co.za
  node scripts/setAdminClaim.js user@example.com --remove
  node scripts/setAdminClaim.js --list
    `);
    process.exit(0);
  }

  try {
    if (args[0] === '--list') {
      await listAdmins();
    } else {
      const email = args[0];
      const isRemove = args[1] === '--remove';
      await setAdminClaim(email, !isRemove);
    }

    console.log('\n✅ Operation completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Operation failed\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { setAdminClaim, listAdmins };
