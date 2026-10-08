import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import * as db from '../storage/db.js';
import { LENSES, LENS_BY_ID } from '../data/tracks.js';
import { ErrorNote, RatingBar, SectionLabel, Spinner } from '../components/ui.jsx';
import Autocomplete from '../components/Autocomplete.jsx';
import Icon from '../components/Icon.jsx';
import { haptic } from '../components/haptics.js';
import { buildRatioDictionary, suggest } from './dictionary.js';
import { PYRAMID_FIELDS, liveChecks, offlinePatterns, pyramidLayers, ratioMatch } from './scoring.js';
import { parseWorkedExample, relatedIds } from './workedExample.js';
import { CRITIQUE_SCHEMA, CRITIQUE_SYSTEM, critiqueContent, normalizeCritique } from './critique.js';
import { askClaude } from '../ai/client.js';

const EMPTY = {
  lens: null,
  theme: null,
  measureA: '',
  op: null,
  measureB: '',
  prediction: null,
  reason: '',
  pyramid: { answer: '', reasons: '', evidence: '', sowhat: '', decision: '' },
};

const OPS = [
  { id: '÷', label: '÷', aria: 'Divide' },
  { id: '−', label: '−', aria: 'Minus' },
  { id: '×', label: '×', aria: 'Multiply' },
  { id: 'trend', label: 'trend', aria: 'Trend over time' },
];

// Deterministic shuffle so the order is stable for a given question.
function seeded(arr, seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const neutral = (h) => h.replace(/^H\d\s*[:.)-]?\s*/, '');

let dictCache = null;

export default function PartnerItem({ item, onDone }) {
  const app = useApp();
  const { settings, updateSettings, partner, partnerItems } = app;
  const quick = !!settings.partnerQuick;
  const draftKey = `partner:${item.pid}`;
  const [draft, setDraft] = useState(null);
  const [phase, setPhase] = useState('drill');
  const [saved, setSaved] = useState('');
  const dirty = useRef(false);
  const latest = useRef(null);
  const start = useRef(Date.now());

  // Load any saved draft (resume where you left off).
  useEffect(() => {
    db.get('drafts', draftKey).then((d) => setDraft(d?.draft ? { ...EMPTY, ...d.draft, pyramid: { ...EMPTY.pyramid, ...d.draft.pyramid } } : EMPTY));
  }, [draftKey]);

  // Autosave every 3 s while dirty, and on leaving the screen.
  useEffect(() => {
    const save = () => {
      if (!dirty.current || !latest.current) return;
      dirty.current = false;
      db.putKey('drafts', draftKey, { pid: item.pid, ts: Date.now(), draft: latest.current });
    };
    const t = setInterval(save, 3000);
    return () => {
      clearInterval(t);
      save();
    };
  }, [draftKey, item.pid]);

  const update = (patch) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      latest.current = next;
      dirty.current = true;
      return next;
    });
    setSaved('');
  };
  const updatePyramid = (k, v) => update({ pyramid: { ...draft.pyramid, [k]: v } });

  const dictionary = useMemo(() => {
    if (!dictCache && partner) dictCache = buildRatioDictionary(partner.playbook);
    return dictCache || [];
  }, [partner]);

  const themesByLens = useMemo(() => {
    const m = {};
    for (const q of partnerItems) (m[q.lens] ||= new Set()).add(q.theme);
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, [...v]]));
  }, [partnerItems]);

  const hypothesisOrder = useMemo(() => seeded([0, 1, 2].slice(0, item.q.hypotheses.length), item.pid), [item]);

  if (!draft) return <Spinner label="Loading…" />;

  if (phase === 'reveal') {
    return (
      <Reveal
        item={item}
        draft={draft}
        quick={quick}
        ms={Date.now() - start.current}
        onDone={async (result) => {
          await db.del('drafts', draftKey);
          dirty.current = false;
          onDone(result);
        }}
      />
    );
  }

  // Theme chips: the chosen lens's themes plus two distractors from other lenses.
  const lensThemes = draft.lens ? themesByLens[draft.lens] || [] : [];
  const otherThemes = Object.entries(themesByLens)
    .filter(([k]) => k !== draft.lens)
    .flatMap(([, v]) => v)
    .filter((t) => !lensThemes.includes(t));
  const themeChips = draft.lens ? seeded([...lensThemes, ...seeded(otherThemes, item.pid + draft.lens).slice(0, 2)], item.pid) : [];

  const checks = liveChecks(draft);
  const steps = [
    !!draft.lens && !!draft.theme,
    !!draft.measureA.trim() && !!draft.measureB.trim() && !!draft.op,
    draft.prediction !== null,
    pyramidLayers(draft) === 5,
  ].slice(0, quick ? 3 : 4);

  return (
    <>
      <div className="row" style={{ gap: 10 }}>
        <div className="steps-bar" aria-label={`${steps.filter(Boolean).length} of ${steps.length} steps done`}>
          {steps.map((d, i) => (
            <div key={i} className={d ? 'on' : ''} />
          ))}
        </div>
        <div className="mono caption">{item.pid}</div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <SectionLabel>Partner question</SectionLabel>
        <h1 className="title" style={{ fontSize: 24, lineHeight: 1.3 }}>
          {item.prompt}
        </h1>
        <div className="row caption" style={{ gap: 8, fontSize: 14 }}>
          <Icon name="briefcase" size={16} stroke={2} />
          Company: {settings.companyMode}
        </div>
        <label className="toggle" style={{ fontSize: 14 }}>
          <span>
            Quick mode <span className="caption">· steps 1–3, about 30 s</span>
          </span>
          <input type="checkbox" switch="" checked={quick} onChange={(e) => updateSettings({ partnerQuick: e.target.checked })} />
        </label>
      </div>

      {/* 1. Classify */}
      <section className="stack" style={{ gap: 12 }} aria-labelledby="s1">
        <StepHead n={1} id="s1" title="Classify — which lens?" />
        <div className="grid-2" style={{ gap: 8 }}>
          {LENSES.map((l) => (
            <button key={l.id} className={`choice ${draft.lens === l.id ? 'on' : ''}`} aria-pressed={draft.lens === l.id} onClick={() => update({ lens: l.id, theme: null })}>
              {l.name}
            </button>
          ))}
        </div>
        {draft.lens && (
          <>
            <div className="caption">Theme</div>
            <div className="chips" style={{ gap: 8 }}>
              {themeChips.map((t) => (
                <button key={t} className={`theme-chip ${draft.theme === t ? 'on' : ''}`} aria-pressed={draft.theme === t} onClick={() => update({ theme: t })}>
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 2. Translate */}
      <section className="stack" style={{ gap: 12 }} aria-labelledby="s2">
        <StepHead n={2} id="s2" title="Translate — build the ratio" />
        <div className="card pad-sm" style={{ gap: 10 }}>
          <Autocomplete id="measure-a" label="Measure A" value={draft.measureA} onChange={(v) => update({ measureA: v })} getSuggestions={(t) => suggest(dictionary, t)} placeholder="e.g. NOPAT growth" />
          <div className="grid-4" style={{ gap: 6 }} role="group" aria-label="Operator">
            {OPS.map((o) => (
              <button key={o.id} className={`op-btn ${draft.op === o.id ? 'on' : ''}`} aria-label={o.aria} aria-pressed={draft.op === o.id} onClick={() => update({ op: o.id })}>
                {o.label}
              </button>
            ))}
          </div>
          <Autocomplete id="measure-b" label="Measure B" value={draft.measureB} onChange={(v) => update({ measureB: v })} getSuggestions={(t) => suggest(dictionary, t)} placeholder="e.g. Revenue growth" />
          <div className="caption" style={{ fontSize: 12 }}>
            Suggestions from your ratio dictionary as you type
          </div>
        </div>
      </section>

      {/* 3. Predict */}
      <section className="stack" style={{ gap: 12 }} aria-labelledby="s3">
        <StepHead n={3} id="s3" title="Predict — before the numbers" />
        <div className="stack" style={{ gap: 8 }}>
          {hypothesisOrder.map((i) => (
            <button key={i} className={`choice left ${draft.prediction === i ? 'on' : ''}`} aria-pressed={draft.prediction === i} onClick={() => update({ prediction: i })}>
              {neutral(item.q.hypotheses[i])}
            </button>
          ))}
        </div>
        <input
          className="input"
          aria-label="Why do you predict this"
          placeholder="Why? One line"
          value={draft.reason}
          onChange={(e) => update({ reason: e.target.value })}
          enterKeyHint="done"
        />
      </section>

      {/* 4. Answer */}
      {!quick && (
        <section className="stack" style={{ gap: 12 }} aria-labelledby="s4">
          <StepHead n={4} id="s4" title="Answer — the partner pyramid" />
          {PYRAMID_FIELDS.map((f) =>
            f.collapsible ? (
              <details key={f.key} className="disclosure" open={!!draft.pyramid[f.key]}>
                <summary style={{ fontSize: 13, fontWeight: 600 }}>
                  {f.label} <span className="caption" style={{ fontWeight: 400, marginLeft: 4 }}>· {f.hint} (optional)</span>
                </summary>
                <textarea className="textarea" rows={3} aria-label={f.label} value={draft.pyramid[f.key]} onChange={(e) => updatePyramid(f.key, e.target.value)} />
              </details>
            ) : (
              <div key={f.key} className="field">
                <label htmlFor={`p-${f.key}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {f.label} <span className="caption" style={{ fontWeight: 400 }}>· {f.hint}</span>
                </label>
                <textarea
                  id={`p-${f.key}`}
                  className="textarea"
                  style={{ minHeight: 64 }}
                  rows={f.key === 'reasons' ? 3 : 2}
                  value={draft.pyramid[f.key]}
                  onChange={(e) => updatePyramid(f.key, e.target.value)}
                />
              </div>
            ),
          )}
          <div className="chips" aria-live="polite">
            {checks.map((c) => (
              <div key={c.id} className={`check-chip ${c.ok ? 'ok' : 'bad'}`}>
                {c.ok ? '✓' : '✗'} {c.ok ? c.label : notLabel(c.id)}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="action-bar">
        <div className="grid-action">
          <button
            className="btn lg"
            onClick={async () => {
              await db.putKey('drafts', draftKey, { pid: item.pid, ts: Date.now(), draft });
              dirty.current = false;
              setSaved('Saved');
            }}
          >
            {saved || 'Save draft'}
          </button>
          <button
            className="btn lg primary"
            onClick={() => {
              db.putKey('drafts', draftKey, { pid: item.pid, ts: Date.now(), draft });
              setPhase('reveal');
              window.scrollTo(0, 0);
            }}
          >
            Reveal partner answer
          </button>
        </div>
      </div>
    </>
  );
}

function notLabel(id) {
  return { number: 'no number', lens: 'no lens', sized: 'reasons not sized', sowhat: 'no so-what', decision: 'no decision' }[id];
}

function StepHead({ n, id, title }) {
  return (
    <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
      <div className="mono" style={{ fontSize: 13, color: 'var(--accent)' }}>
        {n}
      </div>
      <h2 id={id} className="h2" style={{ fontSize: 17 }}>
        {title}
      </h2>
    </div>
  );
}

// ---------- Reveal (design 9) ----------
function Reveal({ item, draft, quick, ms, onDone }) {
  const { settings, apiKey, recordUsage, addPartnerAttempt, partnerItems } = useApp();
  const [view, setView] = useState('partner');
  const [ai, setAi] = useState({ status: 'idle' });
  const [openRelated, setOpenRelated] = useState(null);
  const q = item.q;
  const hypotheses = q.hypotheses.map(neutral);

  const lensOk = draft.lens === item.lens;
  const themeOk = draft.theme === item.theme;
  const offlineRatio = useMemo(() => ratioMatch(draft, item), [draft, item]);
  const layers = pyramidLayers(draft);
  const offlinePat = useMemo(() => offlinePatterns(draft, item, settings.companyMode, quick), [draft, item, settings.companyMode, quick]);

  // AI critique: full mode only, needs a key and a connection; otherwise the offline checks stand.
  useEffect(() => {
    if (quick || !apiKey || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    let alive = true;
    setAi({ status: 'loading' });
    askClaude({
      apiKey,
      workspaceId: settings.workspaceId,
      system: CRITIQUE_SYSTEM,
      content: critiqueContent(item, draft, settings.companyMode, hypotheses),
      schema: CRITIQUE_SCHEMA,
      maxTokens: 400,
    })
      .then(({ result, usage }) => {
        recordUsage(usage);
        if (alive) setAi({ status: 'done', result: normalizeCritique(result) });
      })
      .catch((e) => {
        if (e.usage) recordUsage(e.usage);
        if (alive) setAi({ status: 'error', error: e });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ratio = ai.result?.ratio_match ? { ...offlineRatio, match: ai.result.ratio_match, byAi: true } : offlineRatio;
  const patterns = [...new Set([...offlinePat, ...(ai.result?.patterns || [])])];
  const good = lensOk && themeOk && ratio.match !== 'wrong' && (quick || layers >= 4);

  useEffect(() => {
    haptic(lensOk ? 'light' : 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const we = parseWorkedExample(q.worked_example, settings.companyMode);
  const related = relatedIds(q.related).map((pid) => partnerItems.find((p) => p.pid === pid)).filter(Boolean);
  const suggestedRating = !lensOk || ratio.match === 'wrong' ? 0 : good && patterns.length === 0 ? 2 : 1;

  async function rate(rating) {
    await addPartnerAttempt({
      pid: item.pid,
      lens: draft.lens,
      lensOk,
      theme: draft.theme,
      themeOk,
      ratio: `${draft.measureA} ${draft.op || ''} ${draft.measureB}`.trim(),
      ratioMatch: ratio.match,
      prediction: draft.prediction,
      layers,
      quick,
      patterns,
      critique: ai.result?.critique || '',
      rating,
    });
    onDone({ correct: good, rating, ms });
  }

  return (
    <>
      <div className="eyebrow">
        {item.pid} · {LENS_BY_ID[item.lens]?.name} · {item.theme}
      </div>
      <h1 className="question-text" style={{ fontSize: 22 }}>
        {item.prompt}
      </h1>

      <div className="segmented" role="group" aria-label="Show">
        <button aria-pressed={view === 'mine'} onClick={() => setView('mine')}>
          My answer
        </button>
        <button aria-pressed={view === 'partner'} onClick={() => setView('partner')}>
          Partner answer
        </button>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <SectionLabel>Your scorecard</SectionLabel>
        <div className="grid-2" style={{ gap: 8 }}>
          <Tile label="Lens" tone={lensOk ? 'ok' : 'bad'} value={`${LENS_BY_ID[item.lens]?.name} ${lensOk ? '✓' : `✗ (you: ${LENS_BY_ID[draft.lens]?.name || '—'})`}`} />
          <Tile label="Theme" tone={themeOk ? 'ok' : 'bad'} value={`${item.theme} ${themeOk ? '✓' : '✗'}`} />
          <Tile
            label={`Ratio${ratio.byAi ? ' · AI' : ''}`}
            tone={ratio.match === 'exact' ? 'ok' : ratio.match === 'close' ? 'mid' : 'bad'}
            value={ratio.match === 'exact' ? 'Exact ✓' : `${ratio.match === 'close' ? 'Close' : 'Wrong'} — use ${ratio.best}`}
          />
          <Tile label="Pyramid" tone={quick ? 'mid' : layers >= 4 ? 'ok' : layers >= 2 ? 'mid' : 'bad'} value={quick ? 'Quick mode' : `${layers} of 5 layers`} />
        </div>
        {patterns.length > 0 && (
          <div className="chips">
            {patterns.map((p) => (
              <div key={p} className="tag review">
                {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {view === 'mine' ? (
        <MyAnswer draft={draft} hypotheses={hypotheses} quick={quick} />
      ) : (
        <div className="card" style={{ gap: 16 }}>
          <Block label="Why it matters">{q.why}</Block>
          <Block label="Where to look">{q.where_to_look}</Block>
          <div className="stack" style={{ gap: 6 }}>
            <SectionLabel>Key ratio</SectionLabel>
            <div className="formula">
              {q.key_ratio.map((k, i) => (
                <div key={i} style={{ color: i ? 'var(--muted)' : undefined }}>
                  {k}
                </div>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <SectionLabel>Hypotheses to test</SectionLabel>
            {q.hypotheses.map((h, i) => (
              <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.45 }}>
                <div className="mono caption" style={{ width: 24, flexShrink: 0 }}>
                  H{i + 1}
                </div>
                <div>
                  {neutral(h)} {draft.prediction === i && <span style={{ color: 'var(--correct)', fontWeight: 600 }}>← your prediction</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="trap">
            <span style={{ color: 'var(--wrong)', flexShrink: 0, marginTop: 2 }}>
              <Icon name="alert" size={18} stroke={2} />
            </span>
            <div className="stack" style={{ gap: 4 }}>
              <div className="head">Be careful of</div>
              {q.careful.map((c, i) => (
                <div key={i} className="txt">
                  {c}
                </div>
              ))}
            </div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <SectionLabel>Partner answer structure</SectionLabel>
            <p className="body" style={{ fontStyle: 'italic', color: 'var(--text)' }}>
              {q.answer_structure}
            </p>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <SectionLabel>Worked example</SectionLabel>
            <WorkedExample text={q.worked_example} parsed={we} />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="caption" style={{ fontSize: 14 }}>
              Related: {q.related}
            </div>
            {related.length > 0 && (
              <div className="chips">
                {related.map((r) => (
                  <button key={r.pid} className="btn sm" aria-expanded={openRelated === r.pid} onClick={() => setOpenRelated(openRelated === r.pid ? null : r.pid)}>
                    {r.pid} {r.theme}
                  </button>
                ))}
              </div>
            )}
            {openRelated && <RelatedPreview item={related.find((r) => r.pid === openRelated)} />}
          </div>
        </div>
      )}

      {!quick && <MentorCard ai={ai} hasKey={!!apiKey} />}

      <div className="action-bar">
        <RatingBar cap={3} onRate={rate} note={`How well did you know it? Suggested: ${['Again', 'Hard', 'Good', 'Easy'][suggestedRating]}`} />
      </div>
    </>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className={`score-tile ${tone}`}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}

function Block({ label, children }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <SectionLabel>{label}</SectionLabel>
      <p className="body">{children}</p>
    </div>
  );
}

function WorkedExample({ text, parsed }) {
  if (!parsed) return <p className="body answer-text">{text}</p>;
  if (parsed.columns) {
    const cols = `minmax(0, 1.3fr) repeat(${parsed.columns.length}, minmax(0, 1fr))`;
    return (
      <div className="we-table" style={{ gridTemplateColumns: cols }}>
        {parsed.caption && <div className="we-cap" style={{ gridColumn: '1 / -1' }}>{parsed.caption}</div>}
        <div />
        {parsed.columns.map((c) => (
          <div key={c} className="we-h">
            {c}
          </div>
        ))}
        {parsed.rows.map((r) => (
          <div key={r.name} style={{ display: 'contents' }}>
            <div>{r.name}</div>
            {r.values.map((v, i) => (
              <div key={i} className={`mono we-v ${/^[−-]/.test(v) ? 'neg' : ''}`}>
                {v}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="we-table" style={{ gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 2fr)' }}>
      {parsed.caption && <div className="we-cap" style={{ gridColumn: '1 / -1' }}>{parsed.caption}</div>}
      {parsed.rows.map((r) => (
        <div key={r.name} style={{ display: 'contents' }}>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ lineHeight: 1.45 }}>{r.text}</div>
        </div>
      ))}
    </div>
  );
}

function RelatedPreview({ item }) {
  if (!item) return null;
  return (
    <div className="inner stack" style={{ gap: 8 }}>
      <div className="mono caption">
        {item.pid} · {item.theme}
      </div>
      <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{item.prompt}</div>
      <div className="caption" style={{ lineHeight: 1.5 }}>
        {item.q.why}
      </div>
      <button className="btn sm" onClick={() => navigate('/session', { mode: 'review', ids: item.id })}>
        Practise {item.pid} now
      </button>
    </div>
  );
}

function MyAnswer({ draft, hypotheses, quick }) {
  const p = draft.pyramid;
  return (
    <div className="card" style={{ gap: 14 }}>
      <Block label="Lens and theme">
        {LENS_BY_ID[draft.lens]?.name || '—'} · {draft.theme || '—'}
      </Block>
      <div className="stack" style={{ gap: 6 }}>
        <SectionLabel>Ratio</SectionLabel>
        <div className="formula">
          {draft.measureA || '?'} {draft.op || '?'} {draft.measureB || '?'}
        </div>
      </div>
      <Block label="Prediction">
        {draft.prediction !== null ? hypotheses[draft.prediction] : '—'}
        {draft.reason ? ` · because ${draft.reason}` : ''}
      </Block>
      {!quick &&
        PYRAMID_FIELDS.map((f) => (
          <Block key={f.key} label={f.label}>
            {p[f.key] || '—'}
          </Block>
        ))}
    </div>
  );
}

function MentorCard({ ai, hasKey }) {
  if (!hasKey) {
    return (
      <div className="notice">
        Offline checks only. Add an API key in Settings for the senior-partner critique.{' '}
        <button className="btn sm" style={{ marginTop: 8, display: 'flex' }} onClick={() => navigate('/settings')}>
          Open Settings
        </button>
      </div>
    );
  }
  if (ai.status === 'loading') return <Spinner label="The partner is reading your answer…" />;
  if (ai.status === 'error') return <ErrorNote error={ai.error} />;
  if (ai.status !== 'done') return <div className="notice">Offline: the critique needs a connection. Offline checks are shown above.</div>;
  return (
    <div className="follow-up">
      <div className="mentor-avatar" style={{ width: 32, height: 32, borderRadius: 9, fontSize: 13 }}>
        M
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Mentor</div>
        <div style={{ fontSize: 15, lineHeight: 1.5 }}>{ai.result.critique}</div>
        {ai.result.follow_up && (
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>
            <b>Follow-up:</b> {ai.result.follow_up}
          </div>
        )}
      </div>
    </div>
  );
}
