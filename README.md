# GigSA - South Africa's Inclusive Gig Economy Platform

A modern, responsive web platform designed to empower South Africa's informal sector workers and unemployed population through secure, accessible work opportunities. Built with enhanced safety features to create trust in South Africa's challenging environment while maintaining barrier-free access for all.

## 🌍 **Mission: Inclusive Employment Through Safe Opportunities**

GigSA empowers all South Africans - from informal sector workers to professionals - by providing:
- **Informal sector focus** - Built specifically for SA's underserved informal economy
- **Barrier-free access** - Accessible to all via smartphone with context-aware UX
- **Trust & Safety** - Enhanced security features addressing SA's unique challenges
- **Skills development** - Integrated learning hub for practical and employability skills
- **True inclusion** - No age restrictions, welcoming to all seeking work opportunities

## 🚀 Current Status

**✅ Full-Featured Gig Economy Platform with Mobile PWA!**
- Complete application system with gig posting, applications, and tracking
- Comprehensive profile management with portfolio uploads and photo capabilities
- Real-time messaging system with conversation archiving
- Mobile-first navigation with PWA installation support
- Context-aware UX that adapts to informal vs professional workers
- Authentication system working with Firebase
- Public gig browsing with real-time application functionality
- Role-based dashboards for job seekers and employers
- Responsive design with Tailwind CSS v4 and enhanced mobile interactions
- Comprehensive error handling and loading states

## 🎯 Features

### ✅ **Implemented Features**

#### **Core Platform**
- **🔐 User Authentication**: Firebase-powered registration and login
- **👥 Role-based Access**: Separate experiences for job seekers and employers
- **🌐 Public Gig Browser**: Browse gigs without authentication required
- **📱 Responsive Design**: Mobile-first, works on all devices
- **🎨 Modern UI**: Professional design with Tailwind CSS v4
- **🔄 Smooth Navigation**: Seamless transitions between pages
- **⚡ Error Handling**: Graceful error boundaries and fallbacks
- **🔍 Search & Filter**: Filter gigs by category and search terms

#### **Gig Management**
- **📝 Gig Posting**: Employers can create and manage job postings
- **🏷️ Context-Aware Forms**: Different fields for digital vs physical work
- **📊 Gig Categories**: Technology, Design, Writing, Marketing, Construction, Transportation, Cleaning, Healthcare, Other
- **💰 Budget Management**: Flexible pricing with minimum R100 validation
- **📅 Duration Tracking**: From 1 day to 6+ months or ongoing projects

#### **Application System**
- **📋 Apply for Gigs**: Job seekers can submit applications with one click
- **📱 Application Tracking**: "My Applications" dashboard for job seekers
- **👔 Application Management**: "View Applications" dashboard for employers
- **🔄 Status Updates**: Real-time pending → accepted/rejected workflow
- **📊 Application Analytics**: Stats and summary for both user types

#### **Informal Economy Accessibility**
- **🗣️ Simplified Language**: "Tell us about yourself" vs "Cover Letter" for physical work
- **📋 Quick Selection**: Dropdowns for experience, availability, equipment
- **🎯 Category-Specific Guidance**: Different examples for cleaning, construction, etc.
- **✅ Optional Fields**: Reduced validation for informal work categories
- **💡 Smart Tips**: Context-aware application guidance

#### **Profile Management**
- **👤 Complete Profile System**: Comprehensive user profiles with skills, portfolio, and photo uploads
- **📸 Profile Photo Upload**: Professional photo upload with Firebase Storage integration
- **💼 Portfolio Management**: Showcase work with image uploads and project details
- **🎯 Context-Aware Experience**: Different UX for informal vs professional workers
- **📋 Skills & Certifications**: Skills management with language support
- **💰 Experience & Rates**: Set hourly rates, availability, and experience levels
- **📊 Profile Completeness**: Real-time progress tracking with actionable suggestions
- **🔧 Work Sector Selection**: Choose work type during signup for immediate context

#### **Messaging System**
- **💬 Real-time Messaging**: Direct communication between employers and job seekers
- **🔔 Unread Message Indicators**: Visual badges showing unread message counts
- **📱 Responsive Chat Interface**: Mobile-friendly messaging with typing indicators
- **🗂️ Conversation Management**: Organized conversations linked to specific gigs
- **⚡ Contextual Messaging**: Quick message buttons throughout the application flow
- **📋 Message History**: Persistent conversation history with date grouping
- **🔄 Auto-scroll & Real-time Updates**: Seamless message delivery and display
- **📦 Archive Conversations**: Archive/unarchive conversations for better organization

#### **Mobile Navigation & PWA Features**
- **📱 Mobile Hamburger Menu**: Responsive slide-out navigation with smooth animations
- **👆 Enhanced Touch Interactions**: 44px touch targets with active state feedback
- **⚡ Progressive Web App**: PWA manifest and service worker for app installation
- **📲 Mobile-First Design**: Optimized responsive layouts for all screen sizes
- **🎯 Touch-Optimized UI**: Better mobile interactions with proper touch handling
- **🔧 Offline Support**: Basic caching and offline capabilities through service worker

#### **Demo & Testing**
- **💾 Demo Data**: 6 realistic South African gigs including cleaning examples
- **🧪 Test Accounts**: Both job seeker and employer registration flows
- **📍 SA Locations**: Pre-configured South African cities and remote options

### 🚧 **Planned Features** (Next Development Phase)

#### **Safety & Inclusion (Priority)**
- **🛡️ Progressive Verification**: ID verification system with subsidized background checks for informal workers
- **👥 Emergency Contacts**: Safety network linking to family/friends for all users
- **📍 Safe Meeting Locations**: Public space recommendations for secure gig meetings
- **🆘 Check-in System**: Simple safety notifications during active gigs
- **🎓 Enhanced Skills Hub**: 50+ micro-learning modules for informal sector and professional development
- **💰 Financial Literacy**: Banking basics and money management for first-time earners
- **🌍 Multi-language Support**: Safety and skills content in SA's major languages

#### **Platform Enhancement**
- **💳 Payment Integration**: Secure payment processing with escrow for completed work
- **⭐ Review System**: Rating and feedback system for completed gigs
- **🔍 Advanced Search**: Location-based matching with safety zone filtering
- **📊 Impact Analytics**: Employment outcome tracking and skills development metrics
- **🔔 Safety Notifications**: Real-time safety alerts and emergency response system
- **📧 Community Integration**: Optional community safety networks and peer support
- **📱 Mobile App**: React Native app optimized for entry-level smartphones
- **🗺️ Location Services**: GPS-based matching with community safety mapping
- **📄 Document Upload**: Accessible ID verification and skills certification
- **🏆 Skills Verification**: Badges and micro-credentials for employability

## 🛠 Tech Stack

- **Frontend**: Next.js 15 with TypeScript & App Router
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Authentication**: Firebase Auth with Firestore user profiles
- **Database**: Cloud Firestore for scalable data storage
- **File Storage**: Firebase Storage for photos and portfolio images
- **State Management**: React Context API
- **Error Handling**: React Error Boundaries
- **Development**: Hot reload, TypeScript checking, ESLint

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

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

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication → Email/Password provider
   - Enable Firestore Database
   - Enable Firebase Storage for file uploads
   - Add your domain to authorized domains in Authentication settings
   - Configure Storage CORS for development (see `cors.json` in project root)

4. **Set up environment variables**
Copy `.env.local.example` to `.env.local` and add your Firebase config:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 📁 Project Structure

```
├── app/                           # Next.js 15 app directory
│   ├── globals.css               # Tailwind CSS v4 + custom theme
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Home page with routing logic
├── components/                    # React components
│   ├── application/              # Application system components
│   │   ├── ApplicationForm.tsx   # Context-aware application submission
│   │   ├── MyApplications.tsx    # Job seeker application tracking
│   │   └── ManageApplications.tsx # Employer application management
│   ├── auth/                     # Authentication UI
│   │   ├── AuthPage.tsx          # Login/signup page
│   │   ├── LoginForm.tsx         # Login form component
│   │   └── RegisterForm.tsx      # Registration form with work sector selection
│   ├── gig/                      # Gig management components
│   │   ├── PostGigForm.tsx       # Context-aware gig posting form
│   │   └── PostGigPage.tsx       # Gig posting with success flow
│   ├── layout/                   # Layout and navigation components
│   │   ├── AppLayout.tsx         # Main application layout with navigation
│   │   ├── GlobalHeader.tsx      # Global header with mobile menu integration
│   │   ├── MobileMenu.tsx        # Mobile hamburger menu with slide-out navigation
│   │   └── PageHeader.tsx        # Page headers with breadcrumbs and actions
│   ├── messaging/                # Real-time messaging system
│   │   ├── MessagingHub.tsx      # Main messaging interface with responsive design
│   │   ├── ConversationList.tsx  # List of user conversations with unread indicators
│   │   ├── ChatWindow.tsx        # Individual conversation chat interface
│   │   ├── MessageList.tsx       # Message display with date grouping
│   │   ├── MessageInputForm.tsx  # Message composition with file support
│   │   └── QuickMessageButton.tsx # Context-aware messaging buttons
│   ├── profile/                  # Profile management components
│   │   ├── ProfileManagement.tsx # Main profile management hub
│   │   ├── BasicInfoForm.tsx     # Personal information and social links
│   │   ├── ProfilePhotoUpload.tsx # Profile photo upload with guidelines
│   │   ├── SkillsForm.tsx        # Skills, languages, and certifications
│   │   ├── PortfolioManager.tsx  # Portfolio management with context-aware categories
│   │   ├── ExperienceForm.tsx    # Experience, rates, and availability
│   │   └── ProfileCompleteness.tsx # Progress tracking and suggestions
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx            # Custom button component with mobile touch optimization
│   │   ├── Card.tsx              # Card layout component with responsive spacing
│   │   ├── Breadcrumb.tsx        # Navigation breadcrumb component
│   │   ├── Input.tsx             # Form input component
│   │   └── Loading.tsx           # Loading spinner component
│   ├── Dashboard.tsx             # User dashboard (role-based)
│   ├── PublicGigBrowser.tsx      # Public gig browsing interface
│   └── ErrorBoundary.tsx         # Error boundary component
├── contexts/                      # React contexts
│   ├── AuthContext.tsx           # Authentication state management
│   └── MessagingContext.tsx      # Real-time messaging state management
├── lib/                          # Core business logic
│   ├── auth/                     # Authentication services
│   │   └── firebase.ts           # Firebase auth integration
│   ├── database/                 # Database operations
│   │   ├── firestore.ts          # Generic Firestore service
│   │   ├── gigService.ts         # Gig and application operations
│   │   ├── profileService.ts     # Profile and file upload operations
│   │   └── messagingService.ts   # Real-time messaging operations
│   ├── utils/                    # Utility functions
│   │   └── userProfile.ts        # Context-aware profile configuration
│   └── firebase.ts               # Firebase configuration with Storage
├── public/                       # Static assets and PWA files
│   ├── manifest.json             # PWA manifest for app installation
│   ├── sw.js                     # Service worker for offline capabilities
│   └── browserconfig.xml         # Windows tile configuration
└── types/                        # TypeScript definitions
    ├── auth.ts                   # Auth-related types
    ├── gig.ts                    # Gig and application types
    └── messaging.ts              # Messaging and conversation types
```

## 🎨 Key Design Decisions

### Market Positioning
- **Informal sector focus**: Specifically addressing SA's underserved informal economy workers
- **Safety-enhanced platform**: Enhanced security features for high-crime environment
- **True accessibility**: Barrier-free entry for workers without formal CVs or experience
- **Skills development**: Integrated learning hub for practical and employability skills
- **South African context**: ZAR pricing, local cities, and informal economy realities

### Authentication Flow
- **Public-first approach**: Browse gigs without signup required
- **Role-based registration**: Job seekers vs employers get different dashboards
- **Seamless navigation**: Easy switching between public browsing and authenticated features

### Informal Economy Accessibility
- **Context-aware forms**: Different UX for digital vs physical work
- **Simplified language**: "Tell us about yourself" vs "Cover Letter"
- **Reduced barriers**: Optional fields, dropdown selections, minimal validation
- **Category-specific guidance**: Tailored examples for cleaning, construction, etc.

### Technical Architecture
- **Tailwind CSS v4**: Latest version with `@theme` configuration in CSS
- **Firebase integration**: Authentication + Firestore for scalable data management
- **TypeScript throughout**: Type safety for robust development
- **Error boundaries**: Graceful handling of runtime errors
- **Demo data fallback**: Functional experience even without Firebase setup
- **Component modularity**: Reusable, context-aware form components

## 🧪 Testing the Application

### Basic Platform Testing
1. **Public browsing**: Visit homepage to see 6 demo gigs (including cleaning example)
2. **User registration**: Click "Sign Up" to create job seeker/employer account
3. **Role-based dashboards**: Login to see different interfaces based on user type
4. **Search functionality**: Try filtering gigs by category and search terms

### Application System Testing
5. **Apply for gigs**: As job seeker, click "Apply" on any gig to test application flow
6. **Compare form types**: Apply to cleaning gig vs tech gig to see context-aware forms
7. **Track applications**: Use "My Applications" to see submitted applications with status
8. **Manage applications**: As employer, use "View Applications" to accept/reject

### Gig Posting Testing
9. **Post digital gig**: As employer, post a Technology/Design gig (skills required)
10. **Post informal gig**: Post a Cleaning/Construction gig (optional work description)
11. **Form adaptation**: Watch how form changes based on selected category

### Informal Economy Features
12. **Cleaning application**: Apply to "Weekly House Cleaning" gig to see simplified form
13. **Experience dropdowns**: Test dropdown selections for years, availability, equipment
14. **Language differences**: Compare "Tell us about yourself" vs "Cover Letter" prompts

### Messaging System Testing
15. **Message from gig browsing**: Click "Message" button on any gig card to start conversation
16. **Application messaging**: View applications as employer/job seeker to see message buttons
17. **Real-time conversations**: Open messages in dashboard, send messages between users
18. **Unread indicators**: Notice red badge counts in header and dashboard buttons
19. **Mobile responsive**: Test messaging interface on mobile devices
20. **Conversation persistence**: Refresh page to verify messages are saved
21. **Archive conversations**: Test archive/unarchive functionality in messaging hub

### Mobile Navigation & PWA Testing
22. **Mobile hamburger menu**: Test slide-out navigation on mobile devices (< 1024px width)
23. **Touch interactions**: Experience enhanced touch feedback on mobile buttons and links
24. **PWA installation**: Visit site on mobile Chrome/Safari to see "Add to Home Screen" prompt
25. **Responsive layouts**: Test all components at different screen sizes (320px - 1920px)
26. **Offline functionality**: Test basic offline capabilities after installation
27. **Navigation breadcrumbs**: Use breadcrumbs for navigation across different pages

## 🔧 Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🚀 Deployment

Ready for deployment to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Firebase Hosting**

Ensure environment variables are configured in your deployment platform.

## 📋 Development Roadmap

### High Priority (Youth Empowerment Focus)
- [ ] **Progressive verification system** for youth safety and trust building
- [ ] **Emergency contact integration** for family safety networks
- [ ] **Safe meeting location suggestions** with public space recommendations
- [ ] **Skills hub expansion** with youth development modules
- [ ] **Firestore security rules** implementation for production
- [ ] **Payment integration** with escrow for completed work

### Medium Priority (Platform Enhancement)
- [ ] **Background check integration** (subsidized for youth users)
- [ ] **Check-in safety system** for active gigs
- [ ] **Youth analytics dashboard** for employment impact tracking
- [ ] **Review and rating system** with trust building features
- [ ] **Advanced search filters** (location safety zones, skills matching)
- [ ] **File upload system** for youth-friendly ID verification

### Future Enhancements (Scale & Impact)
- [ ] **AI-powered safety monitoring** for platform interactions and risk assessment
- [ ] **Full multi-language platform** (Afrikaans, isiZulu, isiXhosa, Sesotho for complete accessibility)
- [ ] **Government integration** for national employment and skills development programs
- [ ] **Community partnerships** with NGOs, training centers, and local organizations
- [ ] **Employer verification** system for enhanced worker protection
- [ ] **Regional expansion** to other African informal economy markets
- [ ] **Impact measurement** tools for social and economic ROI tracking
- [ ] **Skills certification partnerships** with formal education institutions

## 🔧 Known Issues

- Warning about Next.js SWC dependencies (cosmetic, doesn't affect functionality)
- Demo data shown when Firebase database is empty (by design)

## 🔐 Firebase Security

### Firestore Security Rules (Recommended)
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For questions, suggestions, or issues:
- Open an issue in this repository
- Check the project documentation
- Review the demo data implementation for examples

---

## 🎯 Social Impact Goals

**Primary Mission**: Empower South Africa's informal sector workers and unemployed population through secure, accessible gig opportunities.

**Target Impact**:
- **50,000+ informal workers** earning sustainable income within 24 months
- **R240M+ economic impact** through worker earnings annually
- **Skills development** for 100,000+ people through integrated learning hub
- **Safe work environment** with <0.1% safety incidents per 1000 gigs
- **Community empowerment** in townships, rural areas, and informal settlements

**Key Metrics**:
- Informal sector employment rate increase in target communities
- Skills completion correlation with employment success and income growth
- Community and family acceptance of platform safety
- Time from registration to first paid gig (target: <7 days)
- Transition rate from informal gig work to formal employment or entrepreneurship

---

**Built with ❤️ for South Africa's informal sector workers and their communities** 🇿🇦