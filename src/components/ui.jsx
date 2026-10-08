import Icon from './Icon.jsx';
import { navigate } from '../router.js';
import { RATINGS } from '../engine/srs.js';

export function ProgressBar({ value, height = 4, color, label }) {
  const w = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <div className="bar" style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w)} aria-label={label}>
      <div style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export function ScoreBar({ label, score }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div style={{ width: 96, fontSize: 14 }}>{label}</div>
      <div className="segments" role="img" aria-label={`${label} ${score} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={i <= score ? 'on' : ''} />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 14, width: 28, textAlign: 'right' }}>
        {score}/5
      </div>
    </div>
  );
}

export function SectionLabel({ children, tone }) {
  return <div className={`section-label ${tone || ''}`}>{children}</div>;
}

const ARROWS = { up: '↑', down: '↓', mixed: '↕' };

export function MoveChips({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="chips">
      {items.map((it, i) => (
        <div className="chip" key={i}>
          {it.label} <span className={it.dir === 'up' ? 'up' : it.dir === 'down' ? 'down' : ''}>{ARROWS[it.dir] || ''}</span>
        </div>
      ))}
    </div>
  );
}

export function Trap({ children }) {
  if (!children) return null;
  return (
    <div className="trap">
      <span style={{ color: 'var(--wrong)', flexShrink: 0, marginTop: 2 }}>
        <Icon name="alert" size={18} stroke={2} />
      </span>
      <div className="stack" style={{ gap: 4 }}>
        <div className="head">Common trap</div>
        <div className="txt">{children}</div>
      </div>
    </div>
  );
}

export function ScreenHeader({ eyebrow, title, right }) {
  return (
    <div className="row-between" style={{ alignItems: 'flex-end' }}>
      <div className="stack" style={{ gap: 4 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="title">{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function BackButton({ to, label = 'Back', icon = 'back', onClick }) {
  return (
    <button className="icon-btn" aria-label={label} onClick={onClick || (() => (to ? navigate(to) : window.history.back()))}>
      <Icon name={icon} size={18} stroke={2} />
    </button>
  );
}

export function RatingBar({ cap = 3, onRate, note }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="caption">{note || 'How well did you know it?'}</div>
      <div className="grid-4">
        {RATINGS.map((r, i) => {
          const cls = i === 0 ? 'btn lg danger' : i === Math.min(2, cap) ? 'btn lg primary' : 'btn lg';
          return (
            <button key={r} className={cls} style={{ fontSize: 14, padding: '0 4px' }} disabled={i > cap} onClick={() => onRate(i)}>
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RingTimer({ total, remaining, small }) {
  const size = small ? 96 : 168;
  const r = small ? 40 : 70;
  const circ = 2 * Math.PI * r;
  const frac = total ? Math.max(0, remaining) / total : 0;
  const secs = Math.ceil(Math.max(0, remaining));
  const color = frac < 0.25 ? 'var(--wrong-strong)' : 'var(--accent)';
  return (
    <div className={`ring ${small ? 'small' : ''}`} role="timer" aria-label={`${secs} seconds left`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={small ? 6 : 8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={small ? 6 : 8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <div className="center">
        <div className="time">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </div>
        {!small && <div className="caption" style={{ fontSize: 12 }}>of {total} s</div>}
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="row" style={{ gap: 10 }} role="status">
      <div className="spinner" />
      <span className="caption">{label}</span>
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <strong>{error.code === 'no_key' ? 'No API key. ' : error.code === 'offline' ? 'Offline. ' : 'Mentor error. '}</strong>
      {error.message}
      {(error.code === 'no_key' || error.code === 'invalid_key' || error.code === 'model' || error.code === 'permission') && (
        <>
          {' '}
          <button className="btn sm" style={{ marginTop: 8, display: 'flex' }} onClick={() => navigate('/settings')}>
            Open Settings
          </button>
        </>
      )}
    </div>
  );
}

export function TabBar({ current }) {
  const tabs = [
    { id: '/', label: 'Today', icon: 'today' },
    { id: '/layers', label: 'Layers', icon: 'layers' },
    { id: '/mentor', label: 'Mentor', icon: 'mentor' },
    { id: '/progress', label: 'Progress', icon: 'progress' },
  ];
  return (
    <div className="tabbar">
      <nav aria-label="Main">
        {tabs.map((t) => (
          <button key={t.id} aria-current={current === t.id ? 'page' : undefined} onClick={() => navigate(t.id)}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
