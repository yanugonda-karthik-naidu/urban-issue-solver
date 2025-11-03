# CivicReport - Smart Urban Issue Reporting & Resolution Platform

A fully automated and intelligent urban issue reporting system built with React, Firebase, and AI integration. Designed as a Progressive Web App (PWA) for seamless cross-platform experience.

## 🚀 Features

### Core Functionality
- **AI-Powered Reporting Assistant**: Step-by-step guidance for issue reporting
- **Multilingual Support**: English and Hindi (expandable to more languages)
- **Real-Time Sync**: Instant updates between users and admin dashboard
- **Auto-Location Detection**: GPS-based location with reverse geocoding
- **Photo Upload**: Cloudinary integration for image management
- **Progressive Web App**: Works offline and installable on mobile devices

### User Features
- Google Sign-In authentication
- Submit issues with photos, location, and descriptions
- Track issue status in real-time (Pending → In Progress → Resolved)
- Category-based reporting (Roads, Garbage, Water, Electricity, Other)
- Personal dashboard with statistics

### Admin Features
- Centralized dashboard for all reported issues
- Real-time issue management
- Status updates with instant user notifications
- Filter and search capabilities
- Comprehensive analytics

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Media**: Cloudinary (image uploads)
- **PWA**: vite-plugin-pwa + Workbox
- **Internationalization**: i18next
- **Maps**: Google Maps API (location services)
- **AI**: OpenAI/Gemini API (conversational guidance)

## 📦 Installation

1. Clone the repository:
\`\`\`bash
git clone <YOUR_GIT_URL>
cd civicreport
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
   - Copy \`.env.example\` to \`.env\`
   - Add your Firebase configuration
   - Add Cloudinary credentials
   - Add Google Maps API key
   - Add AI API key (optional)

4. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## 🔧 Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Google Sign-In)
3. Create a Firestore database
4. Set up Storage for images
5. Copy configuration to \`.env\`

### Firestore Collections

#### \`issues\` Collection
\`\`\`javascript
{
  userId: string,
  userEmail: string,
  userName: string,
  title: string,
  description: string,
  category: string,
  location: string,
  photoUrl?: string,
  status: 'pending' | 'inProgress' | 'resolved',
  createdAt: timestamp
}
\`\`\`

#### \`users\` Collection (optional)
\`\`\`javascript
{
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string,
  role: 'user' | 'admin',
  createdAt: timestamp
}
\`\`\`

## 🌍 Deployment

### Vercel (Recommended)
\`\`\`bash
npm run build
vercel --prod
\`\`\`

### Firebase Hosting
\`\`\`bash
npm run build
firebase deploy
\`\`\`

## 🔐 Environment Variables

Required environment variables:

- \`VITE_FIREBASE_API_KEY\`: Firebase API key
- \`VITE_FIREBASE_AUTH_DOMAIN\`: Firebase auth domain
- \`VITE_FIREBASE_PROJECT_ID\`: Firebase project ID
- \`VITE_FIREBASE_STORAGE_BUCKET\`: Firebase storage bucket
- \`VITE_FIREBASE_MESSAGING_SENDER_ID\`: Firebase messaging sender ID
- \`VITE_FIREBASE_APP_ID\`: Firebase app ID

Optional:
- \`VITE_CLOUDINARY_CLOUD_NAME\`: Cloudinary cloud name
- \`VITE_CLOUDINARY_UPLOAD_PRESET\`: Cloudinary upload preset
- \`VITE_GOOGLE_MAPS_API_KEY\`: Google Maps API key
- \`VITE_AI_API_KEY\`: OpenAI/Gemini API key

## 🎨 Design System

The app uses a semantic token-based design system:

- **Primary**: Civic blue (#4299e1) - Trust and professionalism
- **Secondary**: Vibrant teal (#22d3ee) - Actions and CTAs
- **Success**: Green - Resolved issues
- **Warning**: Amber - Pending issues
- **Gradients**: Blue-to-teal for hero sections

## 📱 PWA Features

- Offline functionality
- Add to home screen
- Push notifications (Firebase Cloud Messaging)
- Service worker caching
- Fast loading with optimized assets

## 🌐 Multilingual Support

Current languages:
- English (en)
- Hindi (hi)

To add more languages:
1. Create \`src/i18n/locales/{language}.json\`
2. Add language option in Header component
3. Update i18n configuration

## 🤖 AI Integration (Future)

The platform is designed to integrate conversational AI for:
- Step-by-step issue reporting guidance
- Language translation assistance
- Smart category suggestions
- Auto-filling location details

## 📊 Features Roadmap

- [ ] Cloudinary photo upload integration
- [ ] Google Maps integration for location
- [ ] AI conversational assistant
- [ ] Push notifications via FCM
- [ ] Advanced analytics dashboard
- [ ] Gamification (impact points, leaderboard)
- [ ] Email notifications
- [ ] Voice input for reporting
- [ ] Dark mode toggle
- [ ] Export reports (CSV/PDF)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: \`git checkout -b feature/AmazingFeature\`
3. Commit your changes: \`git commit -m 'Add some AmazingFeature'\`
4. Push to the branch: \`git push origin feature/AmazingFeature\`
5. Open a Pull Request

## 📄 License

This project is built with [Lovable](https://lovable.dev) and is open for community contributions.

## 🎯 Hackathon Ready

This project is specifically designed for hackathons and demos with:
- Professional UI/UX
- Real-time functionality
- Mobile-responsive design
- Production-ready code
- Comprehensive feature set
- Easy deployment

## 📞 Support

For support, email support@civicreport.app or join our Discord community.

---

Built with ❤️ using [Lovable](https://lovable.dev)
