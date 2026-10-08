import { useState } from 'react';
import { SectionLabel } from './ui.jsx';
import { ERROR_TAGS, SCORE_LABEL, TAG_HELP } from '../ai/prompts.js';

export function ScoreSegments({ score }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="segments" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} role="img" aria-label={`Score ${score} out of 3`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={i <= score ? 'on' : ''} />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 14, width: 28, textAlign: 'right' }}>
        {score}/3
      </div>
    </div>
  );
}

// Result of an AI grade: score 0-3, error tag, one-line reason.
export default function GradeCard({ grade }) {
  const good = grade.score >= 2;
  return (
    <div className="card" style={{ gap: 12 }}>
      <div className="row-between">
        <div className="row" style={{ gap: 10 }}>
          <div className="mentor-avatar">M</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: good ? 'var(--correct)' : 'var(--wrong)' }}>{SCORE_LABEL[grade.score]}</div>
        </div>
        {grade.tag && <div className="tag review">{grade.tag}</div>}
      </div>
      <ScoreSegments score={grade.score} />
      {grade.reason && <p className="body">{grade.reason}</p>}
    </div>
  );
}

// Fallback when there is no key, no connection, or you disagree with the grade.
export function SelfGrade({ onDone }) {
  const [score, setScore] = useState(null);
  const [tag, setTag] = useState(null);
  return (
    <div className="card" style={{ gap: 14 }}>
      <SectionLabel>Grade yourself</SectionLabel>
      <div className="grid-4" role="group" aria-label="Score from 0 to 3">
        {[0, 1, 2, 3].map((s) => (
          <button key={s} className={`btn ${score === s ? 'primary' : ''}`} style={{ flexDirection: 'column', gap: 2, padding: '6px 2px', fontSize: 12 }} aria-pressed={score === s} onClick={() => setScore(s)}>
            <span className="mono" style={{ fontSize: 17 }}>
              {s}
            </span>
            {SCORE_LABEL[s]}
          </button>
        ))}
      </div>
      {score !== null && score < 3 && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="caption">Main error (optional, feeds the weekly diagnosis)</div>
          <div className="chips">
            {ERROR_TAGS.map((t) => (
              <button
                key={t}
                className={`btn sm ${tag === t ? 'primary' : ''}`}
                style={{ minHeight: 44, fontSize: 13 }}
                aria-pressed={tag === t}
                title={TAG_HELP[t]}
                onClick={() => setTag(tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className="btn lg primary" disabled={score === null} onClick={() => onDone({ score, tag: score === 3 ? null : tag, reason: '' })}>
        Next
      </button>
    </div>
  );
}
