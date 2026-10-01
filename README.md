# Module Feedback Insight Platform (frontend prototype)

A responsive React app where students submit anonymous module feedback and lecturers see themes, sentiment and weekly trends. It runs entirely on **mock data** behind a mock API, and is structured so the real backend, database, identity provider and ML models can be swapped in without UI changes.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Build for deployment with `npm run build` (output in `dist/`).

Requires Node 22.22 or newer (React Router 8 minimum).

## Demo accounts

On the login page, use the **Development only** panel, or type any demo email with any password.

| Account | Email | What it shows |
|---|---|---|
| Student | `student@example.edu` | 4 modules: Available, Submitted and Closed states; the feedback form |
| Lecturer A | `lecturer@example.edu` | INF2001, INF2003. **INF2003 is the main demo module** |
| Lecturer B | `lecturer.b@example.edu` | BAC2005 only |
| Lecturer C | `lecturer.c@example.edu` | INF2006, INF2002 |
| Lecturer D | `lecturer.d@example.edu` | ENG2002 has **no feedback** (empty state) |
| Lecturer E | `lecturer.e@example.edu` | CSC3005 has **3 responses** (privacy threshold) |
| Admin | `admin@example.edu` | Participation overview for all modules |

### Things to try

- **Trends**: Lecturer A → INF2003 → theme table shows *Increasing* (Lab Instructions, Assessment), *Improving* (Teaching Quality) and *Stable*. Open **Lab Instructions**: 24 comments, 67% negative, "increasing since Week 3".
- **Per-theme privacy**: INF2003's *Tutorials* theme has 3 comments, so its breakdown is hidden.
- **Row-level authorisation**: as Lecturer A, visit `/lecturer/modules/BAC2005` → 403.
- **Role authorisation**: as the student, visit `/lecturer` → 403.
- **Submit feedback**: as the student, give feedback on INF2001, then sign in as Lecturer A and find it in the Feedback Explorer (Week 8).
- **Error states**: account menu → *Developer tools* → *Simulate API errors*, then reload a page and use **Retry**.
- **Filters**: are stored in the URL (e.g. `?week=4&theme=lab-instructions`), so filtered views can be bookmarked and shared.

*Reset demo submissions* in the account menu clears anything submitted during a session.

## Architecture

```
 UI (pages, components)
        │  calls only
        ▼
 services/*Service.js          ← one function per API endpoint
        │
        ▼
 services/apiClient.js         ← VITE_API_MODE decides where requests go
        │
        ├── mock ──► src/mock/mockServer.js   (in-browser stand-in for the backend)
        │               ├── policies.js        authorisation + privacy rules
        │               ├── analyticsEngine.js aggregation (sentiment, themes, trends)
        │               ├── stubClassifier.js  placeholder for the ML service
        │               └── db.js              tables from src/data (+ localStorage)
        │
        └── http ──► ${VITE_API_BASE_URL}/api/...   (real backend behind the ALB)
```

The UI never imports from `src/mock` or `src/data` to get data. Pages only know service functions and the JSON they return. The one exception is the login page's demo-account list, which exists only in development/mock mode.

## API contract

These are the endpoints the real backend must implement. The mock server implements them all, so its handlers double as a reference implementation.

| Method | Path | Who | Returns |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ token, user }` (replaced by Cognito) |
| GET | `/api/modules` | all | Modules scoped to the caller's role |
| GET | `/api/modules/:moduleId` | enrolled / assigned / admin | Module header + feedback period |
| GET | `/api/modules/:moduleId/analytics?week&theme&sentiment` | module's lecturers | KPIs, sentiment, themes, weekly series, sample comments |
| GET | `/api/modules/:moduleId/themes/:themeId` | module's lecturers | Theme KPIs, trend, weekly series, sample comments |
| GET | `/api/modules/:moduleId/feedback?theme&sentiment&week&q&page` | module's lecturers | Paged comments |
| GET | `/api/feedback?…` | lecturers | Paged comments across all their modules |
| POST | `/api/feedback` | enrolled students | `201 { feedbackId, submittedAt }` |
| GET | `/api/themes` | all | Theme list |
| GET | `/api/admin/overview` | admins | Totals + module participation table |

Errors use `{ message, errors? }` with status 400/401/403/404/409/422/5xx. The UI maps 403 and 404 to their own pages, and everything else to a retryable error state.

## Integration guide

| When adding | Change | UI changes needed |
|---|---|---|
| **Backend REST API** | Set `VITE_API_MODE=http` and `VITE_API_BASE_URL` (HTTPS) in `.env`. Port the rules in `src/mock/policies.js` and `analyticsEngine.js` to the server. | None |
| **RDS PostgreSQL** | Tables mirror `src/data`: `users`, `modules`, `module_lecturers`, `module_students`, `feedback_periods`, `themes`, `feedback`, `feedback_analysis`, plus `submission_receipts` (see below). | None |
| **Cognito** | Replace the bodies of `signIn`, `signOut` and `getCurrentUser` in `services/authService.js`, and the token store in `services/session.js`. Map the Cognito group to `user.role`. | None |
| **ML sentiment + themes** | The model service writes `feedback_analysis` rows in the agreed format (below). Delete `stubClassifier.js`. | None |
| **Real enrolments** | Populate `module_students` from the student information system. | None |

### ML output format

```json
{ "feedbackId": "FB001", "sentiment": "negative", "sentimentScore": 0.86, "theme": "Lab Instructions", "themeConfidence": 0.79 }
```

The UI never sees model internals, only these fields (via aggregated API responses). `modelVersion` and `analysedAt` are stored alongside for traceability.

## Security and privacy design

**Frontend checks are not security.** `RequireRole` and hidden navigation links only decide what to render. Every rule is enforced in `src/mock/policies.js` on the server side of the API boundary, and the UI simply reacts to 401/403. The mock tokens are **not secure** and exist only for the demo.

What the prototype models, ready for the real backend:

- **Module-level (row-level) authorisation**: lecturers see only modules in `module_lecturers`. Direct API calls for other modules return 403.
- **Least privilege**: admins see participation counts only, never comment text or sentiment.
- **Anonymous by construction**: `feedback` rows contain no student identifier. Whether a student has submitted is tracked in a separate `submission_receipts` table with no link to the comment, and it stores only the **date**, so it cannot be matched to a feedback timestamp.
- **Minimum response threshold (5)**, enforced server-side: below it, comments and breakdowns are never sent to the browser. It applies per module and per theme, and the latest-submission date is withheld too.
- **No timestamps in lecturer views**: comments show the teaching week only.
- **Input validation**: shared rules in `utils/validation.js` give instant feedback in the form and are re-checked by the server (length 10–2000, known categories, rating 1–5 or empty).
- **Deployment**: serve over HTTPS only. For an SPA on S3/CloudFront or behind an ALB/nginx, route unknown paths to `index.html`.

## Analytics: CSV import and the AI features

Lecturers can upload a CSV of free-text comments (**Import & Analyse**) and get
a classified, ranked view of it. The file is read in the browser; nothing is
uploaded in mock mode.

| Feature | How it works | Why it helps |
|---|---|---|
| **Name scrubbing** | Titles + names, emails, URLs, and rare predominantly-capitalised tokens are masked *before* any analysis | Instructor names are personal data; nothing downstream ever sees them |
| **Sentiment** | TF-IDF (1–2 grams) + Logistic Regression, trained offline in `analytics/train_sentiment.py`, weights exported to JSON and run in the browser | **macro-F1 0.761** vs a **0.402** majority baseline (accuracy 0.79) |
| **Themes** | Transparent seeded-keyword classifier over 8 themes, returning the matched terms | The dataset has no theme labels, so a supervised model could not be evaluated honestly |
| **Driver terms** | Log-odds ratio with smoothing: terms unusually common in a theme's negative comments | Plain counts return "course" and "assignment" for every theme |
| **Near-duplicate grouping** | Jaccard similarity over token sets with an inverted index | One complaint restated 20 times is one issue, not twenty |
| **Priority ranking** | `log(negative comments) × (severity² + breadth)`, severity relative to the dataset average | The prescriptive layer: what to fix first, with the reasons shown |
| **Label cross-check** | If the CSV has a label column, reports agreement with the model | An independent sanity check on the classifier |

### Retraining the model

```bash
pip install scikit-learn pandas
python analytics/train_sentiment.py --csv data/raw/course_data_clean.csv
```

Writes `analytics/results/metrics.json`, `analytics/results/top_terms.json` and
`src/analysis/sentiment-model.json` (the weights the app loads).

### Known limitations

- The training label (`course_rating_int`) is a **proxy**: it records whether the
  student liked the course overall, not the polarity of the individual comment.
- Trained on University of Waterloo course reviews; performance on local module
  feedback is unvalidated.
- Name masking is heuristic. It over-masks some technical vocabulary
  (e.g. "Taylor", "Schrodinger") and will miss some names. Spot-audit a sample.
- Theme classification is keyword-based; roughly a third of comments match no
  theme and are reported openly as *Unclassified* rather than hidden.

### Where this runs later

`src/analysis/*` is dependency-free and has no DOM access, so the same modules
run server-side once the backend exists. The boundary is already API-shaped:
`POST /api/datasets` and `GET /api/datasets/:id/insights` in
`src/services/importService.js`.

## Project structure

```
src/
  App.jsx, main.jsx, config.js
  auth/          AuthContext, RequireRole (UI guard), navigation per role
  services/      apiClient + one service per domain (the only data entry point)
  mock/          mock server, policies, analytics engine, stub classifier, db
  data/          mock tables mirroring the future schema + comment bank
  hooks/         useAsync (loading/error/retry), useQueryFilters (URL filters)
  utils/         constants, validation, formatting, seeded random
  components/
    layout/      AppLayout, Sidebar, Header, PageHeader, Logo
    ui/          Button, Card, Badges, KpiCard, Skeletons, Empty/Error/403/404 views
    charts/      SentimentDonut, WeeklyTrendChart, WeeklySentimentBars
    feedback/    FeedbackCard, ThemeTable, PrivacyNotice, AnalyticsFilterBar
  pages/         LoginPage, 403, 404, student/, lecturer/, admin/
```

## Mock data

187 comments across 8 modules and 5 lecturers, generated deterministically in `src/data/mockFeedback.js` (identical on every load). Each module has a scenario, such as Lab Instructions in INF2003 turning negative from Week 3. All names, modules and comments are fictional. The mock world is fixed at **Week 8** of the trimester (15 Oct 2026) so the demo never drifts.
