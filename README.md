# GigSA - South African Gig Economy Platform

A modern web application built with Next.js 15, TypeScript, Tailwind CSS, and Firebase for connecting job seekers and employers in South Africa's gig economy.

## Features

- 🔐 **Firebase Authentication** - Secure user registration and login
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Clean design with Tailwind CSS
- 🔥 **Firebase Integration** - Real-time database with Firestore
- 👥 **User Types** - Support for both job seekers and employers
- 🇿🇦 **South African Focus** - Designed for the local market

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication & Firestore)
- **Deployment**: Ready for Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gig-sa-claude-code
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication and Firestore Database
   - Copy your Firebase configuration

4. **Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Firebase Setup

### Authentication
Enable the following sign-in methods in Firebase Console:
- Email/Password

### Firestore Database
The app uses the following collections:
- `users` - User profiles and information
- `gigs` - Job postings and gig details
- `applications` - Gig applications
- `reviews` - User reviews and ratings

### Security Rules
Set up Firestore security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Allow others to read basic profile info
    }

    // Gigs are readable by all authenticated users
    match /gigs/{gigId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.employerId;
    }

    // Applications
    match /applications/{applicationId} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == resource.data.applicantId ||
         request.auth.uid == resource.data.employerId);
    }

    // Reviews
    match /reviews/{reviewId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.reviewerId;
    }
  }
}
```

## Project Structure

```
├── app/                    # Next.js 15 App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── ui/               # Reusable UI components
│   └── Dashboard.tsx     # Main dashboard
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── lib/                  # Utility libraries
│   ├── auth/            # Authentication services
│   ├── database/        # Database services
│   └── firebase.ts     # Firebase configuration
├── types/               # TypeScript type definitions
│   ├── auth.ts         # Authentication types
│   └── gig.ts          # Gig-related types
└── utils/              # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## User Types

### Job Seekers
- Browse and search for gigs
- Apply for opportunities
- Build profile and skills
- Receive ratings and reviews

### Employers
- Post gig opportunities
- Review applications
- Hire talent
- Rate and review workers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please create an issue in the repository.