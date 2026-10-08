import { useMemo } from 'react';
import { useApp, currentStreak } from '../state.jsx';
import { navigate } from '../router.js';
import { LAYERS } from '../data/curriculum.js';
import { dailyQueue, estimateMinutes } from '../engine/sessionBuilder.js';
import { computeStats, pct } from '../engine/stats.js';
import { ProgressBar } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

export default function Today() {
  const { questions, reviews, meta } = useApp();
  const queue = useMemo(() => dailyQueue(questions, reviews), [questions, reviews]);
  const stats = useMemo(() => computeStats(questions, reviews), [questions, reviews]);
  const split = { easy: 0, medium: 0, hard: 0 };
  queue.forEach((q) => (split[q.difficulty] += 1));
  const streak = currentStreak(meta);
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="screen with-tabs">
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 4 }}>
          <div className="eyebrow">
            {dateLabel}
            {meta.studyDays ? ` · Day ${meta.studyDays}` : ''}
          </div>
          <h1 className="title">Consultant Gym</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="pill" aria-label={`${streak} day streak`}>
            <Icon name="flame" size={14} stroke={2} />
            {streak}
          </div>
          <button className="icon-btn" aria-label="Settings" onClick={() => navigate('/settings')}>
            <Icon name="settings" size={20} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row-between">
          <div className="eyebrow" style={{ fontSize: 13, letterSpacing: '0.08em' }}>
            Daily review
          </div>
          <div className="caption">~{queue.length ? estimateMinutes(queue) : 0} min</div>
        </div>
        <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
          <div className="mono" style={{ fontSize: 52, fontWeight: 500, lineHeight: 1 }}>
            {queue.length}
          </div>
          <div style={{ fontSize: 16, color: 'var(--text-2)' }}>cards due</div>
        </div>
        <div className="chips">
          <div className="chip">{split.easy} easy</div>
          <div className="chip">{split.medium} med</div>
          <div className="chip">{split.hard} hard</div>
        </div>
        <button className="btn lg primary" disabled={!queue.length} onClick={() => navigate('/session', { mode: 'daily' })}>
          {queue.length ? 'Start review' : 'All done for today'}
        </button>
      </div>

      <div className="stack">
        <div className="row-between">
          <h2 className="h2">Layers</h2>
          <div className="caption">mastery</div>
        </div>
        {LAYERS.map((l) => (
          <button key={l.id} className="row-card" onClick={() => navigate('/layer', { id: l.id })}>
            <div className="mono" style={{ fontSize: 13, color: 'var(--accent)', width: 18 }}>
              {String(l.id).padStart(2, '0')}
            </div>
            <div className="stack" style={{ flex: 1, gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{l.name}</div>
              <ProgressBar value={stats.layerMastery[l.id]} label={`${l.name} mastery`} />
            </div>
            <div className="mono" style={{ fontSize: 14, width: 40, textAlign: 'right' }}>
              {pct(stats.layerMastery[l.id])}
            </div>
          </button>
        ))}
      </div>

      <div className="grid-2">
        <button className="btn left" onClick={() => navigate('/session', { mode: 'speed' })}>
          <Icon name="bolt" size={18} /> Speed round
        </button>
        <button className="btn left" onClick={() => navigate('/session', { mode: 'hard' })}>
          <Icon name="target" size={18} /> Hard mode
        </button>
        <button className="btn left" onClick={() => navigate('/session', { mode: 'mixed' })}>
          <Icon name="shuffle" size={18} /> Mixed exam
        </button>
        <button className="btn left outline-accent" onClick={() => navigate('/mentor')}>
          <Icon name="briefcase" size={18} /> Weak spots
        </button>
      </div>
    </div>
  );
}
