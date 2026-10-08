import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from './storage/db.js';
import { SEED_QUESTIONS } from './data/questions.js';
import { newReview, schedule } from './engine/srs.js';
import { DEFAULT_COMPANY, sanitizeCompany } from './finance/model.js';
import { DEFAULT_MODEL } from './ai/client.js';

export const DEFAULT_SETTINGS = {
  apiKey: '',
  model: DEFAULT_MODEL,
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

  const load = useCallback(async () => {
    const [s, m, rs, cq, ml] = await Promise.all([
      db.kvGet('settings'),
      db.kvGet('meta'),
      db.getAll('reviews'),
      db.getAll('custom_questions'),
      db.getAll('mentor_log'),
    ]);
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

  const exportData = useCallback(async () => {
    const [rs, cq, ml] = await Promise.all([db.getAll('reviews'), db.getAll('custom_questions'), db.getAll('mentor_log')]);
    // The API key is never exported.
    // eslint-disable-next-line no-unused-vars
    const { apiKey, ...safeSettings } = settings;
    return {
      app: 'consultant-gym',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: safeSettings,
      meta,
      reviews: rs,
      custom_questions: cq,
      mentor_log: ml,
    };
  }, [settings, meta]);

  const importData = useCallback(
    async (data) => {
      if (!data || data.app !== 'consultant-gym') throw new Error('This file is not a Consultant Gym export.');
      const keepKey = settings.apiKey;
      const nextSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}), apiKey: keepKey };
      await db.replaceAll({
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        custom_questions: Array.isArray(data.custom_questions) ? data.custom_questions : [],
        mentor_log: Array.isArray(data.mentor_log) ? data.mentor_log : [],
        kv: { settings: nextSettings, meta: { ...DEFAULT_META, ...(data.meta || {}) } },
      });
      await load();
    },
    [settings.apiKey, load],
  );

  const value = {
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
