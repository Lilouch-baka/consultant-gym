import { useApp } from './state.jsx';
import { useRoute } from './router.js';
import { Spinner, TabBar } from './components/ui.jsx';
import Today from './screens/Today.jsx';
import { Layers, LayerDetail } from './screens/Layers.jsx';
import Session from './screens/Session.jsx';
import Progress from './screens/Progress.jsx';
import Mentor from './screens/Mentor.jsx';
import Challenge from './screens/Challenge.jsx';
import RatioTree from './screens/RatioTree.jsx';
import Settings from './screens/Settings.jsx';

const ROUTES = {
  '/': { C: Today, tab: '/' },
  '/layers': { C: Layers, tab: '/layers' },
  '/layer': { C: LayerDetail, tab: '/layers' },
  '/tree': { C: RatioTree, tab: '/layers' },
  '/mentor': { C: Mentor, tab: '/mentor' },
  '/challenge': { C: Challenge, tab: null },
  '/progress': { C: Progress, tab: '/progress' },
  '/settings': { C: Settings, tab: null },
  '/session': { C: Session, tab: null },
};

export default function App() {
  const { ready } = useApp();
  const route = useRoute();
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
