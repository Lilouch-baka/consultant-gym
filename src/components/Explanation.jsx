import Icon from './Icon.jsx';
import { MoveChips, SectionLabel, Trap } from './ui.jsx';
import { formatMs, formatNumber } from '../engine/answerCheck.js';

export function Verdict({ correct, ms, label }) {
  return (
    <div className={`verdict ${correct ? 'correct' : 'wrong'}`}>
      <Icon name={correct ? 'check' : 'x'} size={18} stroke={2.4} />
      {label || (correct ? 'Correct' : 'Not quite')}
      {ms ? ` · ${formatMs(ms)}` : ''}
    </div>
  );
}

export function Reasoning({ steps }) {
  if (!steps || !steps.length) return null;
  if (steps.length === 1) return <p className="body">{steps[0]}</p>;
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  );
}

export function AnswerGrid({ grid }) {
  if (!grid) return null;
  return (
    <div className="grid-answer">
      {['IS', 'CFS', 'BS'].map((k) =>
        grid[k] ? (
          <div key={k} style={{ display: 'contents' }}>
            <div className="k">{k}</div>
            <div>{grid[k]}</div>
          </div>
        ) : null,
      )}
    </div>
  );
}

// The core of the app: answer, reasoning, why it matters, moves with it, common trap.
export default function Explanation({ q, verdict, hideAnswer }) {
  const ex = q.explanation || {};
  let answerLine = null;
  if (!hideAnswer) {
    if (q.format === 'mcq') answerLine = q.options[q.answer.index];
    if (q.format === 'mental_math') answerLine = formatNumber(q.answer.value, q.answer.unit) + (q.answer.tolerance ? `  (accepted ± ${q.answer.tolerance}${q.answer.unit === '%' ? ' pts' : q.answer.unit ? ' ' + q.answer.unit : ''})` : '');
  }

  return (
    <div className="card">
      {verdict}
      {answerLine && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Answer</SectionLabel>
          <p className="body" style={{ color: 'var(--text)', fontWeight: 500 }}>
            {answerLine}
          </p>
        </div>
      )}
      {q.format === 'written' && !hideAnswer && q.answer?.model_answer && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Model answer</SectionLabel>
          <p className="body answer-text">{q.answer.model_answer}</p>
          <AnswerGrid grid={q.answer.grid} />
        </div>
      )}
      {ex.reasoning && ex.reasoning.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Reasoning</SectionLabel>
          <Reasoning steps={ex.reasoning} />
        </div>
      )}
      {ex.shortcut && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Mental shortcut</SectionLabel>
          <p className="body mono" style={{ fontSize: 14 }}>
            {ex.shortcut}
          </p>
        </div>
      )}
      {q.why_it_matters && (
        <div className="stack" style={{ gap: 6 }}>
          <SectionLabel>Why it matters</SectionLabel>
          <p className="body">{q.why_it_matters}</p>
        </div>
      )}
      {q.interactions && q.interactions.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <SectionLabel>Moves with it</SectionLabel>
          <MoveChips items={q.interactions} />
        </div>
      )}
      <Trap>{q.common_trap}</Trap>
    </div>
  );
}
