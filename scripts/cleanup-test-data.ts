/**
 * Database Cleanup Script
 *
 * Deletes all payment-related data, applications, reviews, and conversations.
 * Resets gigs to 'open' status and user wallets to 0.
 *
 * Service Account Keys (local paths):
 *   DEV:  C:\Users\mthob\OneDrive\Documents\gigsa\key\kasigig-dev.json
 *   PROD: C:\Users\mthob\OneDrive\Documents\gigsa\key\kasigig-production.json
 *
 * Usage:
 *   # Dev
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\mthob\OneDrive\Documents\gigsa\key\kasigig-dev.json"
 *   npx ts-node scripts/cleanup-test-data.ts --env=dev --confirm
 *
 *   # Production
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\mthob\OneDrive\Documents\gigsa\key\kasigig-production.json"
 *   npx ts-node scripts/cleanup-test-data.ts --env=production --confirm
 *
 * Options:
 *   --env=dev|production  Target environment (required)
 *   --confirm             Actually perform the cleanup
 *   --keep-wallets        Keep user wallet balances (default: reset to 0)
 *
 * WARNING: This is destructive! Use with caution.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
const firebaseAdmin = require('firebase-admin') as any

// Collections to delete entirely
const COLLECTIONS_TO_DELETE = [
  'payments',
  'paymentIntents',
  'paymentHistory',
  'escrowAccounts',
  'escrow',
  'paymentDisputes',
  'withdrawals',
  'milestones',
  'applications',
  'reviews',
  'conversations',
  'messages',
  'walletTransactions',
  'feeConfigs'
]

// Fields to clear from gigs when resetting
const GIG_FIELDS_TO_CLEAR = [
  'assignedTo',
  'acceptedApplicationId',
  'paymentStatus',
  'paidAmount',
  'fundedAt',
  'paymentVerifiedVia',
  'paymentTransactionId'
]

// Fields to reset on users (wallet balances)
const USER_WALLET_FIELDS = {
  walletBalance: 0,
  pendingBalance: 0,
  totalEarnings: 0,
  totalWithdrawn: 0,
  reviewCount: 0
}

// Fields to delete from users (TradeSafe tokens - recreated on next funding)
const USER_FIELDS_TO_DELETE = [
  'tradeSafeToken'
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteCollection(db: any, collectionName: string): Promise<number> {
  const collectionRef = db.collection(collectionName)
  const snapshot = await collectionRef.get()

  if (snapshot.empty) {
    console.log(`  ${collectionName}: 0 documents (empty)`)
    return 0
  }

  let count = 0

  // Firestore batches can only handle 500 operations at a time
  const docs = snapshot.docs
  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500)
    const chunkBatch = db.batch()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunk.forEach((doc: any) => {
      chunkBatch.delete(doc.ref)
      count++
    })

    await chunkBatch.commit()
  }

  console.log(`  ${collectionName}: ${count} documents deleted`)
  return count
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resetGigs(db: any): Promise<number> {
  const gigsRef = db.collection('gigs')
  const snapshot = await gigsRef.get()

  if (snapshot.empty) {
    console.log('  gigs: 0 documents (empty)')
    return 0
  }

  let count = 0
  const docs = snapshot.docs

  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500)
    const batch = db.batch()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunk.forEach((doc: any) => {
      const updates: Record<string, unknown> = {
        status: 'open',
        applicants: [],
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      }

      // Clear payment-related fields
      GIG_FIELDS_TO_CLEAR.forEach(field => {
        updates[field] = firebaseAdmin.firestore.FieldValue.delete()
      })

      batch.update(doc.ref, updates)
      count++
    })

    await batch.commit()
  }

  console.log(`  gigs: ${count} documents reset to 'open' status`)
  return count
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resetUserWallets(db: any): Promise<number> {
  const usersRef = db.collection('users')
  const snapshot = await usersRef.get()

  if (snapshot.empty) {
    console.log('  users: 0 documents (empty)')
    return 0
  }

  let count = 0
  const docs = snapshot.docs

  for (let i = 0; i < docs.length; i += 500) {
    const chunk = docs.slice(i, i + 500)
    const batch = db.batch()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunk.forEach((doc: any) => {
      const updates: Record<string, unknown> = {
        ...USER_WALLET_FIELDS,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      }

      // Delete TradeSafe fields (tokens will be recreated on next funding)
      USER_FIELDS_TO_DELETE.forEach(field => {
        updates[field] = firebaseAdmin.firestore.FieldValue.delete()
      })

      batch.update(doc.ref, updates)
      count++
    })

    await batch.commit()
  }

  console.log(`  users: ${count} wallet balances reset, TradeSafe tokens cleared`)
  return count
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDocumentCounts(db: any): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  for (const collection of [...COLLECTIONS_TO_DELETE, 'gigs', 'users']) {
    const snapshot = await db.collection(collection).count().get()
    counts[collection] = snapshot.data().count
  }

  return counts
}

async function main() {
  const args = process.argv.slice(2)
  const envArg = args.find(a => a.startsWith('--env='))
  const confirmFlag = args.includes('--confirm')
  const keepWallets = args.includes('--keep-wallets')
  const resetWallets = !keepWallets // Reset wallets by default

  if (!envArg) {
    console.error('Usage: npx ts-node scripts/cleanup-test-data.ts --env=dev|production [--confirm] [--keep-wallets]')
    console.error('')
    console.error('Options:')
    console.error('  --env=dev|production  Target environment (required)')
    console.error('  --confirm             Actually perform the cleanup (required for production)')
    console.error('  --keep-wallets        Keep user wallet balances (default: reset to 0)')
    process.exit(1)
  }

  const env = envArg.split('=')[1]

  if (env !== 'dev' && env !== 'production') {
    console.error('Error: --env must be "dev" or "production"')
    process.exit(1)
  }

  // Production requires --confirm to actually execute (dry run is always allowed)

  // Initialize Firebase Admin
  const projectId = env === 'production' ? 'kasigig-production' : 'kasigig-dev'

  console.log(`\n🔥 Database Cleanup Script`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Target: ${projectId}`)
  console.log(`Mode: ${confirmFlag ? '🚨 DESTRUCTIVE' : '👀 DRY RUN (preview only)'}`)
  console.log(`Wallet Reset: ${resetWallets ? 'Yes' : 'No (--keep-wallets)'}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // Check for service account credentials
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!serviceAccountPath) {
    console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set')
    console.error('')
    console.error('Set it to the path of your Firebase service account JSON file:')
    console.error(`  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/${projectId}-service-account.json"`)
    process.exit(1)
  }

  try {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.applicationDefault(),
      projectId
    })
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error)
    process.exit(1)
  }

  const db = firebaseAdmin.firestore()

  // Show current document counts
  console.log('📊 Current document counts:')
  const counts = await getDocumentCounts(db)
  for (const [collection, count] of Object.entries(counts)) {
    const action = COLLECTIONS_TO_DELETE.includes(collection) ? '🗑️  DELETE' :
                   collection === 'gigs' ? '🔄 RESET' :
                   collection === 'users' ? (resetWallets ? '💰 RESET WALLETS' : '✅ KEEP') : '✅ KEEP'
    console.log(`  ${action} ${collection}: ${count}`)
  }

  if (!confirmFlag) {
    console.log('\n⚠️  DRY RUN - No changes made')
    console.log('Add --confirm to actually perform the cleanup')
    process.exit(0)
  }

  console.log('\n🚀 Starting cleanup...\n')

  // Delete collections
  console.log('Deleting collections:')
  let totalDeleted = 0
  for (const collection of COLLECTIONS_TO_DELETE) {
    totalDeleted += await deleteCollection(db, collection)
  }

  // Reset gigs
  console.log('\nResetting gigs:')
  const gigsReset = await resetGigs(db)

  // Reset user wallets if requested
  let walletsReset = 0
  if (resetWallets) {
    console.log('\nResetting user wallets:')
    walletsReset = await resetUserWallets(db)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Cleanup complete!`)
  console.log(`   Documents deleted: ${totalDeleted}`)
  console.log(`   Gigs reset: ${gigsReset}`)
  if (resetWallets) {
    console.log(`   Wallets reset: ${walletsReset}`)
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
