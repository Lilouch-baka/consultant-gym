import { useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { LAYERS, LAYER_BY_ID, FORMAT_LABEL } from '../data/curriculum.js';
import { ErrorNote, ScreenHeader, SectionLabel, Spinner, ScoreBar } from '../components/ui.jsx';
import GoDeeper from '../components/GoDeeper.jsx';
import Explanation from '../components/Explanation.jsx';
import Icon from '../components/Icon.jsx';
import { askClaude } from '../ai/client.js';
import { GENERATE_SCHEMA, MENTOR_SYSTEM, generateMessages, toBankQuestion } from '../ai/prompts.js';

export default function Mentor() {
  const { settings, mentorLog, customQuestions } = useApp();
  const [openLog, setOpenLog] = useState(null);

  return (
    <div className="screen with-tabs">
      <ScreenHeader eyebrow={settings.apiKey ? `Model: ${settings.model}` : 'No API key yet'} title="Mentor" />

      {!settings.apiKey && (
        <div className="notice">
          The mentor uses your own Anthropic API key. Add it in Settings; it stays on this device.{' '}
          <button className="btn sm" style={{ marginTop: 8, display: 'flex' }} onClick={() => navigate('/settings')}>
            Open Settings
          </button>
        </div>
      )}

      <button className="row-card" onClick={() => navigate('/challenge')} style={{ borderColor: 'var(--accent)' }}>
        <span style={{ color: 'var(--accent)' }}>
          <Icon name="briefcase" />
        </span>
        <div className="stack" style={{ flex: 1, gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Challenge me</div>
          <div className="caption" style={{ fontSize: 12 }}>
            A mini-case with real figures. Diagnose it in one paragraph.
          </div>
        </div>
        <Icon name="chevron" size={18} />
      </button>

      <AskMeMore />

      <div className="card pad-sm">
        <GoDeeper context="General question from the Mentor tab. No specific question is on screen." label="Ask the mentor anything" placeholder="e.g. How do I sanity-check a DCF in 2 minutes?" />
      </div>

      <div className="stack">
        <div className="row-between">
          <h2 className="h2">Recent reviews</h2>
          <div className="caption">{customQuestions.length} saved AI questions</div>
        </div>
        {mentorLog.length === 0 && <div className="empty">Your graded written answers and challenges will appear here.</div>}
        {mentorLog.slice(0, 12).map((m) => (
          <div key={m.id} className="card pad-sm">
            <button
              className="row"
              style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', minHeight: 44 }}
              onClick={() => setOpenLog(openLog === m.id ? null : m.id)}
              aria-expanded={openLog === m.id}
            >
              <div className="stack" style={{ flex: 1, gap: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{(m.prompt || '').split('\n')[0].slice(0, 110)}</div>
                <div className="caption mono" style={{ fontSize: 12 }}>
                  {new Date(m.ts).toLocaleDateString('en-GB')} · C{m.scores?.correctness} S{m.scores?.structure} D{m.scores?.depth}
                  {m.kind === 'challenge' ? ' · case' : ''}
                </div>
              </div>
              <Icon name="chevron" size={18} />
            </button>
            {openLog === m.id && (
              <div className="stack">
                <ScoreBar label="Correctness" score={m.scores?.correctness || 0} />
                <ScoreBar label="Structure" score={m.scores?.structure || 0} />
                <ScoreBar label="Depth" score={m.scores?.depth || 0} />
                <SectionLabel>Your answer</SectionLabel>
                <p className="body answer-text">{m.answer}</p>
                {m.wrong && (
                  <>
                    <SectionLabel tone="wrong">Wrong or missing</SectionLabel>
                    <p className="body answer-text">{m.wrong}</p>
                  </>
                )}
                {m.model_answer && (
                  <>
                    <SectionLabel>Model answer</SectionLabel>
                    <p className="body answer-text">{m.model_answer}</p>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AskMeMore() {
  const { settings, saveCustomQuestion } = useApp();
  const [layer, setLayer] = useState(1);
  const [topic, setTopic] = useState(LAYERS[0].topics[0].id);
  const [difficulty, setDifficulty] = useState('medium');
  const [format, setFormat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState([]);
  const [saved, setSaved] = useState({});
  const [preview, setPreview] = useState(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await askClaude({ settings, system: MENTOR_SYSTEM, messages: generateMessages({ layer, topic, difficulty, format, count: 3 }), schema: GENERATE_SCHEMA, effort: 'high' });
      const qs = (res.questions || []).map((g) => toBankQuestion(g, { layer, topic, difficulty })).filter(Boolean);
      setGenerated(qs);
      setSaved({});
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function save(q) {
    await saveCustomQuestion(q);
    setSaved((s) => ({ ...s, [q.id]: true }));
  }

  return (
    <div className="card">
      <div className="row" style={{ gap: 10 }}>
        <span style={{ color: 'var(--accent)' }}>
          <Icon name="sparkle" />
        </span>
        <div className="stack" style={{ gap: 2 }}>
          <h2 className="h3">Ask me more</h2>
          <div className="caption" style={{ fontSize: 12 }}>
            Fresh questions in the app’s format. Save the good ones to your bank.
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="amm-layer">Layer</label>
          <select
            id="amm-layer"
            className="select"
            value={layer}
            onChange={(e) => {
              const l = Number(e.target.value);
              setLayer(l);
              setTopic(LAYER_BY_ID[l].topics[0].id);
            }}
          >
            {LAYERS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}. {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amm-topic">Topic</label>
          <select id="amm-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {LAYER_BY_ID[layer].topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amm-diff">Difficulty</label>
          <select id="amm-diff" className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="amm-format">Format</label>
          <select id="amm-format" className="select" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">Mixed</option>
            {Object.entries(FORMAT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn lg primary" onClick={generate} disabled={busy}>
        Generate 3 questions
      </button>
      {busy && <Spinner label="Writing questions and checking the numbers…" />}
      <ErrorNote error={error} />
      {generated.map((q) => (
        <div key={q.id} className="inner stack" style={{ gap: 8 }}>
          <div className="chips">
            <div className="tag">{FORMAT_LABEL[q.format]}</div>
            <div className="tag">{q.style}</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>{q.prompt}</div>
          <div className="grid-2">
            <button className="btn sm" onClick={() => setPreview(preview === q.id ? null : q.id)}>
              {preview === q.id ? 'Hide answer' : 'See answer'}
            </button>
            <button className="btn sm primary" disabled={saved[q.id]} onClick={() => save(q)}>
              {saved[q.id] ? 'Saved' : 'Save to bank'}
            </button>
          </div>
          {preview === q.id && <Explanation q={q} verdict={null} />}
        </div>
      ))}
    </div>
  );
}
