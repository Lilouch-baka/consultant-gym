import { useRef, useState } from 'react';
import { useApp } from '../state.jsx';
import { BackButton, SectionLabel } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { MODEL_OPTIONS } from '../ai/client.js';
import { COMPANY_FIELDS, DEFAULT_COMPANY, buildStatements, computeRatios, validateCompany } from '../finance/model.js';
import { exportProgress, readJsonFile } from '../storage/backup.js';

export default function Settings() {
  const app = useApp();
  const { settings, updateSettings, customQuestions, deleteCustomQuestion } = app;
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');
  const [modelDraft, setModelDraft] = useState(settings.model);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  function saveKey(e) {
    e.preventDefault();
    updateSettings({ apiKey: keyDraft.trim() });
    setKeyMsg(keyDraft.trim() ? 'Key saved on this device.' : 'Key removed.');
  }

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

      <section className="card" aria-labelledby="ai-h">
        <SectionLabel>
          <span id="ai-h">AI mentor</span>
        </SectionLabel>
        <form className="field" onSubmit={saveKey}>
          <label htmlFor="api-key">Anthropic API key</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              id="api-key"
              className="input mono"
              style={{ fontSize: 14 }}
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={keyDraft}
              placeholder="sk-ant-…"
              onChange={(e) => setKeyDraft(e.target.value)}
            />
            <button type="button" className="icon-btn" aria-label={showKey ? 'Hide key' : 'Show key'} onClick={() => setShowKey((s) => !s)}>
              <Icon name="eye" size={18} />
            </button>
          </div>
          <button className="btn primary" type="submit">
            Save key
          </button>
          {keyMsg && (
            <div className="caption" role="status">
              {keyMsg}
            </div>
          )}
          <div className="caption" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Stored only in this browser on this device and sent only to api.anthropic.com. It is never included in exports. Use a key with a monthly spend limit.
          </div>
        </form>
        <div className="field">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            className="select"
            value={MODEL_OPTIONS.some((m) => m.id === modelDraft) ? modelDraft : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setModelDraft('');
                return;
              }
              setModelDraft(e.target.value);
              updateSettings({ model: e.target.value });
            }}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            <option value="custom">Other model id…</option>
          </select>
          {!MODEL_OPTIONS.some((m) => m.id === modelDraft) && (
            <input
              aria-label="Custom model id"
              className="input mono"
              style={{ fontSize: 14 }}
              value={modelDraft}
              placeholder="claude-…"
              onChange={(e) => setModelDraft(e.target.value)}
              onBlur={() => modelDraft.trim() && updateSettings({ model: modelDraft.trim() })}
            />
          )}
        </div>
      </section>

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
