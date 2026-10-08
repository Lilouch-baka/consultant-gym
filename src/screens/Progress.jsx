import { useMemo, useState } from 'react';
import { useApp, currentStreak } from '../state.jsx';
import { navigate } from '../router.js';
import { computeStats, pct } from '../engine/stats.js';
import { ProgressBar, ScreenHeader } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { exportProgress } from '../storage/backup.js';

export default function Progress() {
  const app = useApp();
  const { questions, reviews, meta } = app;
  const stats = useMemo(() => computeStats(questions, reviews), [questions, reviews]);
  const [msg, setMsg] = useState('');
  const daysSinceExport = meta.lastExport ? Math.floor((Date.now() - meta.lastExport) / 86400000) : null;
  const showExportReminder = stats.totalAnswered > 0 && (daysSinceExport === null || daysSinceExport >= 7);

  const diffs = [
    { key: 'easy', label: 'Easy' },
    { key: 'medium', label: 'Medium' },
    { key: 'hard', label: 'Hard' },
  ];
  // Green when strong, navy in the middle, red when weak.
  const barColor = (v) => (v === null || v === undefined ? undefined : v >= 0.7 ? 'var(--bar-easy)' : v >= 0.4 ? 'var(--bar-medium)' : 'var(--bar-hard)');

  async function onExport() {
    try {
      const how = await exportProgress(app);
      setMsg(how === 'shared' ? 'Export shared.' : 'Export downloaded.');
    } catch (e) {
      if (e?.name !== 'AbortError') setMsg(`Export failed: ${e.message}`);
    }
  }

  return (
    <div className="screen with-tabs">
      <ScreenHeader eyebrow="Last 30 days" title="Progress" />

      <div className="grid-3">
        <div className="stat">
          <div className="value">{currentStreak(meta)}</div>
          <div className="caption" style={{ fontSize: 12 }}>
            day streak
          </div>
        </div>
        <div className="stat">
          <div className="value">{pct(stats.accuracy)}</div>
          <div className="caption" style={{ fontSize: 12 }}>
            accuracy
          </div>
        </div>
        <div className="stat">
          <div className="value">{stats.avgMentalMs ? `${Math.round(stats.avgMentalMs / 1000)} s` : '–'}</div>
          <div className="caption" style={{ fontSize: 12 }}>
            avg mental math
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, gap: 14 }}>
        <h2 className="h3">Accuracy by difficulty</h2>
        {diffs.map((d) => (
          <div className="row" key={d.key} style={{ gap: 10 }}>
            <div style={{ width: 64, fontSize: 14, color: 'var(--text-2)' }}>{d.label}</div>
            <div style={{ flex: 1 }}>
              <ProgressBar value={stats.byDifficulty[d.key] || 0} height={10} color={barColor(stats.byDifficulty[d.key])} label={`${d.label} accuracy`} />
            </div>
            <div className="mono" style={{ fontSize: 14, width: 40, textAlign: 'right' }}>
              {pct(stats.byDifficulty[d.key])}
            </div>
          </div>
        ))}
        <div className="caption" style={{ fontSize: 12 }}>
          {stats.attempts} answers in the last 30 days · {stats.totalAnswered} all time
        </div>
      </div>

      <div className="stack">
        <div className="row-between">
          <h2 className="h2">Weakest 5 topics</h2>
          <div className="caption">mastery</div>
        </div>
        {stats.weakest.map((t) => (
          <div key={t.id} className="row-card" style={{ padding: '10px 10px 10px 14px' }}>
            <div className="stack" style={{ flex: 1, gap: 2 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{t.name}</div>
              <div className="caption" style={{ fontSize: 12 }}>
                L{t.layer} · {t.layerShort}
                {t.attempts === 0 ? ' · not started' : ''}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 14 }}>
              {pct(t.mastery)}
            </div>
            <button className="btn sm primary" onClick={() => navigate('/session', { mode: 'topic', topic: t.id })}>
              Drill
            </button>
          </div>
        ))}
      </div>

      {showExportReminder && (
        <div className="notice">
          {daysSinceExport === null ? 'You have never exported your progress.' : `Last export ${daysSinceExport} days ago.`} iPhone storage can be cleared by
          Safari, so export regularly and keep the file in iCloud Drive.
        </div>
      )}
      <button className="btn lg" onClick={onExport}>
        <Icon name="download" size={18} /> Export progress (JSON)
      </button>
      {msg && (
        <div className="caption" role="status">
          {msg}
        </div>
      )}
      <button className="btn" onClick={() => navigate('/settings')}>
        <Icon name="settings" size={18} /> Settings and import
      </button>
    </div>
  );
}
