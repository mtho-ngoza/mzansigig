/**
 * Script to create test users with different skill profiles
 * Used for manual testing of personalized skill recommendations
 *
 * Usage: node scripts/create-test-users.js
 */

const admin = require('firebase-admin')

// Initialize Firebase Admin (assumes you have service account credentials)
// You may need to set GOOGLE_APPLICATION_CREDENTIALS environment variable
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  })
} catch (error) {
  console.error('Firebase initialization error. Make sure you have credentials set up.')
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS environment variable or place service account key in project root')
  process.exit(1)
}

const db = admin.firestore()

const testUsers = [
  {
    id: 'test-react-dev',
    email: 'react-dev@test.com',
    firstName: 'React',
    lastName: 'Developer',
    phone: '+27111111111',
    location: 'Cape Town',
    userType: 'job-seeker',
    skills: ['React', 'JavaScript'],
    createdAt: new Date(),
    isTestUser: true // Flag to easily identify and clean up later
  },
  {
    id: 'test-designer',
    email: 'designer@test.com',
    firstName: 'Creative',
    lastName: 'Designer',
    phone: '+27222222222',
    location: 'Johannesburg',
    userType: 'job-seeker',
    skills: ['Design', 'Photography'],
    createdAt: new Date(),
    isTestUser: true
  },
  {
    id: 'test-construction',
    email: 'construction@test.com',
    firstName: 'Manual',
    lastName: 'Worker',
    phone: '+27333333333',
    location: 'Durban',
    userType: 'job-seeker',
    skills: ['Construction'],
    createdAt: new Date(),
    isTestUser: true
  },
  {
    id: 'test-multiskill',
    email: 'multiskill@test.com',
    firstName: 'Multi',
    lastName: 'Skilled',
    phone: '+27444444444',
    location: 'Pretoria',
    userType: 'job-seeker',
    skills: ['React', 'Design', 'Marketing'],
    createdAt: new Date(),
    isTestUser: true
  },
  {
    id: 'test-no-skills',
    email: 'no-skills@test.com',
    firstName: 'Blank',
    lastName: 'Profile',
    phone: '+27555555555',
    location: 'Cape Town',
    userType: 'job-seeker',
    // No skills field
    createdAt: new Date(),
    isTestUser: true
  }
]

async function createTestUsers() {
  console.log('Creating test users in Firestore...\n')

  for (const user of testUsers) {
    try {
      await db.collection('users').doc(user.id).set(user)
      console.log(`✅ Created: ${user.email}`)
      console.log(`   Skills: ${user.skills ? user.skills.join(', ') : 'None'}`)
      console.log(`   Expected recommendations: ${getExpectedRecommendations(user.skills || [])}`)
      console.log('')
    } catch (error) {
      console.error(`❌ Failed to create ${user.email}:`, error.message)
    }
  }

  console.log('\n✅ Test users created successfully!')
  console.log('\n📝 Next steps:')
  console.log('1. Log in to your app with one of these test accounts')
  console.log('2. Navigate to the gig browser')
  console.log('3. Open the filter panel')
  console.log('4. Verify "💡 Based on Your Skills" section appears with correct recommendations')
  console.log('\n⚠️  Note: You may need to create Firebase Auth accounts for these users separately')
  console.log('   Or use an existing auth account and update its Firestore user document')
}

function getExpectedRecommendations(skills) {
  const skillMap = {
    React: 'TypeScript, Node.js, Design',
    JavaScript: 'React, TypeScript, Node.js',
    Design: 'React, Photography, Video Editing, Marketing',
    Photography: 'Video Editing, Design, Marketing',
    Construction: 'Transportation, Cleaning',
    Marketing: 'Writing, Design, Photography'
  }

  if (skills.length === 0) return 'None (no recommendations)'

  const recommendations = new Set()
  skills.forEach(skill => {
    if (skillMap[skill]) {
      skillMap[skill].split(', ').forEach(rec => recommendations.add(rec))
    }
  })

  // Remove skills user already has
  skills.forEach(skill => recommendations.delete(skill))

  return recommendations.size > 0 ? Array.from(recommendations).join(', ') : 'None'
}

async function cleanupTestUsers() {
  console.log('Cleaning up test users...\n')

  const snapshot = await db.collection('users').where('isTestUser', '==', true).get()

  const batch = db.batch()
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref)
  })

  await batch.commit()
  console.log(`✅ Deleted ${snapshot.size} test users`)
}

// Check command line arguments
const args = process.argv.slice(2)

if (args.includes('--cleanup') || args.includes('-c')) {
  cleanupTestUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error)
      process.exit(1)
    })
} else {
  createTestUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error)
      process.exit(1)
    })
}
