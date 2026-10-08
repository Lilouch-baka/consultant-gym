import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from './storage/db.js';
import { SEED_QUESTIONS } from './data/questions.js';
import { newReview, schedule } from './engine/srs.js';
import { DEFAULT_COMPANY, sanitizeCompany } from './finance/model.js';
import { clearApiKey, loadApiKey, saveApiKey } from './storage/secrets.js';

// The API key is NOT a setting: it lives encrypted in storage/secrets.js and only in memory here.
export const DEFAULT_SETTINGS = {
  theme: 'light',
  timers: { easy: 30, medium: 60, hard: 90 },
  company: DEFAULT_COMPANY,
};

const DEFAULT_META = { streak: 0, lastStudyDay: null, studyDays: 0, lastExport: null };

const AppContext = createContext(null);

export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey() {
  return dayKey(Date.now() - 24 * 60 * 60 * 1000);
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0A1426' : '#FFFFFF');
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [reviews, setReviews] = useState({});
  const [customQuestions, setCustomQuestions] = useState([]);
  const [mentorLog, setMentorLog] = useState([]);
  const [apiKey, setApiKeyState] = useState('');
  const [usage, setUsage] = useState({ session: { input: 0, output: 0, calls: 0 }, total: { input: 0, output: 0, calls: 0 } });
  const [diagnosis, setDiagnosis] = useState(null);

  const load = useCallback(async () => {
    const [s, m, rs, cq, ml, u, dg] = await Promise.all([
      db.kvGet('settings'),
      db.kvGet('meta'),
      db.getAll('reviews'),
      db.getAll('custom_questions'),
      db.getAll('mentor_log'),
      db.kvGet('usage_total'),
      db.kvGet('diagnosis'),
    ]);
    // Migrate a key saved in plain text by the first version into encrypted storage.
    if (s && s.apiKey) {
      await saveApiKey(s.apiKey);
      delete s.apiKey;
      delete s.model;
      await db.kvSet('settings', s);
    }
    setApiKeyState(await loadApiKey());
    if (u) setUsage((prev) => ({ ...prev, total: u }));
    setDiagnosis(dg || null);
    const merged = { ...DEFAULT_SETTINGS, ...(s || {}) };
    merged.timers = { ...DEFAULT_SETTINGS.timers, ...(s?.timers || {}) };
    merged.company = sanitizeCompany(s?.company || DEFAULT_COMPANY);
    setSettings(merged);
    applyTheme(merged.theme);
    setMeta({ ...DEFAULT_META, ...(m || {}) });
    setReviews(Object.fromEntries(rs.map((r) => [r.qid, r])));
    setCustomQuestions(cq);
    setMentorLog(ml.sort((a, b) => b.ts - a.ts));
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    db.requestPersistence();
  }, [load]);

  const questions = useMemo(() => {
    const ids = new Set(SEED_QUESTIONS.map((q) => q.id));
    return [...SEED_QUESTIONS, ...customQuestions.filter((q) => !ids.has(q.id))];
  }, [customQuestions]);

  const questionById = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      db.kvSet('settings', next);
      if (patch.theme) applyTheme(next.theme);
      return next;
    });
  }, []);

  const touchStreak = useCallback(() => {
    setMeta((prev) => {
      const today = dayKey();
      if (prev.lastStudyDay === today) return prev;
      const streak = prev.lastStudyDay === yesterdayKey() ? prev.streak + 1 : 1;
      const next = { ...prev, streak, lastStudyDay: today, studyDays: (prev.studyDays || 0) + 1 };
      db.kvSet('meta', next);
      return next;
    });
  }, []);

  // Record one answered question: update spaced repetition and history.
  const recordAnswer = useCallback(
    (qid, { correct, rating, ms, given }) => {
      const now = Date.now();
      setReviews((prev) => {
        const base = prev[qid] || newReview(qid);
        const next = schedule(base, rating, now);
        next.history = [...(base.history || []), { ts: now, correct: !!correct, rating, ms: ms || null, given: given ?? null }].slice(-30);
        db.put('reviews', next);
        return { ...prev, [qid]: next };
      });
      touchStreak();
    },
    [touchStreak],
  );

  const saveCustomQuestion = useCallback(async (q) => {
    await db.put('custom_questions', q);
    setCustomQuestions((prev) => [...prev.filter((x) => x.id !== q.id), q]);
  }, []);

  const deleteCustomQuestion = useCallback(async (id) => {
    await db.del('custom_questions', id);
    setCustomQuestions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addMentorLog = useCallback(async (entry) => {
    const rec = { ...entry, ts: Date.now() };
    const id = await db.put('mentor_log', rec);
    setMentorLog((prev) => [{ ...rec, id }, ...prev]);
  }, []);

  const markExported = useCallback(() => {
    setMeta((prev) => {
      const next = { ...prev, lastExport: Date.now() };
      db.kvSet('meta', next);
      return next;
    });
  }, []);

  // ---------- API key (encrypted at rest, only in memory here) ----------
  const setApiKey = useCallback(async (plain) => {
    await saveApiKey(plain);
    setApiKeyState(plain);
  }, []);

  const removeApiKey = useCallback(async () => {
    await clearApiKey();
    setApiKeyState('');
  }, []);

  // ---------- token usage ----------
  const recordUsage = useCallback((u) => {
    if (!u) return;
    setUsage((prev) => {
      const add = (x) => ({ input: x.input + u.input, output: x.output + u.output, calls: x.calls + 1 });
      const next = { session: add(prev.session), total: add(prev.total) };
      db.kvSet('usage_total', next.total);
      return next;
    });
  }, []);

  const saveDiagnosis = useCallback(async (d) => {
    await db.kvSet('diagnosis', d);
    setDiagnosis(d);
  }, []);

  const exportData = useCallback(async () => {
    const [rs, cq, ml] = await Promise.all([db.getAll('reviews'), db.getAll('custom_questions'), db.getAll('mentor_log')]);
    // Settings never contain the API key, and the encrypted key is not exported.
    return {
      app: 'consultant-gym',
      version: 2,
      exportedAt: new Date().toISOString(),
      settings,
      meta,
      reviews: rs,
      custom_questions: cq,
      mentor_log: ml,
    };
  }, [settings, meta]);

  const importData = useCallback(
    async (data) => {
      if (!data || data.app !== 'consultant-gym') throw new Error('This file is not a Consultant Gym export.');
      // eslint-disable-next-line no-unused-vars
      const { apiKey: _ignored, model: _m, ...imported } = data.settings || {};
      const nextSettings = { ...DEFAULT_SETTINGS, ...imported };
      await db.replaceAll({
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        custom_questions: Array.isArray(data.custom_questions) ? data.custom_questions : [],
        mentor_log: Array.isArray(data.mentor_log) ? data.mentor_log : [],
        kv: { settings: nextSettings, meta: { ...DEFAULT_META, ...(data.meta || {}) } },
      });
      await load();
    },
    [load],
  );

  const value = {
    apiKey,
    setApiKey,
    removeApiKey,
    usage,
    recordUsage,
    diagnosis,
    saveDiagnosis,
    ready,
    settings,
    updateSettings,
    meta,
    reviews,
    questions,
    questionById,
    customQuestions,
    saveCustomQuestion,
    deleteCustomQuestion,
    mentorLog,
    addMentorLog,
    recordAnswer,
    exportData,
    importData,
    markExported,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

export function currentStreak(meta) {
  if (!meta.lastStudyDay) return 0;
  if (meta.lastStudyDay === dayKey() || meta.lastStudyDay === yesterdayKey()) return meta.streak;
  return 0;
}
