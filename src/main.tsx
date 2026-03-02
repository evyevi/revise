import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateFlashcardsToSM2 } from './lib/migrateFlashcardsToSM2'

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Run SM-2 migration asynchronously (non-blocking)
// This ensures existing flashcards are upgraded with SM-2 fields on app startup
migrateFlashcardsToSM2().catch((error) => {
  console.error('Failed to migrate flashcards to SM-2:', error);
  // Don't throw - continue with app even if migration fails
});

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
