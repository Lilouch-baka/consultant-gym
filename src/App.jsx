import { useApp } from './state.jsx';
import { navigate, useRoute } from './router.js';
import { Spinner, TabBar } from './components/ui.jsx';
import Home from './screens/Home.jsx';
import Library from './screens/Library.jsx';
import { LayerDetail } from './screens/Layers.jsx';
import Session from './screens/Session.jsx';
import Progress from './screens/Progress.jsx';
import Mentor from './screens/Mentor.jsx';
import RatioTree from './screens/RatioTree.jsx';
import Settings from './screens/Settings.jsx';

const ROUTES = {
  '/': { C: Home, tab: '/' },
  '/library': { C: Library, tab: '/library' },
  '/layer': { C: LayerDetail, tab: '/library' },
  '/tree': { C: RatioTree, tab: '/library' },
  '/mentor': { C: Mentor, tab: '/mentor' },
  '/progress': { C: Progress, tab: '/progress' },
  '/settings': { C: Settings, tab: null },
  '/session': { C: Session, tab: null },
};

// Old bookmarks from the first version.
const REDIRECTS = { '/layers': '/library' };

export default function App() {
  const { ready } = useApp();
  const route = useRoute();
  if (REDIRECTS[route.path]) {
    navigate(REDIRECTS[route.path]);
    return null;
  }
  const r = ROUTES[route.path] || ROUTES['/'];

  if (!ready) {
    return (
      <div className="app">
        <div className="screen">
          <Spinner label="Loading your progress…" />
        </div>
      </div>
    );
  }

  const C = r.C;
  // Keyed by the full hash so a new session always starts fresh.
  return (
    <div className="app">
      <main>
        <C key={window.location.hash} params={route.params} />
      </main>
      {r.tab && <TabBar current={r.tab} />}
    </div>
  );
}
