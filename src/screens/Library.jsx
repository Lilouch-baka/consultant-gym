import { useMemo } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { LAYERS } from '../data/curriculum.js';
import { LENSES } from '../data/tracks.js';
import { dailyQueue, estimateMinutes } from '../engine/sessionBuilder.js';
import { computeStats, pct, trackMastery } from '../engine/stats.js';
import { BOOKS, CHAPTERS } from '../accounting/chapters.js';
import { ProgressBar, ScreenHeader, SectionLabel } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const TABS = [
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'partner', label: 'Partner' },
];

export default function Library({ params }) {
  const track = TABS.some((t) => t.id === params.track) ? params.track : 'fundamentals';
  return (
    <div className="screen with-tabs" style={{ gap: 18 }}>
      <ScreenHeader eyebrow="Every track, chapter and layer" title="Library" />
      <div className="segmented" role="group" aria-label="Track">
        {TABS.map((t) => (
          <button key={t.id} aria-pressed={track === t.id} onClick={() => navigate('/library', { track: t.id })}>
            {t.label}
          </button>
        ))}
      </div>
      {track === 'fundamentals' && <Fundamentals />}
      {track === 'accounting' && <Accounting />}
      {track === 'partner' && <Partner />}
      <button className="btn" onClick={() => navigate('/settings')}>
        <Icon name="settings" size={18} /> Settings
      </button>
    </div>
  );
}

function Fundamentals() {
  const { questions, reviews } = useApp();
  const queue = useMemo(() => dailyQueue(questions, reviews), [questions, reviews]);
  const stats = useMemo(() => computeStats(questions, reviews), [questions, reviews]);
  return (
    <>
      <div className="card pad-sm">
        <div className="row-between">
          <SectionLabel>Daily review</SectionLabel>
          <div className="caption">~{queue.length ? estimateMinutes(queue) : 0} min</div>
        </div>
        <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
          <div className="mono" style={{ fontSize: 40, fontWeight: 500, lineHeight: 1 }}>
            {queue.length}
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-2)' }}>cards due</div>
        </div>
        <button className="btn lg primary" disabled={!queue.length} onClick={() => navigate('/session', { mode: 'daily' })}>
          {queue.length ? 'Start review' : 'All done for today'}
        </button>
      </div>

      <div className="grid-3">
        <button className="btn" style={{ flexDirection: 'column', gap: 4, fontSize: 13 }} onClick={() => navigate('/session', { mode: 'speed' })}>
          <Icon name="bolt" size={18} /> Speed
        </button>
        <button className="btn" style={{ flexDirection: 'column', gap: 4, fontSize: 13 }} onClick={() => navigate('/session', { mode: 'hard' })}>
          <Icon name="target" size={18} /> Hard
        </button>
        <button className="btn" style={{ flexDirection: 'column', gap: 4, fontSize: 13 }} onClick={() => navigate('/session', { mode: 'mixed' })}>
          <Icon name="shuffle" size={18} /> Exam
        </button>
      </div>

      <button className="row-card" onClick={() => navigate('/tree')} style={{ borderColor: 'var(--accent)' }}>
        <span style={{ color: 'var(--accent)' }}>
          <Icon name="tree" />
        </span>
        <div className="stack" style={{ flex: 1, gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Ratio tree</div>
          <div className="caption" style={{ fontSize: 12 }}>
            DuPont and ROIC trees with live what-if sliders
          </div>
        </div>
        <Icon name="chevron" size={18} />
      </button>

      <div className="stack">
        <div className="row-between">
          <h2 className="h2">Layers</h2>
          <div className="caption">mastery</div>
        </div>
        {LAYERS.map((l) => {
          const count = questions.filter((q) => q.layer === l.id).length;
          return (
            <button key={l.id} className="row-card" onClick={() => navigate('/layer', { id: l.id })}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--accent)', width: 18 }}>
                {String(l.id).padStart(2, '0')}
              </div>
              <div className="stack" style={{ flex: 1, gap: 6 }}>
                <div className="row-between">
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{l.name}</div>
                  <div className="caption" style={{ fontSize: 12 }}>
                    {l.topics.length} topics · {count} q
                  </div>
                </div>
                <ProgressBar value={stats.layerMastery[l.id]} label={`${l.name} mastery`} />
              </div>
              <div className="mono" style={{ fontSize: 14, width: 40, textAlign: 'right' }}>
                {pct(stats.layerMastery[l.id])}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Accounting() {
  const { accountingItems } = useApp();
  if (accountingItems === null) return <div className="empty">Loading…</div>;
  if (!accountingItems.length) {
    return <div className="empty">The financial accounting chapters are being prepared from your textbook. They will appear here.</div>;
  }
  return <AccountingChapters items={accountingItems} />;
}

function AccountingChapters({ items }) {
  const { reviews } = useApp();
  const byChapter = useMemo(() => {
    const m = {};
    for (const q of items) (m[q.chapter] ||= []).push(q);
    return m;
  }, [items]);
  return (
    <>
      <button className="btn xl primary" onClick={() => navigate('/session', { mode: 'accounting' })}>
        Practise 10 items
      </button>
      <div className="caption" style={{ lineHeight: 1.5 }}>
        Source: {BOOKS.IA17.title}. Questions are written in the app’s own words; each one gives the book section and page so you can read more.
      </div>
      <div className="stack">
        {CHAPTERS.map((c) => {
          const qs = byChapter[c.n] || [];
          const m = trackMastery(qs, reviews);
          const je = qs.filter((q) => q.format === 'journal_entry').length;
          return (
            <button
              key={c.n}
              className="row-card"
              disabled={!qs.length}
              style={{ opacity: qs.length ? 1 : 0.55 }}
              onClick={() => navigate('/session', { mode: 'accounting', topic: c.n })}
            >
              <div className="mono" style={{ fontSize: 13, color: 'var(--accent)', width: 22 }}>
                {String(c.n).padStart(2, '0')}
              </div>
              <div className="stack" style={{ flex: 1, gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{c.title}</div>
                <div className="caption" style={{ fontSize: 12 }}>
                  {qs.length ? `${qs.length} items${je ? ` · ${je} journal entries` : ''}` : 'coming soon'}
                </div>
                {qs.length > 0 && <ProgressBar value={m} label={`Chapter ${c.n} mastery`} />}
              </div>
              <div className="mono" style={{ fontSize: 14, width: 40, textAlign: 'right' }}>
                {qs.length ? pct(m) : ''}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------- Partner: layer map + question list ----------
export function latestAttemptByPid(attempts) {
  const map = {};
  for (const a of attempts) if (!map[a.pid] || a.ts > map[a.pid].ts) map[a.pid] = a;
  return map;
}

export function isRedFlag(a) {
  return !!a && ((a.patterns && a.patterns.length >= 2) || a.rating === 0);
}

function Partner() {
  const { partner, partnerItems, partnerAttempts, reviews, settings } = useApp();
  const latest = useMemo(() => latestAttemptByPid(partnerAttempts), [partnerAttempts]);
  if (!partner) return <div className="empty">Loading…</div>;
  const ve = partner.playbook.value_equation;

  const lensStats = LENSES.map((l) => {
    const items = partnerItems.filter((q) => q.lens === l.id);
    return {
      ...l,
      total: items.length,
      done: items.filter((q) => reviews[q.id]?.history?.length).length,
      flags: items.filter((q) => isRedFlag(latest[q.pid])).length,
    };
  });

  return (
    <>
      <div className="card pad-sm" style={{ gap: 12 }}>
        <SectionLabel>Layer map</SectionLabel>
        <div className="layer-map" role="list">
          {lensStats.map((l) => (
            <div key={l.id} className="layer-step" role="listitem" aria-label={`${l.name}: ${l.done} of ${l.total} done, ${l.flags} red flags`}>
              <div className="mono" style={{ fontWeight: 600 }}>
                {l.id}
              </div>
              <div className="mono caption" style={{ fontSize: 11 }}>
                {l.done}/{l.total}
              </div>
              <div className="mono" style={{ fontSize: 11, color: l.flags ? 'var(--wrong)' : 'var(--muted)' }}>
                {l.flags} flag{l.flags === 1 ? '' : 's'}
              </div>
            </div>
          ))}
          <div className="layer-step value" role="listitem">
            <div className="mono" style={{ fontWeight: 600 }}>
              Value
            </div>
          </div>
        </div>
        <div className="formula" style={{ fontSize: 13 }}>
          ROC = margin × turnover
          <br />
          value = (ROC − WACC) × capital
        </div>
        <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {ve.golden_rule}
        </div>
      </div>

      <div className="row-between" style={{ alignItems: 'center' }}>
        <div className="caption">Company: {settings.companyMode}</div>
      </div>

      <button className="btn xl primary" onClick={() => navigate('/session', { mode: 'partner' })}>
        Practise 3 partner questions
      </button>

      {LENSES.map((l) => (
        <div key={l.id} className="stack">
          <div className="row-between">
            <h2 className="h2">{l.name}</h2>
            <button className="btn sm" onClick={() => navigate('/session', { mode: 'partner', lens: l.id })}>
              Drill {l.id}
            </button>
          </div>
          {partnerItems
            .filter((q) => q.lens === l.id)
            .map((q) => {
              const a = latest[q.pid];
              const done = reviews[q.id]?.history?.length;
              return (
                <button key={q.id} className="row-card" style={{ minHeight: 52, padding: '10px 12px' }} onClick={() => navigate('/session', { mode: 'review', ids: q.id })}>
                  <div className="mono caption" style={{ width: 48, fontSize: 12 }}>
                    {q.pid}
                  </div>
                  <div className="stack" style={{ flex: 1, gap: 2 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.35 }}>{q.prompt}</div>
                    <div className="caption" style={{ fontSize: 12 }}>
                      {q.theme}
                    </div>
                  </div>
                  {isRedFlag(a) ? (
                    <span className="tag review">flag</span>
                  ) : done ? (
                    <span style={{ color: 'var(--correct)' }}>
                      <Icon name="check" size={18} stroke={2.4} />
                    </span>
                  ) : null}
                </button>
              );
            })}
        </div>
      ))}
    </>
  );
}
