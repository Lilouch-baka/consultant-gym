import { useMemo, useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { ErrorNote, ScreenHeader, SectionLabel, Spinner } from '../components/ui.jsx';
import { ScoreSegments } from '../components/GradeCard.jsx';
import Icon from '../components/Icon.jsx';
import { askClaude } from '../ai/client.js';
import { DIAGNOSIS_SYSTEM, ERROR_TAGS, diagnosisContent, summarizeLog } from '../ai/prompts.js';
import { TOPIC_BY_ID } from '../data/curriculum.js';

const DAY = 24 * 60 * 60 * 1000;

export default function Mentor() {
  const { apiKey, mentorLog, diagnosis, saveDiagnosis, recordUsage } = useApp();
  const graded = useMemo(() => mentorLog.filter((m) => typeof m.score === 'number'), [mentorLog]);
  const summary = useMemo(() => summarizeLog(mentorLog), [mentorLog]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const daysSince = diagnosis ? Math.floor((Date.now() - diagnosis.ts) / DAY) : null;
  const maxTag = Math.max(1, ...Object.values(summary.tags));

  async function runDiagnosis() {
    setBusy(true);
    setError(null);
    try {
      const { result, usage } = await askClaude({ apiKey, system: DIAGNOSIS_SYSTEM, content: diagnosisContent(summary), maxTokens: 350 });
      recordUsage(usage);
      await saveDiagnosis({ ts: Date.now(), text: result, graded: summary.graded });
    } catch (e) {
      if (e.usage) recordUsage(e.usage);
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen with-tabs">
      <ScreenHeader eyebrow={apiKey ? 'Grading on' : 'Self-grading (no API key)'} title="Mentor" />

      <section className="card" aria-labelledby="week-h">
        <div className="row-between">
          <h2 id="week-h" className="h3">
            This week’s weak spots
          </h2>
          <div className="caption">last 7 days</div>
        </div>
        {summary.graded === 0 ? (
          <p className="caption" style={{ lineHeight: 1.5 }}>
            No graded written answers in the last 7 days. Written questions appear in your daily review and in layer drills.
          </p>
        ) : (
          <>
            <div className="caption">{summary.graded} written answers graded</div>
            <div className="stack" style={{ gap: 8 }}>
              <SectionLabel>Error types</SectionLabel>
              {ERROR_TAGS.filter((t) => summary.tags[t]).map((t) => (
                <div key={t} className="row" style={{ gap: 10 }}>
                  <div style={{ width: 104, fontSize: 14 }}>{t}</div>
                  <div className="bar" style={{ flex: 1, height: 8 }}>
                    <div style={{ width: `${(summary.tags[t] / maxTag) * 100}%`, background: 'var(--wrong-strong)' }} />
                  </div>
                  <div className="mono" style={{ width: 24, textAlign: 'right', fontSize: 14 }}>
                    {summary.tags[t]}
                  </div>
                </div>
              ))}
              {Object.keys(summary.tags).length === 0 && <div className="caption">No errors tagged. Well done.</div>}
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <SectionLabel>Weakest topics</SectionLabel>
              {summary.topics.slice(0, 3).map((t) => (
                <div key={t.topic} className="row-between" style={{ alignItems: 'center' }}>
                  <div style={{ fontSize: 14 }}>{t.topic}</div>
                  <div className="mono caption" style={{ fontSize: 13 }}>
                    avg {t.avgScore}/3 · {t.n}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="divider" />
        <SectionLabel>AI diagnosis</SectionLabel>
        {diagnosis ? (
          <>
            <p className="body answer-text">{diagnosis.text}</p>
            <div className="caption">
              {daysSince === 0 ? 'Today' : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`} · based on {diagnosis.graded} graded answers
            </div>
          </>
        ) : (
          <p className="caption">Run it once a week. Only counts by topic and error type are sent, never your answers.</p>
        )}
        {busy && <Spinner label="Diagnosing…" />}
        <ErrorNote error={error} />
        <button className="btn lg primary" onClick={runDiagnosis} disabled={busy || !apiKey || summary.graded === 0}>
          {diagnosis && daysSince < 7 ? 'Run again' : 'Run weekly diagnosis'}
        </button>
        {!apiKey && (
          <button className="btn" onClick={() => navigate('/settings')}>
            <Icon name="settings" size={18} /> Add an API key in Settings
          </button>
        )}
      </section>

      <div className="stack">
        <h2 className="h2">Recent grades</h2>
        {graded.length === 0 && <div className="empty">Your graded written answers will appear here.</div>}
        {graded.slice(0, 15).map((m) => (
          <div key={m.id} className="card pad-sm" style={{ gap: 8 }}>
            <div className="row-between" style={{ alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{TOPIC_BY_ID[m.topic]?.name || m.topic}</div>
              <div className="row" style={{ gap: 6 }}>
                {m.tag && <div className="tag review">{m.tag}</div>}
                <div className="tag">{m.source === 'self' ? 'self' : 'AI'}</div>
              </div>
            </div>
            <ScoreSegments score={m.score} />
            {m.reason && <div className="caption" style={{ lineHeight: 1.5 }}>{m.reason}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
