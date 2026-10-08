import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { navigate } from '../router.js';
import { buildSession, MODES } from '../engine/sessionBuilder.js';
import { capFromScore, ratingCap } from '../engine/srs.js';
import { checkNumeric, formatMs, formatNumber, shuffle, timerSeconds } from '../engine/answerCheck.js';
import { topicLabel, TOPIC_BY_ID, LAYER_BY_ID } from '../data/curriculum.js';
import { BackButton, ErrorNote, ProgressBar, RatingBar, RingTimer, SectionLabel, Spinner } from '../components/ui.jsx';
import Explanation, { Verdict } from '../components/Explanation.jsx';
import GoDeeper from '../components/GoDeeper.jsx';
import MentorReview from '../components/MentorReview.jsx';
import { askClaude } from '../ai/client.js';
import { GRADE_SCHEMA, MENTOR_SYSTEM, gradeMessages, normalizeGrade, questionContext } from '../ai/prompts.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function Session({ params }) {
  const { ready, questions, questionById, reviews, recordAnswer } = useApp();
  const mode = params.mode || 'daily';
  const speed = mode === 'speed';

  const [queue, setQueue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const requeued = useRef(new Set());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!ready || queue) return;
    let q;
    if (params.ids) q = params.ids.split(',').map((id) => questionById[id]).filter(Boolean);
    else q = buildSession(mode, { questions, reviews, layer: params.layer, topic: params.topic, difficulty: params.difficulty });
    setQueue(q);
    // Build once per session; later review updates must not reshuffle the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!queue) {
    return (
      <div className="screen tight">
        <Spinner label="Building your session…" />
      </div>
    );
  }

  const title = sessionTitle(mode, params);

  if (queue.length === 0) {
    return (
      <div className="screen tight">
        <div className="row">
          <BackButton to="/" icon="close" label="Close session" />
          <div className="eyebrow">{title}</div>
        </div>
        <div className="empty">
          {mode === 'daily' ? 'Nothing is due right now. Pick a layer drill or a mixed exam to keep going.' : 'No questions match this session yet.'}
        </div>
        <button className="btn lg primary" onClick={() => navigate('/layers')}>
          Browse layers
        </button>
      </div>
    );
  }

  if (idx >= queue.length) {
    return <Summary title={title} results={results} startedAt={startedAt.current} />;
  }

  const q = queue[idx];

  function finish(result) {
    recordAnswer(q.id, result);
    setResults((r) => [...r, { qid: q.id, correct: result.correct, ms: result.ms }]);
    if (result.rating === 0 && !requeued.current.has(q.id)) {
      requeued.current.add(q.id);
      setQueue((qs) => [...qs, q]);
    }
    setIdx((i) => i + 1);
    window.scrollTo(0, 0);
  }

  return (
    <div className="screen tight">
      {speed ? (
        <div className="row-between" style={{ alignItems: 'center' }}>
          <BackButton to="/" icon="close" label="Close speed round" />
          <div className="eyebrow" style={{ textAlign: 'center' }}>
            Speed round · L{q.layer} {LAYER_BY_ID[q.layer]?.short}
          </div>
          <div className="mono caption">
            {idx + 1}/{queue.length}
          </div>
        </div>
      ) : (
        <div className="row">
          <BackButton to="/" icon="close" label="Close session" />
          <div style={{ flex: 1 }}>
            <ProgressBar value={idx / queue.length} height={6} label="Session progress" />
          </div>
          <div className="mono caption">
            {idx + 1}/{queue.length}
          </div>
        </div>
      )}

      {!speed && (
        <div className="chips">
          <div className="tag">{topicLabel(q)}</div>
          <div className="tag">{q.difficulty}</div>
          <div className="tag">{q.style}</div>
          {q.needs_review && <div className="tag review">Needs review</div>}
          {q.source === 'ai' && <div className="tag">AI</div>}
        </div>
      )}

      <QuestionView key={`${q.id}-${idx}`} q={q} speed={speed} onDone={finish} />
    </div>
  );
}

function sessionTitle(mode, params) {
  if (mode === 'layer') return `Layer ${params.layer} drill`;
  if (mode === 'topic') return `${TOPIC_BY_ID[params.topic]?.name || 'Topic'} drill`;
  return MODES[mode]?.title || 'Session';
}

function QuestionView({ q, speed, onDone }) {
  if (q.format === 'mcq') return <McqView q={q} onDone={onDone} />;
  if (q.format === 'flashcard') return <FlashcardView q={q} onDone={onDone} />;
  if (q.format === 'mental_math') return <MentalMathView q={q} speed={speed} onDone={onDone} />;
  return <WrittenView q={q} onDone={onDone} />;
}

function AfterAnswer({ q, verdict, cap, capNote, onRate, hideAnswer }) {
  return (
    <>
      <Explanation q={q} verdict={verdict} hideAnswer={hideAnswer} />
      <GoDeeper context={questionContext(q)} />
      <RatingBar cap={cap} onRate={onRate} note={capNote} />
    </>
  );
}

// ---------- Multiple choice ----------
function McqView({ q, onDone }) {
  const [order] = useState(() => shuffle([0, 1, 2, 3]));
  const [chosen, setChosen] = useState(null);
  const start = useRef(Date.now());
  const [ms, setMs] = useState(0);
  const answered = chosen !== null;
  const correct = chosen === q.answer.index;

  function choose(i) {
    if (answered) return;
    setMs(Date.now() - start.current);
    setChosen(i);
  }

  return (
    <>
      <h1 className="question-text">{q.prompt}</h1>
      <div className="stack">
        {order.map((oi, pos) => {
          let cls = 'option';
          if (answered) {
            if (oi === q.answer.index) cls += ' correct';
            else if (oi === chosen) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={oi} className={cls} onClick={() => choose(oi)} disabled={answered} aria-pressed={chosen === oi}>
              <span className="letter">{LETTERS[pos]}</span>
              <span className="txt">{q.options[oi]}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <AfterAnswer
          q={q}
          verdict={<Verdict correct={correct} ms={ms} />}
          cap={ratingCap({ correct, ms })}
          capNote={correct ? undefined : 'Wrong answers come back soon: rated Again.'}
          onRate={(rating) => onDone({ correct, rating, ms, given: chosen })}
          hideAnswer={correct}
        />
      )}
    </>
  );
}

// ---------- Flashcard ----------
function FlashcardView({ q, onDone }) {
  const [flipped, setFlipped] = useState(false);
  const start = useRef(Date.now());
  const [ms, setMs] = useState(0);
  const a = q.answer;

  return (
    <>
      <div className="card flashcard-face">
        <SectionLabel>Flashcard</SectionLabel>
        <h1 className="question-text" style={{ textAlign: 'center' }}>
          {q.prompt}
        </h1>
        {!flipped && <div className="caption">Say the meaning, formula and what high/low signals. Then flip.</div>}
      </div>
      {!flipped ? (
        <button
          className="btn xl primary"
          onClick={() => {
            setMs(Date.now() - start.current);
            setFlipped(true);
          }}
        >
          Show answer
        </button>
      ) : (
        <>
          <div className="card">
            <div className="stack" style={{ gap: 6 }}>
              <SectionLabel>Meaning</SectionLabel>
              <p className="body">{a.meaning}</p>
            </div>
            {a.formula && (
              <div className="stack" style={{ gap: 6 }}>
                <SectionLabel>Formula</SectionLabel>
                <div className="formula">{a.formula}</div>
              </div>
            )}
            {a.interpretation && (
              <div className="stack" style={{ gap: 6 }}>
                <SectionLabel>Interpretation</SectionLabel>
                <p className="body">{a.interpretation}</p>
              </div>
            )}
            {(a.high_signals || a.low_signals) && (
              <div className="grid-2">
                <div className="inner stack" style={{ gap: 4 }}>
                  <SectionLabel>High signals</SectionLabel>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{a.high_signals}</div>
                </div>
                <div className="inner stack" style={{ gap: 4 }}>
                  <SectionLabel>Low signals</SectionLabel>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{a.low_signals}</div>
                </div>
              </div>
            )}
          </div>
          <AfterAnswer
            q={q}
            verdict={null}
            cap={3}
            capNote="Be honest: did you have all of it?"
            onRate={(rating) => onDone({ correct: rating > 0, rating, ms })}
          />
        </>
      )}
    </>
  );
}

// ---------- Mental math ----------
function MentalMathView({ q, speed, onDone }) {
  const { settings } = useApp();
  const total = timerSeconds(q, settings);
  const [remaining, setRemaining] = useState(total);
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const start = useRef(Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      const left = total - (Date.now() - start.current) / 1000;
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        submit(true);
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(timedOut) {
    setResult((prev) => {
      if (prev) return prev;
      const ms = Math.min(Date.now() - start.current, total * 1000);
      const check = checkNumeric(q, inputRef.current ? inputRef.current.value : '');
      const correct = check.valid && check.correct;
      return { correct, ms, timedOut: timedOut && !check.valid, given: check.value };
    });
  }

  const cap = result ? ratingCap({ correct: result.correct, ms: result.ms, limitMs: total * 1000 }) : 3;
  const unit = q.answer.unit;
  const ex = q.explanation || {};

  return (
    <>
      <RingTimer total={total} remaining={result ? total - result.ms / 1000 : remaining} />
      <h1 className="question-text center">{q.prompt}</h1>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (!result && value.trim()) submit(false);
        }}
      >
        <label htmlFor="mm-answer">Your answer</label>
        <div className={`num-input ${result ? (result.correct ? 'correct' : 'wrong') : ''}`}>
          <input
            id="mm-answer"
            ref={inputRef}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!!result}
            enterKeyHint="done"
          />
          {unit && <div className="suffix">{unit === 'days' ? 'd' : unit === 'years' ? 'y' : unit}</div>}
        </div>
        {!result && (
          <button className="btn lg primary" type="submit" disabled={!value.trim()} style={{ marginTop: 6 }}>
            Check
          </button>
        )}
      </form>

      {result && (
        <>
          <div className={`result-box ${result.correct ? 'correct' : 'wrong'}`}>
            <div className="row-between">
              <div style={{ fontWeight: 600, fontSize: 15, color: result.correct ? 'var(--correct)' : 'var(--wrong)' }}>
                {result.timedOut ? 'Time is up' : result.correct ? 'Within tolerance' : 'Outside tolerance'}
              </div>
              <div className="mono" style={{ fontSize: 15 }}>
                exact {formatNumber(q.answer.value, unit)}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>
              {(ex.reasoning || []).slice(-1)[0]}
              {ex.shortcut && (
                <>
                  <br />
                  Shortcut: {ex.shortcut}
                </>
              )}
            </div>
            <div className="caption">
              {formatMs(result.ms)}
              {result.correct && cap < 3 ? ' · slow: counted as Hard' : ''}
            </div>
          </div>
          {q.benchmarks && q.benchmarks.length > 0 && (
            <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
              {q.benchmarks.slice(0, 3).map((b) => (
                <div className="bench" key={b}>
                  {b}
                </div>
              ))}
            </div>
          )}
          {speed ? (
            <>
              <details className="disclosure">
                <summary className="caption">Full explanation</summary>
                <Explanation q={q} verdict={null} hideAnswer />
              </details>
              <div className="spacer" />
              <button
                className="btn xl primary"
                onClick={() => onDone({ correct: result.correct, rating: result.correct ? Math.min(2, cap) : 0, ms: result.ms, given: result.given })}
              >
                Next question
              </button>
            </>
          ) : (
            <AfterAnswer
              q={q}
              verdict={<Verdict correct={result.correct} ms={result.ms} />}
              cap={cap}
              capNote={!result.correct ? 'Wrong answers come back soon: rated Again.' : cap < 3 ? 'Correct but slow: Hard at most.' : undefined}
              onRate={(rating) => onDone({ correct: result.correct, rating, ms: result.ms, given: result.given })}
              hideAnswer
            />
          )}
        </>
      )}
    </>
  );
}

// ---------- Written (AI-graded) ----------
function WrittenView({ q, onDone }) {
  const { settings, addMentorLog } = useApp();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('writing'); // writing | grading | graded | self
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [followUp, setFollowUp] = useState(null); // { text, phase, review, error }
  const start = useRef(Date.now());
  const [ms, setMs] = useState(0);

  async function grade() {
    setMs(Date.now() - start.current);
    setPhase('grading');
    setError(null);
    try {
      const raw = await askClaude({ settings, system: MENTOR_SYSTEM, messages: gradeMessages(q, text), schema: GRADE_SCHEMA });
      const g = normalizeGrade(raw);
      setReview(g);
      setPhase('graded');
      addMentorLog({ kind: 'grade', qid: q.id, prompt: q.prompt, answer: text, ...g });
    } catch (e) {
      setError(e);
      setPhase('writing');
    }
  }

  async function gradeFollowUp() {
    setFollowUp((f) => ({ ...f, phase: 'grading', error: null }));
    try {
      const fq = { ...q, prompt: review.follow_up, answer: { model_answer: '', rubric: [] }, explanation: {} };
      const raw = await askClaude({
        settings,
        system: MENTOR_SYSTEM,
        messages: gradeMessages(fq, followUp.text, `This is a follow-up to: "${q.prompt}"`),
        schema: GRADE_SCHEMA,
      });
      const g = normalizeGrade(raw);
      setFollowUp((f) => ({ ...f, phase: 'graded', review: g }));
      addMentorLog({ kind: 'follow_up', qid: q.id, prompt: review.follow_up, answer: followUp.text, ...g });
    } catch (e) {
      setFollowUp((f) => ({ ...f, phase: 'writing', error: e }));
    }
  }

  const cap = review ? capFromScore(review.scores.correctness) : 3;

  return (
    <>
      <h1 className="question-text answer-text" style={{ fontSize: q.prompt.length > 220 ? 18 : 20 }}>
        {q.prompt}
      </h1>

      {phase === 'writing' && (
        <>
          <div className="field">
            <label htmlFor="written-answer">Your answer</label>
            <textarea
              id="written-answer"
              className="textarea"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={q.style === 'walkthrough' ? 'IS → CFS → BS, and prove it balances…' : 'Structure first: driver → effect → so what…'}
            />
          </div>
          <ErrorNote error={error} />
          <button className="btn xl primary" disabled={!text.trim()} onClick={grade}>
            Submit to mentor
          </button>
          <button
            className="btn lg"
            onClick={() => {
              setMs(Date.now() - start.current);
              setPhase('self');
            }}
          >
            {settings.apiKey ? 'Skip mentor: show model answer' : 'Show model answer and self-grade'}
          </button>
          {!settings.apiKey && <div className="caption">Add your API key in Settings to have the mentor grade written answers.</div>}
        </>
      )}

      {phase === 'grading' && (
        <>
          <YourAnswer text={text} />
          <Spinner label="The mentor is reading your answer…" />
        </>
      )}

      {phase === 'graded' && review && (
        <>
          <YourAnswer text={text} />
          <MentorReview review={review} />
          {!followUp && (
            <div className="grid-2">
              <button
                className="btn lg"
                onClick={() => {
                  setReview(null);
                  setPhase('writing');
                }}
              >
                Try again
              </button>
              <button className="btn lg primary" disabled={!review.follow_up} onClick={() => setFollowUp({ text: '', phase: 'writing' })}>
                Answer follow-up
              </button>
            </div>
          )}
          {followUp && (
            <div className="stack-lg">
              {followUp.phase === 'writing' && (
                <>
                  <div className="field">
                    <label htmlFor="followup-answer">Your follow-up answer</label>
                    <textarea
                      id="followup-answer"
                      className="textarea"
                      rows={5}
                      value={followUp.text}
                      onChange={(e) => setFollowUp((f) => ({ ...f, text: e.target.value }))}
                    />
                  </div>
                  <ErrorNote error={followUp.error} />
                  <button className="btn lg primary" disabled={!followUp.text.trim()} onClick={gradeFollowUp}>
                    Submit follow-up
                  </button>
                </>
              )}
              {followUp.phase === 'grading' && <Spinner label="Grading your follow-up…" />}
              {followUp.phase === 'graded' && (
                <>
                  <SectionLabel>Follow-up review</SectionLabel>
                  <MentorReview review={{ ...followUp.review, follow_up: '' }} />
                </>
              )}
            </div>
          )}
          <AfterAnswer
            q={q}
            verdict={<div className="h3">App explanation</div>}
            cap={cap}
            capNote={`Mentor correctness ${review.scores.correctness}/5 sets your highest rating.`}
            onRate={(rating) => onDone({ correct: review.scores.correctness >= 3, rating, ms })}
          />
        </>
      )}

      {phase === 'self' && (
        <>
          {text.trim() && <YourAnswer text={text} />}
          <AfterAnswer
            q={q}
            verdict={<div className="h3">Compare with the model answer</div>}
            cap={3}
            capNote="Self-grade honestly against the model answer."
            onRate={(rating) => onDone({ correct: rating >= 2, rating, ms })}
          />
        </>
      )}
    </>
  );
}

function YourAnswer({ text }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="caption">Your answer</div>
      <div className="card pad-sm body answer-text" style={{ borderRadius: 12 }}>
        {text}
      </div>
    </div>
  );
}

// ---------- End of session ----------
function Summary({ title, results, startedAt }) {
  const unique = useMemo(() => {
    const seen = new Map();
    for (const r of results) if (!seen.has(r.qid)) seen.set(r.qid, r); // first attempt counts
    return [...seen.values()];
  }, [results]);
  const correct = unique.filter((r) => r.correct).length;
  const wrongIds = unique.filter((r) => !r.correct).map((r) => r.qid);
  const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  return (
    <div className="screen">
      <div className="stack" style={{ gap: 4 }}>
        <div className="eyebrow">{title} · done</div>
        <h1 className="title">Session complete</h1>
      </div>
      <div className="grid-3">
        <div className="stat">
          <div className="value">{unique.length}</div>
          <div className="caption" style={{ fontSize: 12 }}>
            questions
          </div>
        </div>
        <div className="stat">
          <div className="value">{unique.length ? Math.round((correct / unique.length) * 100) : 0}%</div>
          <div className="caption" style={{ fontSize: 12 }}>
            first-try accuracy
          </div>
        </div>
        <div className="stat">
          <div className="value">{minutes}m</div>
          <div className="caption" style={{ fontSize: 12 }}>
            time
          </div>
        </div>
      </div>
      {wrongIds.length > 0 && (
        <button className="btn lg outline-accent" onClick={() => navigate('/session', { mode: 'review', ids: wrongIds.join(',') })}>
          Drill my {wrongIds.length} mistake{wrongIds.length > 1 ? 's' : ''} again
        </button>
      )}
      <button className="btn xl primary" onClick={() => navigate('/')}>
        Back to Today
      </button>
    </div>
  );
}
