import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { RatingBar, SectionLabel } from '../components/ui.jsx';
import Explanation, { Verdict } from '../components/Explanation.jsx';
import { haptic } from '../components/haptics.js';
import Glossed from '../components/Glossed.jsx';
import { aliasHint, searchAccounts } from './chartOfAccounts.js';
import { checkEntry, fmt, parseAmount, signed, tAccounts, totals } from './journal.js';

const blank = () => ({ account: '', debit: '', credit: '' });

export default function JournalEntry({ q, onDone }) {
  const [lines, setLines] = useState([blank(), blank()]);
  const [picker, setPicker] = useState(null); // index of the line being picked
  const [result, setResult] = useState(null);
  const [showT, setShowT] = useState(false);
  const start = useRef(Date.now());
  const t = totals(lines);

  const set = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  function check() {
    const r = checkEntry(lines, q.answer.lines);
    setResult({ ...r, ms: Date.now() - start.current });
    haptic(r.correct ? 'light' : 'error');
  }

  return (
    <>
      <h1 className="question-text" style={{ fontSize: 20, lineHeight: 1.45 }}>
        <Glossed text={q.prompt} />
      </h1>

      <div className="card pad-sm" style={{ gap: 10, borderRadius: 16 }}>
        <div className="je-row je-head">
          <div>Account</div>
          <div>Debit</div>
          <div>Credit</div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="je-row">
            <button
              className={`je-account ${l.debit ? '' : l.credit ? 'cr' : ''}`}
              onClick={() => !result && setPicker(i)}
              disabled={!!result}
              aria-label={`Account line ${i + 1}: ${l.account || 'choose'}`}
            >
              <span className="je-account-name">{l.account || 'Choose account'}</span> <span aria-hidden="true">▾</span>
            </button>
            <input
              className={`je-amt ${l.debit ? 'filled' : ''}`}
              inputMode="decimal"
              aria-label={`Debit amount line ${i + 1}`}
              value={l.debit}
              readOnly={!!result}
              onChange={(e) => set(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })}
            />
            <input
              className={`je-amt ${l.credit ? 'filled' : ''}`}
              inputMode="decimal"
              aria-label={`Credit amount line ${i + 1}`}
              value={l.credit}
              readOnly={!!result}
              onChange={(e) => set(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })}
            />
          </div>
        ))}
        {!result && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn dashed" style={{ flex: 1 }} onClick={() => setLines((ls) => [...ls, blank()])}>
              + Add line
            </button>
            {lines.length > 2 && (
              <button className="icon-btn" aria-label="Remove last line" onClick={() => setLines((ls) => ls.slice(0, -1))}>
                <Icon name="trash" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="row-between mono" style={{ paddingTop: 6, borderTop: '1px solid var(--line)', fontSize: 13 }}>
          <div style={{ color: t.balanced ? 'var(--correct)' : 'var(--wrong)' }}>{t.balanced ? '✓ Debits = credits' : '✗ Debits ≠ credits'}</div>
          <div className="caption">
            {fmt(t.dr)} / {fmt(t.cr)}
          </div>
        </div>
      </div>

      {!result && (
        <div className="action-bar">
          <button className="btn xl primary block" disabled={!t.balanced || lines.some((l) => (l.debit || l.credit) && !l.account)} onClick={check}>
            Check entry
          </button>
        </div>
      )}

      {result && (
        <>
          {!result.correct && (
            <div className="notice error">
              {result.issues.map((x, i) => (
                <div key={i}>
                  <strong>{x.account}</strong>: {x.kind === 'missing' ? 'missing from your entry' : x.kind === 'extra' ? 'should not be in this entry' : x.kind === 'side' ? 'wrong side (debit vs credit)' : 'wrong amount'}
                </div>
              ))}
            </div>
          )}

          <div className="stack" style={{ gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{result.correct ? 'Effect on the statements' : 'Correct entry and its effect'}</div>
            {!result.correct && <EntryTable lines={q.answer.lines} />}
            <Effects fx={q.answer.effects} />
          </div>

          <Explanation q={q} verdict={<Verdict correct={result.correct} ms={result.ms} />} hideAnswer />

          <button className="btn lg" onClick={() => setShowT((s) => !s)} aria-expanded={showT}>
            {showT ? 'Hide T-accounts' : 'Show T-accounts'}
          </button>
          {showT && (
            <div className="stack" style={{ gap: 10 }}>
              {!result.correct && <SectionLabel>Your entry</SectionLabel>}
              {!result.correct && <TAccounts lines={lines} />}
              <SectionLabel>{result.correct ? 'T-accounts' : 'Correct entry'}</SectionLabel>
              <TAccounts lines={q.answer.lines} />
            </div>
          )}

          <div className="action-bar">
            <RatingBar
              cap={result.correct ? 3 : 0}
              note={result.correct ? 'How well did you know it?' : 'Wrong entries come back soon: rated Again.'}
              onRate={(rating) => onDone({ correct: result.correct, rating, ms: result.ms })}
            />
          </div>
        </>
      )}

      {picker !== null && (
        <AccountPicker
          onClose={() => setPicker(null)}
          onPick={(name) => {
            set(picker, { account: name });
            setPicker(null);
          }}
        />
      )}
    </>
  );
}

function EntryTable({ lines }) {
  return (
    <div className="card pad-sm" style={{ gap: 6 }}>
      {lines.map((l, i) => (
        <div key={i} className="je-row" style={{ minHeight: 0 }}>
          <div style={{ paddingLeft: l.credit ? 18 : 0, fontSize: 14 }}>{l.account}</div>
          <div className="mono" style={{ textAlign: 'right', fontSize: 14 }}>
            {l.debit ? fmt(l.debit) : ''}
          </div>
          <div className="mono" style={{ textAlign: 'right', fontSize: 14 }}>
            {l.credit ? fmt(l.credit) : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

const TONE = (n) => (n > 0 ? 'var(--correct)' : n < 0 ? 'var(--wrong)' : 'var(--muted)');

function Effects({ fx }) {
  const card = (title, items, empty) => (
    <div className="fx-card">
      <div className="mono caption" style={{ fontSize: 12 }}>
        {title}
      </div>
      {items.length ? (
        items.map((e, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.4 }}>
            {e[0]} <b style={{ color: TONE(e[1]) }}>{signed(e[1])}</b>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
          No change <span className="caption">{empty ? `— ${empty}` : ''}</span>
        </div>
      )}
    </div>
  );
  return (
    <div className="grid-3">
      {card('IS', fx.IS, '')}
      {card('BS', fx.BS, '')}
      {card('CFS', fx.CFS, fx.note || '')}
    </div>
  );
}

function TAccounts({ lines }) {
  return (
    <div className="grid-2" style={{ gap: 10 }}>
      {tAccounts(lines).map((a) => (
        <div key={a.account} className="t-account">
          <div className="t-title">{a.account}</div>
          <div className="t-body">
            <div className="mono">
              {a.dr.map((v, i) => (
                <div key={i}>{fmt(v)}</div>
              ))}
            </div>
            <div className="mono">
              {a.cr.map((v, i) => (
                <div key={i}>{fmt(v)}</div>
              ))}
            </div>
          </div>
          <div className="t-bal mono">
            {a.balance >= 0 ? 'Dr' : 'Cr'} {fmt(a.balance)}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountPicker({ onPick, onClose }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const hits = searchAccounts(text, 10);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Choose an account" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 8 }}>
          <input ref={ref} className="input" placeholder="Search accounts (e.g. receivable, unearned)" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search accounts" />
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-list" role="listbox">
          {hits.map((name) => (
            <button key={name} role="option" aria-selected="false" onClick={() => onPick(name)}>
              {name}
              {aliasHint(name, text) && <span className="caption"> · {aliasHint(name, text)}</span>}
            </button>
          ))}
          {!hits.length && <div className="empty">No account matches “{text}”.</div>}
        </div>
      </div>
    </div>
  );
}

export { parseAmount };
