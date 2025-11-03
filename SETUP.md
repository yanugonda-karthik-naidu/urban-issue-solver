# CivicReport Setup Guide

## Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Authentication:
   - Navigate to Authentication > Sign-in method
   - Enable Google Sign-in provider
4. Create Firestore Database:
   - Navigate to Firestore Database
   - Click "Create database"
   - Choose production mode
   - Select your region
5. Enable Storage:
   - Navigate to Storage
   - Click "Get started"
6. Get your Firebase config:
   - Go to Project Settings
   - Scroll to "Your apps" section
   - Click on the web app (</>) icon
   - Copy the configuration

### 3. Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`env
# Firebase Configuration (Required)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary (Optional - for image uploads)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Google Maps API (Optional - for enhanced location features)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# AI Integration (Optional - for conversational assistant)
VITE_AI_API_KEY=your_openai_or_gemini_api_key
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:8080\` in your browser.

## Optional Integrations

### Cloudinary Setup (Image Uploads)

1. Create account at [Cloudinary](https://cloudinary.com/)
2. Go to Settings > Upload
3. Add an upload preset (unsigned)
4. Copy cloud name and preset name to \`.env\`

### Google Maps API (Location Services)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Create API key with domain restrictions
4. Add to \`.env\`

### AI Integration (Optional)

Choose either OpenAI or Google Gemini:

**OpenAI:**
1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to \`.env\` as \`VITE_AI_API_KEY\`

**Google Gemini:**
1. Get API key from [Google AI Studio](https://makersuite.google.com/)
2. Add to \`.env\` as \`VITE_AI_API_KEY\`

## Firebase Security Rules

### Firestore Rules

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Issues collection
    match /issues/{issueId} {
      // Anyone can read issues
      allow read: if true;
      
      // Only authenticated users can create issues
      allow create: if request.auth != null;
      
      // Users can update their own issues
      allow update: if request.auth != null && 
                      (request.auth.uid == resource.data.userId ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      // Only admins can delete issues
      allow delete: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

### Storage Rules

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /issues/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
\`\`\`

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Firebase Hosting

\`\`\`bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
\`\`\`

## Testing

### Local Testing

1. Sign in with Google
2. Report a test issue
3. Check dashboard for real-time updates
4. Test admin panel (access \`/admin\`)

### PWA Testing

1. Open Chrome DevTools
2. Go to Application tab
3. Check Service Workers
4. Test "Add to Home Screen"

## Troubleshooting

### Firebase Connection Issues
- Verify all environment variables are correct
- Check Firebase project settings
- Ensure Authentication and Firestore are enabled

### Build Errors
- Clear node_modules and reinstall: \`rm -rf node_modules && npm install\`
- Clear cache: \`npm run build -- --force\`

### PWA Not Working
- HTTPS required for PWA features
- Check manifest.json is accessible
- Verify service worker registration

## Support

For issues or questions:
- Check [Firebase Documentation](https://firebase.google.com/docs)
- Visit [Lovable Documentation](https://docs.lovable.dev)
- Join community Discord

---

Built with ❤️ using Lovable
