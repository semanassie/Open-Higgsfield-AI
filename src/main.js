import './style.css';
import { Header } from './components/Header.js';
import { ImageStudio } from './components/ImageStudio.js';

const app = document.querySelector('#app');
let contentArea;
let currentPage = null;

const PAGES = new Set([
  'image', 'video', 'cinema', 'director', 'audio', 'lipsync',
  'workflows', 'agents', 'mcp-cli', 'vfx',
]);

function pageFromLocation() {
  const raw = (location.hash || '').replace(/^#\/?/, '').split(/[/?#]/)[0];
  return PAGES.has(raw) ? raw : 'workflows';
}

function markNav(page) {
  document.querySelectorAll('nav a[data-page]').forEach((el) => {
    const active = el.dataset.page === page;
    el.classList.toggle('text-white', active);
    const dot = el.querySelector('[data-nav-dot]');
    if (dot) dot.hidden = !active;
  });
}

// Router. Desktop window loads dist/index.html#workflows (not /studio/workflows).
function navigate(page) {
  if (!contentArea) return;
  if (!PAGES.has(page)) page = 'workflows';
  if (currentPage === page) return;
  currentPage = page;
  const nextHash = `#${page}`;
  if (location.hash !== nextHash) location.hash = nextHash;
  markNav(page);
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
  } else if (page === 'director') {
    import('./components/DirectorStudio.js').then(({ DirectorStudio }) => {
      contentArea.appendChild(DirectorStudio());
    });
  } else if (page === 'audio') {
    import('./components/AudioStudio.js').then(({ AudioStudio }) => {
      contentArea.appendChild(AudioStudio());
    });
  } else if (page === 'lipsync') {
    import('./components/LipSyncStudio.js').then(({ LipSyncStudio }) => {
      contentArea.appendChild(LipSyncStudio());
    });
  } else if (page === 'workflows') {
    import('./components/WorkflowStudio.js').then(({ WorkflowStudio }) => {
      contentArea.appendChild(WorkflowStudio());
    });
  } else if (page === 'agents') {
    import('./components/AgentStudio.js').then(({ AgentStudio }) => {
      contentArea.appendChild(AgentStudio());
    });
  } else if (page === 'mcp-cli') {
    import('./components/McpCliStudio.js').then(({ McpCliStudio }) => {
      contentArea.appendChild(McpCliStudio());
    });
  } else if (page === 'vfx') {
    import('./components/VfxStudio.js').then(({ VfxStudio }) => {
      contentArea.appendChild(VfxStudio());
    });
  }
}

app.innerHTML = '';
const initialPage = pageFromLocation();
app.appendChild(Header(navigate, initialPage));

contentArea = document.createElement('main');
contentArea.id = 'content-area';
contentArea.className = 'flex-1 relative w-full overflow-hidden flex flex-col bg-app-bg';
app.appendChild(contentArea);

navigate(initialPage);

window.addEventListener('hashchange', () => {
  navigate(pageFromLocation());
});

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
