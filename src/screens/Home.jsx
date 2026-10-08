import { useMemo } from 'react';
import { useApp, currentStreak } from '../state.jsx';
import { navigate } from '../router.js';
import { estimateMinutes, mixQueue } from '../engine/sessionBuilder.js';
import { attemptedCount, pct, trackMastery, weeklyTopError } from '../engine/stats.js';
import { LENSES } from '../data/tracks.js';
import { ProgressBar } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function Home() {
  const { questions, reviews, meta, partner, partnerItems, accountingItems, partnerAttempts, mentorLog } = useApp();
  const loaded = !!partner && accountingItems !== null;
  const accounting = accountingItems || [];

  const mix = useMemo(
    () => (loaded ? mixQueue({ fundamentals: questions, accounting, partner: partnerItems, reviews }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, questions, accountingItems, partnerItems, reviews],
  );
  const counts = useMemo(() => {
    const c = { fundamentals: 0, accounting: 0, partner: 0 };
    (mix || []).forEach((q) => (c[q.track] += 1));
    return c;
  }, [mix]);

  const fundMastery = useMemo(() => trackMastery(questions, reviews), [questions, reviews]);
  const accMastery = useMemo(() => trackMastery(accounting, reviews), [accounting, reviews]);
  const lensDone = useMemo(
    () =>
      LENSES.map((l) => {
        const items = partnerItems.filter((q) => q.lens === l.id);
        return { ...l, total: items.length, done: attemptedCount(items, reviews) };
      }),
    [partnerItems, reviews],
  );
  const partnerDone = lensDone.reduce((n, l) => n + l.done, 0);
  const topError = useMemo(() => weeklyTopError(partnerAttempts, mentorLog), [partnerAttempts, mentorLog]);

  const streak = currentStreak(meta);
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  const mixParts = [];
  if (counts.fundamentals) mixParts.push(plural(counts.fundamentals, 'ratio card', 'ratio cards'));
  if (counts.accounting) mixParts.push(plural(counts.accounting, 'entry', 'entries'));
  if (counts.partner) mixParts.push(plural(counts.partner, 'partner question', 'partner questions'));

  return (
    <div className="screen with-tabs" style={{ gap: 18 }}>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 4 }}>
          <div className="eyebrow">
            {dateLabel}
            {meta.studyDays ? ` · Day ${meta.studyDays}` : ''}
          </div>
          <h1 className="title">Consultant Gym</h1>
        </div>
        <div className="pill" aria-label={`${streak} day streak`}>
          <Icon name="flame" size={14} stroke={2} />
          {streak} {streak === 1 ? 'day' : 'days'}
        </div>
      </div>

      <button className="mix-btn" disabled={!mix || !mix.length} onClick={() => navigate('/session', { mode: 'mix' })}>
        <div className="stack" style={{ flex: 1, gap: 2 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            Today’s mix{mix && mix.length ? ` · ${estimateMinutes(mix)} min` : ''}
          </div>
          <div style={{ fontSize: 13 }}>{!mix ? 'Loading tracks…' : mix.length ? mixParts.join(' · ') : 'All caught up for today'}</div>
        </div>
        <Icon name="send" size={22} stroke={2.2} />
      </button>

      <div className="eyebrow">Tracks</div>

      <button className="track-card" onClick={() => navigate('/library', { track: 'fundamentals' })}>
        <div className="row-between" style={{ width: '100%' }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Finance fundamentals</div>
          <div className="mono" style={{ fontSize: 14 }}>
            {pct(fundMastery)}
          </div>
        </div>
        <div className="caption">Ratios · 3 statements · returns · ratio tree</div>
        <div style={{ width: '100%' }}>
          <ProgressBar value={fundMastery} label="Finance fundamentals mastery" />
        </div>
      </button>

      <button className="track-card" onClick={() => navigate('/library', { track: 'accounting' })}>
        <div className="row-between" style={{ width: '100%' }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Financial accounting</div>
          <div className="mono" style={{ fontSize: 14 }}>
            {accounting.length ? pct(accMastery) : 'soon'}
          </div>
        </div>
        <div className="caption">Chapter by chapter · journal entries · concepts</div>
        <div style={{ width: '100%' }}>
          <ProgressBar value={accMastery} label="Financial accounting mastery" />
        </div>
      </button>

      <button className="track-card" onClick={() => navigate('/library', { track: 'partner' })}>
        <div className="row-between" style={{ width: '100%' }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Partner analysis</div>
          <div className="mono" style={{ fontSize: 14 }}>
            {partnerDone} / {partnerItems.length || 70}
          </div>
        </div>
        <div className="grid-4" style={{ width: '100%', gap: 6 }}>
          {lensDone.map((l) => (
            <div key={l.id} className="stack" style={{ gap: 6 }}>
              <div className="mono caption" style={{ fontSize: 11 }}>
                {l.id} {l.done}/{l.total}
              </div>
              <ProgressBar value={l.total ? l.done / l.total : 0} label={`${l.name} done`} />
            </div>
          ))}
        </div>
      </button>

      {topError && (
        <button className="hint-card" onClick={() => navigate('/progress')}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>
            <Icon name="target" size={18} stroke={2} />
          </span>
          <span>
            Most common error this week: <b>{topError.label.toLowerCase()}</b> ({topError.n} of {topError.total} {topError.source === 'partner' ? 'partner answers' : 'written answers'})
          </span>
        </button>
      )}
    </div>
  );
}
