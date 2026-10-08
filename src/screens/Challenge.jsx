import { useState } from 'react';
import { useApp } from '../state.jsx';
import { BackButton, ErrorNote, SectionLabel, Spinner } from '../components/ui.jsx';
import MentorReview from '../components/MentorReview.jsx';
import GoDeeper from '../components/GoDeeper.jsx';
import { askClaude } from '../ai/client.js';
import { CASE_SCHEMA, GRADE_SCHEMA, MENTOR_SYSTEM, caseAsQuestion, caseMessages, gradeMessages, normalizeGrade } from '../ai/prompts.js';

const FOCUS = ['', 'working capital and cash', 'margins and pricing', 'leverage and covenants', 'growth quality', 'returns on capital', 'valuation'];

export default function Challenge() {
  const { settings, addMentorLog } = useApp();
  const [focus, setFocus] = useState('');
  const [mini, setMini] = useState(null);
  const [answer, setAnswer] = useState('');
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);

  async function newCase() {
    setBusy('case');
    setError(null);
    setReview(null);
    setAnswer('');
    try {
      const c = await askClaude({ settings, system: MENTOR_SYSTEM, messages: caseMessages(focus), schema: CASE_SCHEMA, effort: 'high' });
      setMini(c);
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }

  async function submit() {
    setBusy('grade');
    setError(null);
    try {
      const q = caseAsQuestion(mini);
      const g = normalizeGrade(await askClaude({ settings, system: MENTOR_SYSTEM, messages: gradeMessages(q, answer), schema: GRADE_SCHEMA }));
      setReview(g);
      addMentorLog({ kind: 'challenge', qid: null, prompt: q.prompt, answer, ...g });
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="screen tight">
      <div className="row">
        <BackButton />
        <div className="eyebrow">Mentor · Challenge me</div>
      </div>
      <h1 className="title" style={{ fontSize: 26 }}>
        Diagnose the case
      </h1>

      {!mini && (
        <div className="card">
          <p className="body">
            The mentor writes a short company description with key figures. You write one paragraph: the business story, the root cause and the value impact.
          </p>
          <div className="field">
            <label htmlFor="focus">Focus</label>
            <select id="focus" className="select" value={focus} onChange={(e) => setFocus(e.target.value)}>
              {FOCUS.map((f) => (
                <option key={f} value={f}>
                  {f || 'Surprise me'}
                </option>
              ))}
            </select>
          </div>
          <button className="btn xl primary" onClick={newCase} disabled={!!busy}>
            Give me a case
          </button>
        </div>
      )}

      {busy === 'case' && <Spinner label="Building a consistent set of figures…" />}
      <ErrorNote error={error} />

      {mini && (
        <>
          <div className="card">
            <SectionLabel>Case</SectionLabel>
            <h2 className="h2">{mini.title}</h2>
            <p className="body">{mini.context}</p>
            <div className="grid-answer" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
              {mini.figures.map((f, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <div style={{ color: 'var(--text-2)' }}>{f.label}</div>
                  <div className="mono" style={{ textAlign: 'right' }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{mini.question}</p>
          </div>

          {!review && (
            <>
              <div className="field">
                <label htmlFor="diag">Your diagnosis (one paragraph)</label>
                <textarea id="diag" className="textarea" rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Story → root cause → evidence → value impact → what you would check next" />
              </div>
              <button className="btn xl primary" disabled={!answer.trim() || !!busy} onClick={submit}>
                Submit diagnosis
              </button>
              {busy === 'grade' && <Spinner label="The mentor is reading your diagnosis…" />}
            </>
          )}

          {review && (
            <>
              <div className="stack" style={{ gap: 6 }}>
                <div className="caption">Your answer</div>
                <div className="card pad-sm body answer-text">{answer}</div>
              </div>
              <MentorReview review={review} />
              <GoDeeper context={`Mini-case: ${caseAsQuestion(mini).prompt}\nMy diagnosis: ${answer}\nMentor feedback: ${review.wrong}`} />
              <div className="grid-2">
                <button
                  className="btn lg"
                  onClick={() => {
                    setReview(null);
                  }}
                >
                  Try again
                </button>
                <button className="btn lg primary" onClick={newCase} disabled={!!busy}>
                  New case
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
