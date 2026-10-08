# Consultant Gym

A finance mastery trainer for your iPhone: three-statement mechanics, ratio families, ratio interactions, returns maths and diagnosis. It works offline (except the AI mentor) and stores all progress on your phone.

- **338 seed questions** across 5 layers and 36 topics, in four formats (multiple choice, flashcard, written, mental math)
- **Spaced repetition** (simplified SM-2): wrong or slow answers come back sooner
- **Ratio tree** (DuPont and ROIC) with live what-if sliders on a consistent sample company
- **Claude grading** (optional, your own API key): grades written answers 0-3 with an error tag, plus a weekly weakness diagnosis. Everything else is graded on the phone.

---

## 1. Put the app online (GitHub Pages, free)

You only do this once. No command line needed.

1. **Create a GitHub account** at <https://github.com/signup> (free).
2. **Install GitHub Desktop** from <https://desktop.github.com> and sign in with your GitHub account.
3. In GitHub Desktop: **File → Add local repository…** → choose the folder `C:\Users\belam\consultant-gym`.
   It will say "this directory does not appear to be a Git repository". Click **create a repository**, keep the name `consultant-gym`, and click **Create repository**.
4. Click **Publish repository** (top bar). **Untick "Keep this code private"**: free GitHub Pages needs a public repository.
   Your API key is never in the code, so nothing secret is published. The questions and code will be visible to anyone with the link.
5. Open the repository on github.com (GitHub Desktop: **Repository → View on GitHub**).
   Go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
6. Go to the **Actions** tab. A run called "Deploy to GitHub Pages" starts (if not, click it and press **Run workflow**). Wait for the green tick (about 1-2 minutes).
7. Your app is now live at:
   **`https://<your-github-username>.github.io/consultant-gym/`**

### Updating the app later
Whenever files change (e.g. you add questions): open GitHub Desktop → write a short summary bottom-left → **Commit to main** → **Push origin**. The site rebuilds automatically in about 2 minutes. Your phone picks up the new version next time you open the app online.

---

## 2. Install it on your iPhone

1. Open **Safari** (it must be Safari) and go to your app's address from step 1.7.
2. Tap the **Share** button (square with an arrow) → scroll down → **Add to Home Screen** → **Add**.
3. Open it from the new home-screen icon. It runs full-screen like a normal app.
4. Open it once while online so it can save everything for offline use. After that, everything except the mentor works in aeroplane mode.

**Back up your progress.** Everything is stored on your phone only. iOS can clear a web app's storage, for example when the phone is short of space. Every week or so go to **Progress → Export progress** and save the file to iCloud Drive. To restore: **Settings → Import**. The app reminds you if you haven't exported for 7 days.

---

## 3. Add your Anthropic API key (optional)

The app works fully without a key: you grade written answers yourself. With a key, Claude (`claude-sonnet-5-5`) is used for **two things only**:

- **Grading written answers**: a score of 0-3, a one-line reason, and an error tag (Concept / Formula / Arithmetic / Units-format / Misread / Guessed). The score sets your spaced-repetition rating (0 Again … 3 Easy).
- **Weekly weakness diagnosis** (Mentor tab): only a summary is sent (counts by topic and error tag for the last 7 days), never your answers.

Multiple choice, flashcards and numeric answers are always graded on the phone, with no API call. Each call sends only the question, your answer, the expected answer (plus Northwind figures when the question is about the sample company). Thinking is switched off and the reply is capped at about 150 words: a grade costs roughly $0.001.

1. Go to <https://console.anthropic.com> → sign in → **API Keys** → **Create Key**. Copy it (starts with `sk-ant-`).
2. Recommended: in the console under **Billing / Limits**, set a **monthly spend limit** (e.g. $5).
3. In the app: **Today → gear icon (Settings) → API key** → paste → **Save key** → **Test connection**.
4. **Settings → API usage and cost** shows tokens and estimated cost for this session and in total ($2 per million input tokens, $10 per million output tokens).

**Where the key lives.** A web app cannot use the iPhone Keychain, so the app does the closest thing a browser allows. The key is encrypted (AES-GCM) with a device key that the browser generates and marks non-exportable, so no script can read that device key out. Only the ciphertext is stored. The key is never in the source code, never logged, never in the progress export, and only ever sent to `api.anthropic.com`. Someone using the app on your unlocked phone could still make calls with it, which is why the spend limit matters. **Remove key** deletes it.

If there is no key, you are offline, or a call fails, the app tells you why and switches to self-grading (score yourself 0-3 and optionally pick the error tag, which also feeds the weekly summary).

---

## 4. Add your own questions

Questions live in `src/data/questions/`, one JSON file per group of topics. Every `.json` file in that folder is loaded automatically, so you can edit an existing file or add a new one (e.g. `my-questions.json` containing `[ ... ]`).

**Easiest way, no tools needed:** on github.com open the repository → `src/data/questions/` → a file → pencil icon (Edit) → paste a new question inside the list (mind the commas between questions) → **Commit changes**. The site rebuilds automatically. If you made a mistake, the build in the **Actions** tab turns red and its log tells you which question is wrong. The live site keeps the previous version until you fix it.

If a question is about the sample company, add `"uses_company": true` (or mention Northwind in the prompt) and the grader will receive the company's key figures.

### Templates

Every question has: `id` (unique), `layer` (1-5), `topic` (see the list below), `difficulty` (`easy` | `medium` | `hard`), `format`, `style` (`definition` | `logical` | `rhetorical` | `walkthrough` | `calculation` | `diagnosis`), `prompt`, `answer`, `explanation.reasoning` (list of steps), `why_it_matters`, `interactions` (chips, `dir` = `up` | `down` | `mixed`), `common_trap`. Optional: `"needs_review": true` shows a "Needs review" tag.

**Multiple choice** (`answer.index` is the position of the correct option, counting from 0; options are shuffled on screen):
```json
{
  "id": "MY-001",
  "layer": 2,
  "topic": "solvency",
  "difficulty": "easy",
  "format": "mcq",
  "style": "definition",
  "prompt": "Interest cover measures…",
  "options": ["How many times EBIT covers interest", "Debt divided by equity", "Cash divided by debt", "Interest as % of revenue"],
  "answer": { "index": 0 },
  "explanation": { "reasoning": ["Interest cover = EBIT ÷ interest expense."] },
  "why_it_matters": "It is the first test of whether a company can service its debt.",
  "interactions": [{ "label": "Net debt / EBITDA", "dir": "down" }],
  "common_trap": "Confusing cover with leverage."
}
```

**Mental math** (`tolerance` is the accepted ± band; `check` is an optional formula the checker recomputes; `unit` is `%`, `x`, `days`, `years` or `""`):
```json
{
  "id": "MY-002",
  "layer": 4,
  "topic": "irr",
  "difficulty": "medium",
  "format": "mental_math",
  "style": "calculation",
  "prompt": "An investment doubles in 4 years. IRR?",
  "answer": { "value": 18.92, "unit": "%", "tolerance": 0.6 },
  "check": "(Math.pow(2, 1 / 4) - 1) * 100",
  "benchmarks": ["2x / 4y ≈ 19%", "2x / 5y ≈ 15%"],
  "explanation": { "reasoning": ["2^(1/4) − 1 = 18.9%"], "shortcut": "Rule of 72: 72 / 4 = 18%, nudge up → ~19%." },
  "why_it_matters": "Benchmarks let you sanity-check any return claim instantly.",
  "interactions": [{ "label": "MOIC", "dir": "up" }],
  "common_trap": "100% / 4 = 25%."
}
```

**Flashcard** (`answer` holds the back of the card):
```json
"answer": { "meaning": "…", "formula": "…", "interpretation": "…", "high_signals": "…", "low_signals": "…" }
```
with `"explanation": { "reasoning": [] }`.

**Written** (graded by the mentor; `grid` is optional, for three-statement walkthroughs):
```json
"answer": { "model_answer": "…", "rubric": ["key point 1", "key point 2"], "grid": { "IS": "…", "CFS": "…", "BS": "…" } }
```

### Topic ids
- **Layer 1**: three_statements, accruals, working_capital, d_and_a, capex, deferred_revenue, inventory, debt_interest, dividends, buybacks, impairments, leases
- **Layer 2**: profitability, efficiency, liquidity, solvency, growth, valuation
- **Layer 3**: dupont, roic_tree, growth_reinvestment, operating_leverage, financial_leverage, margin_turnover
- **Layer 4**: capital_decisions, npv, irr, moic, payback, wacc, leverage_returns, lbo_bridge
- **Layer 5**: ratio_patterns, cash_vs_profit, statement_extracts, value_impact

---

## How the study engine works

- **Daily review**: every question that is due, plus up to 10 new ones (foundations first), capped at 25.
- **Ratings**: Again / Hard / Good / Easy. A wrong answer can only be rated Again and comes back in the same session. A correct mental-math answer that used more than 75% of the timer is capped at Hard. Written answers are scored 0-3 (by Claude or by you), and the score is the rating: 0 Again, 1 Hard, 2 Good, 3 Easy.
- **Mastery %** per topic and layer combines spacing (interval up to 21 days) and recent accuracy.
- **Ratio tree**: every value comes from one set of statements (edit it in **Settings → Sample company**). What-ifs hold revenue and equity constant; any extra capital need is funded with debt, and interest is recalculated, so a single change ripples through margin, turnover and leverage.

---

## For developers

```bash
npm install
npm run dev      # local dev server
npm run check    # validate the question bank (schema + recomputed answers)
npm run build    # check + production build into dist/
npm run icons    # regenerate the PWA icons
```

Stack: React 18 + Vite, `vite-plugin-pwa` (offline service worker), IndexedDB via `idb`, Anthropic TypeScript SDK called directly from the browser. Hash routing (`#/…`) so GitHub Pages never returns 404s. The relative base path (`./`) means any repository name works.

```
src/
  ai/          Messages API client, mentor prompts and JSON schemas
  components/  UI building blocks (explanation card, rating bar, ring timer, …)
  data/        curriculum (layers/topics) and questions/*.json
  engine/      spaced repetition, session builder, answer checking, stats
  finance/     sample company model and ratio-tree definitions
  screens/     Today, Layers, Session, Mentor, Challenge, Progress, RatioTree, Settings
  storage/     IndexedDB and export/import
```
