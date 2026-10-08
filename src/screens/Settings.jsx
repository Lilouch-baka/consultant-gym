import { useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { BackButton, ErrorNote, SectionLabel, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { MODEL, PRICE, askClaude, costUsd } from '../ai/client.js';
import { COMPANY_FIELDS, DEFAULT_COMPANY, buildStatements, computeRatios, validateCompany } from '../finance/model.js';
import { exportProgress, readJsonFile } from '../storage/backup.js';

export default function Settings() {
  const app = useApp();
  const { settings, updateSettings, customQuestions, deleteCustomQuestion } = app;
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  async function onImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      if (!window.confirm('Replace all progress on this device with the contents of this file?')) return;
      await app.importData(data);
      setMsg('Progress imported.');
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    }
  }

  async function onExport() {
    try {
      const how = await exportProgress(app);
      setMsg(how === 'shared' ? 'Export shared.' : 'Export downloaded.');
    } catch (err) {
      if (err?.name !== 'AbortError') setMsg(`Export failed: ${err.message}`);
    }
  }

  return (
    <div className="screen tight">
      <div className="row">
        <BackButton />
        <h1 className="title" style={{ fontSize: 26 }}>
          Settings
        </h1>
      </div>

      <ApiKeySection />
      <UsageSection />
      <CompanyModeSection />

      <section className="card" aria-labelledby="look-h">
        <SectionLabel>
          <span id="look-h">Appearance</span>
        </SectionLabel>
        <div className="segmented" role="group" aria-label="Theme">
          <button aria-pressed={settings.theme !== 'dark'} onClick={() => updateSettings({ theme: 'light' })}>
            Light
          </button>
          <button aria-pressed={settings.theme === 'dark'} onClick={() => updateSettings({ theme: 'dark' })}>
            Dark
          </button>
        </div>
        <label className="toggle" style={{ fontSize: 15 }}>
          <span>
            Reduce motion <span className="caption">· also follows your iPhone setting</span>
          </span>
          <input type="checkbox" switch="" checked={!!settings.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: e.target.checked })} />
        </label>
        {settings.hintsSeen?.dictation && (
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => updateSettings({ hintsSeen: {} })}>
            Show tips again
          </button>
        )}
      </section>

      <section className="card" aria-labelledby="timer-h">
        <SectionLabel>
          <span id="timer-h">Mental-math timers (seconds)</span>
        </SectionLabel>
        <div className="grid-3">
          {['easy', 'medium', 'hard'].map((d) => (
            <div className="field" key={d}>
              <label htmlFor={`t-${d}`} style={{ textTransform: 'capitalize' }}>
                {d}
              </label>
              <input
                id={`t-${d}`}
                className="input mono"
                inputMode="numeric"
                value={settings.timers[d]}
                onChange={(e) => {
                  const v = Math.max(5, Math.min(600, Number(e.target.value.replace(/\D/g, '')) || 0));
                  updateSettings({ timers: { ...settings.timers, [d]: v } });
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="data-h">
        <SectionLabel>
          <span id="data-h">Your data</span>
        </SectionLabel>
        <p className="caption" style={{ lineHeight: 1.5 }}>
          Progress is stored on this device only. Export it regularly (save it to iCloud Drive) and import it on a new phone.
        </p>
        <div className="grid-2">
          <button className="btn" onClick={onExport}>
            <Icon name="download" size={18} /> Export
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={18} /> Import
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import progress file" onChange={onImport} />
        {msg && (
          <div className="caption" role="status">
            {msg}
          </div>
        )}
      </section>

      <CompanyEditor />

      {customQuestions.length > 0 && (
        <section className="card" aria-labelledby="cq-h">
          <SectionLabel>
            <span id="cq-h">Saved AI questions ({customQuestions.length})</span>
          </SectionLabel>
          {customQuestions.map((q) => (
            <div key={q.id} className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>{q.prompt}</div>
              <button className="icon-btn" aria-label="Delete question" onClick={() => deleteCustomQuestion(q.id)}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="caption" style={{ textAlign: 'center', fontSize: 12 }}>
        Consultant Gym · works offline except the mentor
      </div>
    </div>
  );
}

function CompanyEditor() {
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = useState(settings.company);
  const [saved, setSaved] = useState('');
  const numeric = { ...draft };
  for (const f of COMPANY_FIELDS) numeric[f.key] = Number(draft[f.key]);
  const valid = COMPANY_FIELDS.every((f) => Number.isFinite(numeric[f.key]));
  const problems = valid ? validateCompany(numeric) : ['Every field needs a number.'];
  const s = valid ? buildStatements(numeric) : null;
  const r = s && problems.length === 0 ? computeRatios(s) : null;
  const groups = [...new Set(COMPANY_FIELDS.map((f) => f.group))];

  function save() {
    updateSettings({ company: numeric });
    setSaved('Saved. The ratio tree now uses these figures.');
  }

  return (
    <section className="card" aria-labelledby="co-h">
      <SectionLabel>
        <span id="co-h">Sample company (ratio tree)</span>
      </SectionLabel>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="co-name">Name</label>
          <input id="co-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="co-cur">Currency</label>
          <input id="co-cur" className="input" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
        </div>
      </div>
      {groups.map((g) => (
        <div key={g} className="stack">
          <div className="h3" style={{ fontSize: 14 }}>
            {g}
          </div>
          {COMPANY_FIELDS.filter((f) => f.group === g).map((f) => (
            <div key={f.key} className="kv">
              <label htmlFor={`co-${f.key}`} style={{ fontSize: 14, color: 'var(--text-2)' }}>
                {f.label}
              </label>
              <input
                id={`co-${f.key}`}
                className="input mono"
                style={{ width: 110, textAlign: 'right' }}
                inputMode="decimal"
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      ))}
      {s && (
        <div className="inner mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
          Equity (balancing item): {s.equity.toFixed(1)}
          <br />
          EBIT {s.ebit.toFixed(1)} · Net income {s.netIncome.toFixed(1)}
          {r && (
            <>
              <br />
              ROE {(r.roe * 100).toFixed(1)}% · ROIC {(r.roic * 100).toFixed(1)}% · DSO {r.dso.toFixed(0)} d
            </>
          )}
        </div>
      )}
      {problems.length > 0 && (
        <div className="notice error" role="alert">
          {problems.join(' ')}
        </div>
      )}
      <div className="grid-2">
        <button className="btn" onClick={() => setDraft(DEFAULT_COMPANY)}>
          <Icon name="refresh" size={18} /> Defaults
        </button>
        <button className="btn primary" disabled={problems.length > 0} onClick={save}>
          Save company
        </button>
      </div>
      {saved && (
        <div className="caption" role="status">
          {saved}
        </div>
      )}
    </section>
  );
}

function ApiKeySection() {
  const { apiKey, setApiKey, removeApiKey, recordUsage, settings, updateSettings } = useApp();
  const [draft, setDraft] = useState('');
  const [wsDraft, setWsDraft] = useState(settings.workspaceId || '');
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    const k = draft.trim();
    if (!k) return;
    try {
      await setApiKey(k);
      setDraft('');
      setError(null);
      setStatus(
        k.startsWith('sk-ant-admin')
          ? 'Key saved. Note: it looks like an Admin key, which usually cannot call Claude. Tap Test connection to check.'
          : 'Key saved, encrypted on this device. Tap Test connection to check it.',
      );
    } catch {
      setStatus('Could not save the key securely on this browser.');
    }
  }

  async function test() {
    setTesting(true);
    setError(null);
    setStatus('');
    try {
      const { usage } = await askClaude({ apiKey, workspaceId: wsDraft.trim(), content: 'Reply with the single word OK.', maxTokens: 10 });
      recordUsage(usage);
      setStatus(`Connected to ${MODEL}.`);
    } catch (e) {
      if (e.usage) recordUsage(e.usage);
      setError(e);
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card" aria-labelledby="ai-h">
      <SectionLabel>
        <span id="ai-h">Claude API</span>
      </SectionLabel>
      <div className="kv">
        <span className="caption">Model</span>
        <span className="mono" style={{ fontSize: 13 }}>
          {MODEL}
        </span>
        <span className="caption">Key</span>
        <span className="mono" style={{ fontSize: 13, color: apiKey ? 'var(--correct)' : 'var(--muted)' }}>
          {apiKey ? `saved (…${apiKey.slice(-4)})` : 'not set'}
        </span>
      </div>
      <form className="field" onSubmit={save}>
        <label htmlFor="api-key">{apiKey ? 'Replace API key' : 'API key'}</label>
        <input
          id="api-key"
          className="input mono"
          style={{ fontSize: 14 }}
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={draft}
          placeholder="sk-ant-…"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={!draft.trim()}>
          Save key
        </button>
      </form>
      <div className="field">
        <label htmlFor="ws-id">Workspace ID (only if Anthropic asks for it)</label>
        <input
          id="ws-id"
          className="input mono"
          style={{ fontSize: 14 }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={wsDraft}
          placeholder="wrkspc_…"
          onChange={(e) => setWsDraft(e.target.value)}
          onBlur={() => updateSettings({ workspaceId: wsDraft.trim() })}
        />
        <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Some newer keys are linked to your user account and must name a workspace. Find the ID on the workspace page in the Anthropic console (Settings →
          Workspaces). Leave empty for a normal workspace key.
        </div>
      </div>
      <div className="grid-2">
        <button className="btn" onClick={test} disabled={!apiKey || testing}>
          Test connection
        </button>
        <button
          className="btn danger"
          disabled={!apiKey}
          onClick={async () => {
            await removeApiKey();
            setStatus('Key removed from this device.');
          }}
        >
          <Icon name="trash" size={18} /> Remove key
        </button>
      </div>
      {testing && <Spinner label="Testing…" />}
      {status && (
        <div className="caption" role="status">
          {status}
        </div>
      )}
      <ErrorNote error={error} />
      <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Used only to grade written answers and for the weekly diagnosis. Everything else is graded on the phone. The key is encrypted with a device key that
        cannot be exported, sent only to api.anthropic.com, never logged and never included in exports. Set a monthly spend limit on it in the Anthropic console.
      </div>
    </section>
  );
}

function UsageSection() {
  const { usage } = useApp();
  const row = (label, u) => (
    <div key={label} className="stack" style={{ gap: 4 }}>
      <div className="row-between">
        <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ fontSize: 14 }}>
          ${costUsd(u.input, u.output).toFixed(4)}
        </span>
      </div>
      <div className="caption mono" style={{ fontSize: 12 }}>
        {u.calls} calls · {u.input.toLocaleString()} in · {u.output.toLocaleString()} out tokens
      </div>
    </div>
  );
  return (
    <section className="card" aria-labelledby="usage-h">
      <SectionLabel>
        <span id="usage-h">API usage and cost</span>
      </SectionLabel>
      {row('This session', usage.session)}
      <div className="divider" />
      {row('All time on this device', usage.total)}
      <div className="caption" style={{ fontSize: 12 }}>
        Estimate at ${PRICE.input}/M input and ${PRICE.output}/M output tokens. A session starts when you open the app.
      </div>
    </section>
  );
}

function CompanyModeSection() {
  const { settings, updateSettings } = useApp();
  const [v, setV] = useState(settings.companyMode || '');
  return (
    <section className="card" aria-labelledby="cm-h">
      <SectionLabel>
        <span id="cm-h">Partner analysis</span>
      </SectionLabel>
      <div className="field">
        <label htmlFor="company-mode">Company being analysed</label>
        <input
          id="company-mode"
          className="input"
          value={v}
          placeholder="Almarai vs SADAFCO · FY2025"
          onChange={(e) => setV(e.target.value)}
          onBlur={() => updateSettings({ companyMode: v.trim() || 'Almarai vs SADAFCO · FY2025' })}
        />
        <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Shown on every partner question. Name two companies with “vs” so the checks can spot answers that cover only one.
        </div>
      </div>
    </section>
  );
}
