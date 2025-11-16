#!/usr/bin/env ts-node
/**
 * Database Seeding Script for MzansiGig
 *
 * This script initializes required data in Firebase Firestore for each environment.
 * Similar to Liquibase migrations for backend apps.
 *
 * Usage:
 *   npm run seed          # Seeds current Firebase environment (from .firebaserc)
 *   npm run seed:dev      # Seeds kasigig-dev
 *   npm run seed:prod     # Seeds kasigig-production
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Firebase Admin SDK initialization
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

if (!projectId) {
  console.error('❌ Error: FIREBASE_PROJECT_ID not found in environment variables')
  process.exit(1)
}

console.log(`🔥 Initializing Firebase Admin SDK for project: ${projectId}`)

// Initialize Firebase Admin
const app = initializeApp({
  projectId: projectId,
})

const db = getFirestore(app)

// ========================================
// Seed Data Definitions
// ========================================

const DEFAULT_FEE_CONFIG = {
  platformFeePercentage: 10,
  gigPostingFee: 10,
  minimumGigAmount: 100,
  active: true,
  name: 'Default Fee Configuration',
  description: 'Standard platform fees for all gigs',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: 'system-seed',
}

const SEED_DATA = {
  feeConfigs: [
    {
      id: 'default-fee-config',
      data: DEFAULT_FEE_CONFIG,
    },
  ],
}

// ========================================
// Seeding Functions
// ========================================

async function seedFeeConfigs() {
  console.log('\n📊 Seeding Fee Configurations...')

  for (const config of SEED_DATA.feeConfigs) {
    const docRef = db.collection('feeConfigs').doc(config.id)
    const doc = await docRef.get()

    if (doc.exists) {
      console.log(`  ⏭️  Fee config '${config.id}' already exists, skipping`)
    } else {
      await docRef.set(config.data)
      console.log(`  ✅ Created fee config: ${config.id}`)
    }
  }
}

async function verifySeededData() {
  console.log('\n🔍 Verifying seeded data...')

  // Verify fee config
  const feeConfigSnapshot = await db.collection('feeConfigs')
    .where('active', '==', true)
    .limit(1)
    .get()

  if (!feeConfigSnapshot.empty) {
    const config = feeConfigSnapshot.docs[0].data()
    console.log(`  ✅ Active fee config found: ${config.name}`)
    console.log(`     - Platform fee: ${config.platformFeePercentage}%`)
    console.log(`     - Posting fee: R${config.gigPostingFee}`)
  } else {
    console.log(`  ❌ No active fee config found!`)
  }
}

// ========================================
// Main Execution
// ========================================

async function main() {
  console.log('\n🌱 Starting Database Seeding...')
  console.log(`📍 Environment: ${projectId}`)
  console.log('=' .repeat(60))

  try {
    await seedFeeConfigs()
    await verifySeededData()

    console.log('\n' + '='.repeat(60))
    console.log('✅ Database seeding completed successfully!')
    console.log('=' .repeat(60) + '\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

// Run the seeding script
main()
