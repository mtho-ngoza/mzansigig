#!/usr/bin/env node
/**
 * Seed Fee Configuration Script
 *
 * Seeds the default fee configuration into Firestore for consistent values across all environments.
 *
 * Usage:
 *   npm run seed:fee-config:dev   (seeds to kasigig-dev)
 *   npm run seed:fee-config:prod  (seeds to kasigig-production)
 *
 * Prerequisites:
 *   Must be authenticated with Firebase: gcloud auth application-default login
 *   OR set GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
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

// Default fee configuration for South African market
const DEFAULT_FEE_CONFIG = {
  // Platform fees (paid by employer)
  platformFeePercentage: 5, // 5% platform service fee
  paymentProcessingFeePercentage: 2.9, // 2.9% payment processing
  fixedTransactionFee: 2.50, // R2.50 fixed fee per transaction

  // Worker commission (deducted from worker earnings)
  workerCommissionPercentage: 10, // 10% commission from worker earnings

  // Minimum amounts
  minimumGigAmount: 100, // R100 minimum gig value
  minimumWithdrawal: 50, // R50 minimum withdrawal
  minimumMilestone: 50, // R50 minimum milestone

  // Escrow settings
  escrowReleaseDelayHours: 72, // 3 days default hold
  autoReleaseEnabled: true,

  // Payment providers
  enabledProviders: ['payfast', 'ozow', 'yoco'],
  defaultProvider: 'payfast',

  // South African tax
  vatIncluded: true,
  vatPercentage: 15,

  // Status
  isActive: true,

  // Metadata
  createdBy: 'system-seed',
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
      console.log(`   Platform Fee: ${data.platformFeePercentage}%`)
      console.log(`   Worker Commission: ${data.workerCommissionPercentage}%`)
      console.log(`   Created By: ${data.createdBy || 'unknown'}`)
      console.log('')
      console.log('✅ No changes needed - using existing configuration')
      return
    }

    // Deactivate any existing configs (just in case)
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

    // Create the default fee configuration
    const docRef = await feeConfigsRef.add(DEFAULT_FEE_CONFIG)

    console.log('✅ Successfully seeded fee configuration!')
    console.log('')
    console.log('📋 Configuration Details:')
    console.log('   Document ID:', docRef.id)
    console.log('')
    console.log('   Employer Fees:')
    console.log(`   - Platform Fee: ${DEFAULT_FEE_CONFIG.platformFeePercentage}%`)
    console.log(`   - Processing Fee: ${DEFAULT_FEE_CONFIG.paymentProcessingFeePercentage}%`)
    console.log(`   - Fixed Fee: R${DEFAULT_FEE_CONFIG.fixedTransactionFee}`)
    console.log('')
    console.log('   Worker Deductions:')
    console.log(`   - Commission: ${DEFAULT_FEE_CONFIG.workerCommissionPercentage}%`)
    console.log('')
    console.log('   Minimum Amounts:')
    console.log(`   - Gig Amount: R${DEFAULT_FEE_CONFIG.minimumGigAmount}`)
    console.log(`   - Withdrawal: R${DEFAULT_FEE_CONFIG.minimumWithdrawal}`)
    console.log(`   - Milestone: R${DEFAULT_FEE_CONFIG.minimumMilestone}`)
    console.log('')
    console.log('   Escrow Settings:')
    console.log(`   - Release Delay: ${DEFAULT_FEE_CONFIG.escrowReleaseDelayHours} hours`)
    console.log(`   - Auto Release: ${DEFAULT_FEE_CONFIG.autoReleaseEnabled ? 'Enabled' : 'Disabled'}`)
    console.log('')
    console.log('   Payment Providers:')
    console.log(`   - Enabled: ${DEFAULT_FEE_CONFIG.enabledProviders.join(', ')}`)
    console.log(`   - Default: ${DEFAULT_FEE_CONFIG.defaultProvider}`)
    console.log('')
    console.log('   Tax:')
    console.log(`   - VAT Included: ${DEFAULT_FEE_CONFIG.vatIncluded ? 'Yes' : 'No'}`)
    console.log(`   - VAT Percentage: ${DEFAULT_FEE_CONFIG.vatPercentage}%`)

    // Example calculation
    const exampleAmount = 1000
    const platformFee = Math.round((exampleAmount * DEFAULT_FEE_CONFIG.platformFeePercentage) / 100 * 100) / 100
    const processingFee = Math.round((exampleAmount * DEFAULT_FEE_CONFIG.paymentProcessingFeePercentage) / 100 * 100) / 100
    const fixedFee = DEFAULT_FEE_CONFIG.fixedTransactionFee
    const totalEmployerFees = platformFee + processingFee + fixedFee
    const workerCommission = Math.round((exampleAmount * DEFAULT_FEE_CONFIG.workerCommissionPercentage) / 100 * 100) / 100
    const netToWorker = exampleAmount - workerCommission
    const totalEmployerCost = exampleAmount + totalEmployerFees

    console.log('')
    console.log('💡 Example: R1000 Gig')
    console.log(`   Employer pays: R${totalEmployerCost.toFixed(2)} (R${exampleAmount} + R${totalEmployerFees.toFixed(2)} fees)`)
    console.log(`   Worker receives: R${netToWorker.toFixed(2)} (R${exampleAmount} - R${workerCommission.toFixed(2)} commission)`)
    console.log(`   Platform earns: R${(totalEmployerFees + workerCommission).toFixed(2)}`)

  } catch (error) {
    console.error('❌ Error seeding fee configuration:', error)
    throw error
  }
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
