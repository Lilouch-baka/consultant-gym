import { ScoreBar, SectionLabel } from './ui.jsx';
import { AnswerGrid } from './Explanation.jsx';
import Icon from './Icon.jsx';

export default function MentorReview({ review }) {
  return (
    <>
      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          <div className="mentor-avatar">M</div>
          <div className="stack" style={{ gap: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Mentor review</div>
            <div className="caption" style={{ fontSize: 12 }}>
              Graded on reasoning, not just the result
            </div>
          </div>
        </div>
        <div className="stack">
          <ScoreBar label="Correctness" score={review.scores.correctness} />
          <ScoreBar label="Structure" score={review.scores.structure} />
          <ScoreBar label="Depth" score={review.scores.depth} />
        </div>
        {review.right && (
          <div className="stack" style={{ gap: 6 }}>
            <SectionLabel tone="correct">Right</SectionLabel>
            <p className="body answer-text">{review.right}</p>
          </div>
        )}
        {review.wrong && (
          <div className="stack" style={{ gap: 6 }}>
            <SectionLabel tone="wrong">Wrong or missing</SectionLabel>
            <p className="body answer-text">{review.wrong}</p>
          </div>
        )}
        {(review.model_answer || review.grid) && (
          <div className="stack" style={{ gap: 8 }}>
            <SectionLabel>Model answer</SectionLabel>
            {review.grid ? <AnswerGrid grid={review.grid} /> : null}
            {review.model_answer && <p className="body answer-text">{review.model_answer}</p>}
          </div>
        )}
      </div>
      {review.follow_up && (
        <div className="follow-up">
          <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>
            <Icon name="help" size={20} stroke={2} />
          </span>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Follow-up</div>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{review.follow_up}</div>
          </div>
        </div>
      )}
    </>
  );
}
