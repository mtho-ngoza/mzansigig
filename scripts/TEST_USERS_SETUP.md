# Test Users Setup Guide

This guide helps you create test users with different skill profiles for testing personalized skill recommendations.

---

## Method 1: Using the Automated Script ⚡ (FASTEST)

### Prerequisites
```bash
# Check if firebase-admin is installed
npm list firebase-admin

# If not installed:
npm install firebase-admin --save-dev
```

### Setup Firebase Credentials

**Option A: Using Service Account Key**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `serviceAccountKey.json` in project root
4. Add to `.gitignore` (should already be there)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
```

**Option B: Using Application Default Credentials**
```bash
# If you have gcloud CLI installed
gcloud auth application-default login
```

### Create Test Users
```bash
# Create all 5 test users
node scripts/create-test-users.js
```

**Output:**
```
✅ Created: react-dev@test.com
   Skills: React, JavaScript
   Expected recommendations: TypeScript, Node.js, Design

✅ Created: designer@test.com
   Skills: Design, Photography
   Expected recommendations: React, Video Editing, Marketing
...
```

### Cleanup Test Users (When Done Testing)
```bash
# Remove all test users
node scripts/create-test-users.js --cleanup
```

---

## Method 2: Manual Firestore Entry 📝 (NO SCRIPT NEEDED)

### Step 1: Open Firebase Console
```bash
# Print your Firestore URL
echo "https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/data"
```

### Step 2: Navigate to `users` Collection

### Step 3: Add Test Documents

Click "Add Document" and create these:

#### User 1: React Developer
```
Document ID: test-react-dev

Fields:
- id: "test-react-dev" (string)
- email: "react-dev@test.com" (string)
- firstName: "React" (string)
- lastName: "Developer" (string)
- phone: "+27111111111" (string)
- location: "Cape Town" (string)
- userType: "job-seeker" (string)
- skills: ["React", "JavaScript"] (array)
- createdAt: [Click "timestamp" and use current time]
- isTestUser: true (boolean)
```

**Test:** Should see TypeScript, Node.js, Design recommendations

---

#### User 2: Designer
```
Document ID: test-designer

Fields:
- id: "test-designer" (string)
- email: "designer@test.com" (string)
- firstName: "Creative" (string)
- lastName: "Designer" (string)
- phone: "+27222222222" (string)
- location: "Johannesburg" (string)
- userType: "job-seeker" (string)
- skills: ["Design", "Photography"] (array)
- createdAt: [timestamp]
- isTestUser: true (boolean)
```

**Test:** Should see React, JavaScript, Video Editing, Marketing recommendations

---

#### User 3: Construction Worker
```
Document ID: test-construction

Fields:
- id: "test-construction" (string)
- email: "construction@test.com" (string)
- firstName: "Manual" (string)
- lastName: "Worker" (string)
- phone: "+27333333333" (string)
- location: "Durban" (string)
- userType: "job-seeker" (string)
- skills: ["Construction"] (array)
- createdAt: [timestamp]
- isTestUser: true (boolean)
```

**Test:** Should see Transportation, Cleaning recommendations

---

#### User 4: Multi-Skilled
```
Document ID: test-multiskill

Fields:
- id: "test-multiskill" (string)
- email: "multiskill@test.com" (string)
- firstName: "Multi" (string)
- lastName: "Skilled" (string)
- phone: "+27444444444" (string)
- location: "Pretoria" (string)
- userType: "job-seeker" (string)
- skills: ["React", "Design", "Marketing"] (array)
- createdAt: [timestamp]
- isTestUser: true (boolean)
```

**Test:** Should see up to 6 recommendations from multiple clusters

---

#### User 5: No Skills
```
Document ID: test-no-skills

Fields:
- id: "test-no-skills" (string)
- email: "no-skills@test.com" (string)
- firstName: "Blank" (string)
- lastName: "Profile" (string)
- phone: "+27555555555" (string)
- location: "Cape Town" (string)
- userType: "job-seeker" (string)
- createdAt: [timestamp]
- isTestUser: true (boolean)

⚠️ NOTE: DO NOT add 'skills' field for this user
```

**Test:** Should NOT see "💡 Based on Your Skills" section

---

## Method 3: Update Existing User Profile 🔧

If you have an existing test account and your app has a profile edit feature:

1. Log in to your app with an existing account
2. Navigate to Profile/Settings
3. Add skills to your profile: `["React", "Design"]`
4. Save changes
5. Navigate to gig browser
6. Open filter panel
7. Verify recommendations appear

---

## Testing Authentication

The Firestore documents above are just user data. For actual login, you need Firebase Auth accounts:

### Option A: Create Auth Users Manually
1. Firebase Console → Authentication → Users
2. Click "Add User"
3. Use same emails as above:
   - react-dev@test.com (password: test123456)
   - designer@test.com (password: test123456)
   - etc.

### Option B: Use Existing Auth + Update Firestore
1. Log in with your existing test account
2. Note the user ID from Firebase Auth
3. Update the Firestore user document:
   - Find your user in `users` collection
   - Add/update the `skills` field: `["React", "JavaScript"]`
4. Refresh the app
5. Open filter panel
6. Verify recommendations

---

## Quick Verification Checklist

After creating test users:

### For User with Skills (e.g., react-dev@test.com):
- [ ] Log in successfully
- [ ] Navigate to gig browser homepage
- [ ] Open filter panel (click "Filters" on mobile or see sidebar on desktop)
- [ ] **VERIFY:** "💡 Based on Your Skills" section appears
- [ ] **VERIFY:** Recommended skills are relevant (TypeScript, Node.js, Design for React dev)
- [ ] **VERIFY:** User's existing skills (React, JavaScript) NOT shown
- [ ] **VERIFY:** "All Skills" heading appears below recommendations
- [ ] **VERIFY:** No duplicate skills between sections
- [ ] Check a recommended skill (e.g., TypeScript)
- [ ] **VERIFY:** Filtering works correctly
- [ ] **VERIFY:** Chip appears: "Skill: TypeScript"

### For User without Skills (e.g., no-skills@test.com):
- [ ] Log in successfully
- [ ] Navigate to gig browser
- [ ] Open filter panel
- [ ] **VERIFY:** NO "💡 Based on Your Skills" section
- [ ] **VERIFY:** Standard 8 skills display initially
- [ ] **VERIFY:** "Show All (15)" button works

---

## Skill Relationship Reference

Use this to verify recommendations are correct:

```
React → JavaScript, TypeScript, Node.js, Design
JavaScript → React, TypeScript, Node.js
TypeScript → React, JavaScript, Node.js
Node.js → JavaScript, TypeScript, React, Python
Python → Node.js, Data Entry, JavaScript

Design → React, JavaScript, Photography, Video Editing, Marketing
Photography → Video Editing, Design, Marketing
Video Editing → Photography, Design, Marketing

Marketing → Writing, Design, Photography, Customer Service
Writing → Marketing, Customer Service, Data Entry
Customer Service → Marketing, Writing, Data Entry

Construction → Transportation, Cleaning
Cleaning → Construction, Customer Service
Transportation → Construction, Cleaning

Data Entry → Writing, Customer Service, Python
```

---

## Troubleshooting

### "No recommendations showing for user with skills"
**Check:**
1. User document has `skills` field (array type)
2. Skills match available skills exactly (case-sensitive: "React" not "react")
3. User is actually logged in (check DevTools → Application → Firebase Auth)
4. `currentUser` prop is being passed to FilterPanel

### "Can't log in with test user"
**Fix:**
1. Create Firebase Auth account with same email
2. OR use existing auth account and update Firestore document

### "Skills field not appearing in Firestore"
**Fix:**
When creating document, make sure to:
1. Click "+ Add field"
2. Field name: `skills`
3. Type: Select "array" from dropdown
4. Click "Add item" for each skill
5. Type: "string" for each item

### "Script fails with credentials error"
**Fix:**
```bash
# Method 1: Service account key
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"

# Method 2: gcloud auth
gcloud auth application-default login

# Method 3: Use emulator (if running local)
export FIRESTORE_EMULATOR_HOST="localhost:8080"
```

---

## Cleanup

After testing, remove test users:

### Using Script:
```bash
node scripts/create-test-users.js --cleanup
```

### Manually:
1. Firestore Console → `users` collection
2. Filter by `isTestUser == true`
3. Delete all matching documents
4. Authentication → Users → Delete test users

---

## Ready to Test!

Once users are created, follow the **Focused Manual Testing Checklist** in `/tmp/focused_manual_testing.md`

**Priority test:** Log in as `react-dev@test.com` and verify recommendations show JavaScript, TypeScript, Node.js, Design.
