#!/usr/bin/env node
/**
 * Seed Fee Configuration Script
 *
 * Seeds the fee configuration into Firestore for TradeSafe payments.
 *
 * Usage:
 *   npm run seed:fee-config:dev   (seeds to kasigig-dev)
 *   npm run seed:fee-config:prod  (seeds to kasigig-production)
 *
 * Prerequisites:
 *   Must be authenticated with Firebase: gcloud auth application-default login
 */

const admin = require('firebase-admin')

// Get environment from command line (dev or production)
const environment = process.argv[2]
if (!environment || !['dev', 'production'].includes(environment)) {
  console.error('❌ Error: Invalid environment')
  console.error('Usage: npm run seed:fee-config:dev OR npm run seed:fee-config:prod')
  process.exit(1)
}

// Determine project ID based on environment
const projectId = environment === 'dev' ? 'kasigig-dev' : 'kasigig-production'

console.log(`🔧 Seeding fee configuration for ${environment.toUpperCase()} environment...`)
console.log(`🔥 Project: ${projectId}`)

// Initialize Firebase Admin with application default credentials
try {
  admin.initializeApp({
    projectId: projectId
  })
  console.log(`✅ Connected to Firebase project: ${projectId}`)
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error)
  console.error('\n💡 Tip: Authenticate first with: gcloud auth application-default login')
  process.exit(1)
}

const db = admin.firestore()

/**
 * Simplified Fee Configuration for TradeSafe
 *
 * Fee Model:
 * - Employer pays: exact gig amount (no additional fees)
 * - Platform takes: 10% commission from worker (via TradeSafe agent fee)
 * - Worker receives: 90% of gig amount
 */
const FEE_CONFIG = {
  // Platform commission - deducted from worker earnings via TradeSafe agent fee
  platformCommissionPercent: 10, // 10% commission

  // Gig amount limits
  minimumGigAmount: 100,    // R100 minimum
  maximumGigAmount: 100000, // R100,000 maximum

  // Escrow auto-release (worker protection)
  escrowAutoReleaseDays: 7, // Auto-release if employer doesn't respond in 7 days

  // Status
  isActive: true,
  createdBy: 'seed-script',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}

async function seedFeeConfig() {
  try {
    const feeConfigsRef = db.collection('feeConfigs')

    // Check if an active fee config already exists
    const existingConfigQuery = await feeConfigsRef
      .where('isActive', '==', true)
      .limit(1)
      .get()

    if (!existingConfigQuery.empty) {
      const existingConfig = existingConfigQuery.docs[0]
      const data = existingConfig.data()
      console.log('⚠️  Active fee configuration already exists')
      console.log(`   ID: ${existingConfig.id}`)
      console.log(`   Platform Commission: ${data.platformCommissionPercent || data.workerCommissionPercentage}%`)
      console.log(`   Created By: ${data.createdBy || 'unknown'}`)
      console.log('')

      // Update to new simplified structure
      console.log('📝 Updating to simplified structure...')
      await existingConfig.ref.update({
        platformCommissionPercent: FEE_CONFIG.platformCommissionPercent,
        minimumGigAmount: FEE_CONFIG.minimumGigAmount,
        maximumGigAmount: FEE_CONFIG.maximumGigAmount,
        escrowAutoReleaseDays: FEE_CONFIG.escrowAutoReleaseDays,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('✅ Configuration updated!')
      displayConfig()
      return
    }

    // Deactivate any existing configs
    const allConfigs = await feeConfigsRef.get()
    const batch = db.batch()
    let deactivatedCount = 0

    allConfigs.docs.forEach((doc: any) => {
      if (doc.data().isActive) {
        batch.update(doc.ref, {
          isActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        deactivatedCount++
      }
    })

    if (deactivatedCount > 0) {
      await batch.commit()
      console.log(`📝 Deactivated ${deactivatedCount} old configuration(s)`)
    }

    // Create the fee configuration
    const docRef = await feeConfigsRef.add(FEE_CONFIG)
    console.log('✅ Fee configuration created!')
    console.log(`   Document ID: ${docRef.id}`)
    displayConfig()

  } catch (error) {
    console.error('❌ Error seeding fee configuration:', error)
    throw error
  }
}

function displayConfig() {
  console.log('')
  console.log('┌──────────────────────────────────────────────────┐')
  console.log('│          Fee Configuration (TradeSafe)           │')
  console.log('├──────────────────────────────────────────────────┤')
  console.log(`│ Platform Commission:  ${FEE_CONFIG.platformCommissionPercent}%                        │`)
  console.log(`│ Minimum Gig Amount:   R${FEE_CONFIG.minimumGigAmount}                       │`)
  console.log(`│ Maximum Gig Amount:   R${FEE_CONFIG.maximumGigAmount.toLocaleString()}                   │`)
  console.log(`│ Escrow Auto-Release:  ${FEE_CONFIG.escrowAutoReleaseDays} days                       │`)
  console.log('└──────────────────────────────────────────────────┘')
  console.log('')
  console.log('💡 Example: R1000 Gig')
  console.log('   Employer pays:   R1,000 (exact gig amount)')
  console.log('   Platform takes:  R100   (10% commission)')
  console.log('   Worker receives: R900   (90% of gig amount)')
}

// Run the seeding
seedFeeConfig()
  .then(() => {
    console.log('')
    console.log('✅ Fee configuration seeding complete!')
    process.exit(0)
  })
  .catch((error: any) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
