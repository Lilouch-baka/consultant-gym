import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { glossSplit } from '../data/glossary.js';
import { haptic } from './haptics.js';

const HOLD_MS = 450;

// Text with glossary terms dotted-underlined. Long-press a term (or focus it and press Enter)
// for a one-line definition and the French term.
export default function Glossed({ text }) {
  const [open, setOpen] = useState(null);
  const timer = useRef(null);
  const startPt = useRef(null);
  const parts = glossSplit(text);

  function cancel() {
    clearTimeout(timer.current);
    timer.current = null;
  }

  function show(entry) {
    cancel();
    haptic('light');
    setOpen(entry);
  }

  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <span
            key={i}
            className="gloss"
            role="button"
            tabIndex={0}
            aria-label={`${p.text}: hold for definition`}
            onPointerDown={(e) => {
              startPt.current = [e.clientX, e.clientY];
              timer.current = setTimeout(() => show(p.entry), HOLD_MS);
            }}
            onPointerMove={(e) => {
              const s = startPt.current;
              if (s && Math.hypot(e.clientX - s[0], e.clientY - s[1]) > 10) cancel();
            }}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                show(p.entry);
              }
            }}
          >
            {p.text}
          </span>
        ),
      )}
      {open &&
        createPortal(
          <div className="sheet-backdrop" onClick={() => setOpen(null)} role="presentation">
            <div className="sheet" role="dialog" aria-modal="true" aria-label={`Definition of ${open.term}`} onClick={(e) => e.stopPropagation()}>
              <div className="eyebrow">Glossary</div>
              <div className="gloss-term">{open.term}</div>
              <p className="body" style={{ margin: 0 }}>
                {open.def}
              </p>
              <div className="gloss-fr">
                <span className="caption">Français</span>
                <span>{open.fr}</span>
              </div>
              <button className="btn lg" onClick={() => setOpen(null)} autoFocus>
                Close
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
