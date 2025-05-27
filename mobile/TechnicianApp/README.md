# Technician Mobile App

A React Native mobile application for field service technicians to manage jobs, track locations, and communicate with the dispatch system.

## Features

- **Job Management**: View assigned jobs, update status, add notes
- **Interactive Map**: View job locations and navigate with GPS
- **Real-time Updates**: Sync with backend API for live job status
- **Location Tracking**: GPS tracking for technician location
- **Profile Management**: View stats and manage account settings

## Prerequisites

- Node.js 16+
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development)

## Installation

```bash
# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Configuration

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api'  // Development
  : 'https://your-production-api.com/api';  // Production
```

## Architecture

```
src/
├── components/     # Reusable UI components
├── screens/        # Main app screens
├── services/       # API and external services
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

## API Integration

The app integrates with the FSM backend API for:
- Authentication and user management
- Job data synchronization
- Location tracking
- File uploads (photos, documents)

## Permissions

The app requires the following permissions:
- Location access (for GPS tracking)
- Camera access (for job photos)
- Storage access (for file management)

## Development

```bash
# Start Metro bundler
npm start

# Run tests
npm test

# Lint code
npm run lint
```