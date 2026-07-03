import './style.css';
import { Header } from './components/Header.js';
import { ImageStudio } from './components/ImageStudio.js';

// Seed API key from .env so the auth modal never fires
if (import.meta.env.VITE_MUAPI_KEY && !localStorage.getItem('muapi_key')) {
  localStorage.setItem('muapi_key', import.meta.env.VITE_MUAPI_KEY);
}

const app = document.querySelector('#app');
let contentArea;

// Router
function navigate(page) {
  if (!contentArea) return;
  contentArea.innerHTML = '';

  if (page === 'image') {
    contentArea.appendChild(ImageStudio());
  } else if (page === 'video') {
    import('./components/VideoStudio.js').then(({ VideoStudio }) => {
      contentArea.appendChild(VideoStudio());
    });
  } else if (page === 'cinema') {
    import('./components/CinemaStudio.js').then(({ CinemaStudio }) => {
      contentArea.appendChild(CinemaStudio());
    });
  } else if (page === 'lipsync') {
    import('./components/LipSyncStudio.js').then(({ LipSyncStudio }) => {
      contentArea.appendChild(LipSyncStudio());
    });
  } else if (page === 'audio') {
    import('./components/AudioStudio.js').then(({ AudioStudio }) => {
      contentArea.appendChild(AudioStudio());
    });
  } else if (page === 'apps') {
    import('./components/AppsGallery.js').then(({ AppsGallery }) => {
      contentArea.appendChild(AppsGallery());
    });
  } else if (page === 'character') {
    import('./components/CharacterBuilder.js').then(({ CharacterBuilder }) => {
      contentArea.appendChild(CharacterBuilder());
    });
  } else if (page === 'assist') {
    import('./components/AssistChat.js').then(({ AssistChat }) => {
      contentArea.appendChild(AssistChat());
    });
  } else if (page === 'vibemotion') {
    import('./components/VibeMotion.js').then(({ VibeMotion }) => {
      contentArea.appendChild(VibeMotion());
    });
  } else if (page === 'influencer') {
    import('./components/AIInfluencer.js').then(({ AIInfluencer }) => {
      contentArea.appendChild(AIInfluencer());
    });
  } else if (page === 'edit') {
    import('./components/EditCanvas.js').then(({ EditCanvas }) => {
      contentArea.appendChild(EditCanvas());
    });
  } else if (page === 'seedance') {
    import('./components/SeedanceStudio.js').then(({ SeedanceStudio }) => {
      contentArea.appendChild(SeedanceStudio());
    });
  } else if (page === 'shorts') {
    import('./components/ShortsStudio.js').then(({ ShortsStudio }) => {
      contentArea.appendChild(ShortsStudio());
    });
  } else if (page === 'explainer') {
    import('./components/ExplainerStudio.js').then(({ ExplainerStudio }) => {
      contentArea.appendChild(ExplainerStudio());
    });
  }
}

app.innerHTML = '';
// Pass navigate to Header so links work
app.appendChild(Header(navigate));

contentArea = document.createElement('main');
contentArea.id = 'content-area';
contentArea.className = 'flex-1 relative w-full overflow-hidden flex flex-col bg-app-bg';
app.appendChild(contentArea);

// Initial Route
navigate('image');

// Event Listener for Navigation
window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'settings') {
    import('./components/SettingsModal.js').then(({ SettingsModal }) => {
      document.body.appendChild(SettingsModal());
    });
  } else {
    navigate(e.detail.page);
  }
});
