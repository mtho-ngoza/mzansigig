#!/usr/bin/env node
/**
 * Simple Firestore Seeding Script
 * Uses firebase-admin with application default credentials
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/seed-firestore.js
 *   OR authenticate first: gcloud auth application-default login
 */

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Get project ID from command line or environment
const projectId = process.env.FIREBASE_PROJECT_ID || process.argv[2]

if (!projectId) {
  console.error('❌ Error: Please provide PROJECT_ID')
  console.error('Usage: node scripts/seed-firestore.js <PROJECT_ID>')
  console.error('   OR: FIREBASE_PROJECT_ID=your-project node scripts/seed-firestore.js')
  process.exit(1)
}

console.log(`🔥 Initializing Firebase Admin for: ${projectId}`)

// Initialize Firebase Admin
admin.initializeApp({
  projectId: projectId
})

const db = admin.firestore()

// Load seed data
const seedDataPath = path.join(__dirname, 'seed-data.json')
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'))

async function seedFeeConfigs() {
  console.log('\n📊 Seeding Fee Configurations...')

  for (const [docId, data] of Object.entries(seedData.feeConfigs)) {
    const docRef = db.collection('feeConfigs').doc(docId)
    const doc = await docRef.get()

    if (doc.exists) {
      console.log(`  ⏭️  Fee config '${docId}' already exists, skipping`)
    } else {
      // Replace timestamp placeholders
      const processedData = JSON.parse(
        JSON.stringify(data).replace(/"__TIMESTAMP__"/g, 'admin.firestore.FieldValue.serverTimestamp()')
      )

      // Set timestamps properly
      processedData.createdAt = admin.firestore.FieldValue.serverTimestamp()
      processedData.updatedAt = admin.firestore.FieldValue.serverTimestamp()

      await docRef.set(processedData)
      console.log(`  ✅ Created fee config: ${docId}`)
    }
  }
}

async function verify() {
  console.log('\n🔍 Verifying seeded data...')

  const snapshot = await db.collection('feeConfigs')
    .where('active', '==', true)
    .limit(1)
    .get()

  if (!snapshot.empty) {
    const config = snapshot.docs[0].data()
    console.log(`  ✅ Active fee config found: ${config.name}`)
    console.log(`     - Platform fee: ${config.platformFeePercentage}%`)
    console.log(`     - Posting fee: R${config.gigPostingFee}`)
  } else {
    console.log(`  ❌ No active fee config found!`)
  }
}

async function main() {
  console.log('\n🌱 Starting Database Seeding...')
  console.log('='.repeat(60))

  try {
    await seedFeeConfigs()
    await verify()

    console.log('\n' + '='.repeat(60))
    console.log('✅ Database seeding completed successfully!')
    console.log('='.repeat(60) + '\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
