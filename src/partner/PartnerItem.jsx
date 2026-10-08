// Placeholder until the partner drill lands (Stage 3).
export default function PartnerItem({ item, onDone }) {
  return (
    <div className="card">
      <h1 className="question-text">{item.prompt}</h1>
      <button className="btn lg primary" onClick={() => onDone({ correct: true, rating: 2, ms: 0 })}>
        Next
      </button>
    </div>
  );
}
