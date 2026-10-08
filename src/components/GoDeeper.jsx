import { useState } from 'react';
import Icon from './Icon.jsx';
import { ErrorNote, Spinner } from './ui.jsx';
import { askClaude } from '../ai/client.js';
import { MENTOR_SYSTEM, deeperMessages } from '../ai/prompts.js';
import { useApp } from '../state.jsx';

let uid = 0;

// Free-text follow-up to the mentor, answered in the context of the current question or tree node.
export default function GoDeeper({ context, label = 'Go deeper', placeholder = 'Ask the mentor a follow-up…', autoFocus, inputId }) {
  const { settings } = useApp();
  const [text, setText] = useState('');
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [id] = useState(() => inputId || `deeper-${++uid}`);

  async function send(e) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const a = await askClaude({ settings, system: MENTOR_SYSTEM, messages: deeperMessages(context, thread, q), maxTokens: 4000, effort: 'low' });
      setThread((t) => [...t, { q, a }]);
      setText('');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <label htmlFor={id} style={{ fontSize: 14, fontWeight: 600 }}>
        {label}
      </label>
      {thread.map((t, i) => (
        <div key={i} className="stack" style={{ gap: 6 }}>
          <div className="caption">You: {t.q}</div>
          <div className="card pad-sm">
            <div className="row" style={{ gap: 8 }}>
              <div className="mentor-avatar" style={{ width: 28, height: 28, fontSize: 12, borderRadius: 8 }}>
                M
              </div>
              <div className="caption">Mentor</div>
            </div>
            <p className="body answer-text">{t.a}</p>
          </div>
        </div>
      ))}
      <form className="row" style={{ gap: 8 }} onSubmit={send}>
        <input
          id={id}
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={thread.length ? 'Ask another follow-up…' : placeholder}
          autoFocus={autoFocus}
          enterKeyHint="send"
        />
        <button className="icon-btn filled" type="submit" aria-label="Send follow-up" disabled={busy || !text.trim()}>
          <Icon name="send" size={20} stroke={2.2} />
        </button>
      </form>
      {busy && <Spinner label="The mentor is thinking…" />}
      <ErrorNote error={error} />
    </div>
  );
}
