import { useCallback, useRef, useState } from 'react';
import {
  Download, FileSpreadsheet, Lock, ShieldCheck, Sparkles, TriangleAlert, Upload, X,
} from 'lucide-react';
import {
  analyseCsvFile, buildExport, ImportError, inspectCsvFile, MAX_ROWS, validateFile,
} from '../../services/importService.js';
import { MIN_RESPONSES, SENTIMENTS, SENTIMENT_META } from '../../utils/constants.js';
import { formatPct, pluralise } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import KpiCard from '../../components/ui/KpiCard.jsx';
import FilterSelect from '../../components/ui/FilterSelect.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Badge, SentimentBadge } from '../../components/ui/Badges.jsx';
import { ErrorState } from '../../components/ui/States.jsx';
import SentimentDonut from '../../components/charts/SentimentDonut.jsx';

const FIELDS = [
  { key: 'text', label: 'Comment text', required: true, hint: 'The free-text feedback to analyse' },
  { key: 'group', label: 'Module / course code', required: false, hint: 'Used to group results' },
  { key: 'title', label: 'Module title', required: false, hint: 'Display name, optional' },
  { key: 'label', label: 'Existing label', required: false, hint: 'If present, used to cross-check the model' },
];

function MixBar({ counts, total }) {
  if (!total) return null;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
      {SENTIMENTS.map((s) => (
        <span key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: SENTIMENT_META[s].color }} />
      ))}
    </div>
  );
}

function DropZone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file) => {
    const error = validateFile(file);
    onFile(file, error);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files?.[0]); }}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'
      }`}
    >
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100">
        <Upload className="size-6 text-slate-500" aria-hidden />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">Drop a CSV file here</p>
      <p className="mt-1 text-sm text-slate-500">
        Up to 25 MB and {MAX_ROWS.toLocaleString()} rows. Nothing is uploaded: the file is read and analysed in your browser.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <Button className="mt-5" icon={FileSpreadsheet} disabled={disabled} onClick={() => inputRef.current?.click()}>
        Choose file
      </Button>
    </div>
  );
}

function Progress({ stage, pct }) {
  return (
    <div role="status" aria-live="polite" className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-900">{stage}…</span>
        <span className="tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-navy-900 transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Large files take a few seconds. Each comment is scrubbed of names, then classified for sentiment and theme.
      </p>
    </div>
  );
}

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [mapping, setMapping] = useState({});
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => {
    setFile(null); setInspection(null); setMapping({}); setProgress(null); setResult(null); setError(null);
  };

  const onFile = useCallback(async (picked, validationError) => {
    if (validationError) { setError(new ImportError(validationError)); return; }
    setError(null); setResult(null); setFile(picked);
    try {
      setProgress({ stage: 'Reading file', pct: 0 });
      const found = await inspectCsvFile(picked, setProgress);
      setInspection(found);
      setMapping(found.mapping);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err);
    }
  }, []);

  const run = async () => {
    setError(null);
    try {
      setProgress({ stage: 'Starting', pct: 0 });
      const analysed = await analyseCsvFile(inspection, mapping, setProgress);
      setResult(analysed);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(buildExport(result), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${result.source.fileName.replace(/\.csv$/i, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columnOptions = (inspection?.headers ?? []).map((h) => ({ value: h, label: h }));

  return (
    <>
      <PageHeader
        title="Import & Analyse"
        subtitle="Upload a CSV of student comments to classify sentiment, group them into themes and rank what to act on first."
        actions={(inspection || result) && <Button variant="secondary" icon={X} onClick={reset}>Start over</Button>}
      />

      {error && (
        <div className="mb-6">
          <ErrorState title="Could not analyse that file" error={error} onRetry={inspection ? run : undefined} />
        </div>
      )}

      {!inspection && !progress && <DropZone onFile={onFile} />}

      {progress && <Progress stage={progress.stage} pct={progress.pct} />}

      {inspection && !progress && !result && (
        <Card>
          <CardHeader
            title="Map the columns"
            description={`${inspection.fileName} · ${inspection.rows.length.toLocaleString()} rows · ${(inspection.fileSize / 1024 / 1024).toFixed(1)} MB`}
            tooltip="Column names were matched automatically. Change them if the guess is wrong."
          />
          <div className="space-y-5 p-5">
            {inspection.truncated && (
              <p className="flex items-start gap-2 rounded-lg bg-neutral-soft px-3 py-2 text-sm text-neutral-ink">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                Only the first {MAX_ROWS.toLocaleString()} rows will be analysed.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <FilterSelect
                    label={`${f.label}${f.required ? ' *' : ''}`}
                    value={mapping[f.key] ?? ''}
                    onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                    allLabel={f.required ? 'Select a column…' : 'Not in this file'}
                    options={columnOptions}
                  />
                  <p className="mt-1 text-xs text-slate-500">{f.hint}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
              <table className="w-full min-w-[600px] text-left text-xs">
                <caption className="sr-only">First five rows of the uploaded file</caption>
                <thead className="bg-slate-50">
                  <tr>{inspection.headers.map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-slate-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspection.preview.map((row, i) => (
                    <tr key={i}>
                      {inspection.headers.map((h) => (
                        <td key={h} className="max-w-[220px] truncate px-3 py-2 text-slate-600" title={row[h]}>{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="size-4 text-positive" aria-hidden />
                Names and contact details are removed before any analysis runs.
              </p>
              <Button icon={Sparkles} onClick={run} disabled={!mapping.text}>Analyse {inspection.rows.length.toLocaleString()} comments</Button>
            </div>
          </div>
        </Card>
      )}

      {result && <Results result={result} onDownload={download} />}
    </>
  );
}

function Results({ result, onDownload }) {
  const { summary, model, privacy, themes, priorities, groups, duplicates, labelAgreement } = result;
  const s = summary.sentiment;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Comments analysed" value={summary.analysed.toLocaleString()}
          detail={`${summary.skipped.empty + summary.skipped.tooShort} skipped as too short`} />
        <KpiCard label="Distinct issues" value={summary.distinctIssues.toLocaleString()} accent="blue"
          detail={`${summary.duplicateComments} near-duplicates grouped`}
          tooltip="Comments that restate an existing point are grouped, so one complaint raised many times counts once." />
        <KpiCard label="Positive" value={formatPct(s.pcts.positive)} accent="green" detail={pluralise(s.counts.positive, 'comment')} />
        <KpiCard label="Neutral" value={formatPct(s.pcts.neutral)} accent="amber" detail={pluralise(s.counts.neutral, 'comment')}
          tooltip="The classifier is binary; 'neutral' means it was not confident either way." />
        <KpiCard label="Negative" value={formatPct(s.pcts.negative)} accent="red" detail={pluralise(s.counts.negative, 'comment')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 ring-1 ring-brand-100">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>{privacy.rareNames + privacy.titles}</strong> potential names, plus {privacy.emails} email addresses and {privacy.links} links,
            were masked before analysis ({privacy.documentsChangedPct}% of comments affected). Automated masking is imperfect and should be spot-audited.
          </span>
        </p>
        <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
          <span>
            Sentiment: <strong>{model.name} v{model.version}</strong>
            {model.metrics ? ` · macro-F1 ${model.metrics.macro_f1.toFixed(3)} on a held-out test split` : ' (lexicon fallback — model file not loaded)'}
            {labelAgreement ? ` · agrees with this file's own label column on ${labelAgreement.agreementPct}% of ${labelAgreement.compared.toLocaleString()} comments` : ''}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Sentiment overview" />
          <div className="p-5"><SentimentDonut summary={{ total: s.total, counts: s.counts, pcts: s.pcts }} /></div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="What to look at first"
            description="Themes ranked by how much negative feedback they carry, how unusual that is, and how many distinct points they contain"
            tooltip="Score = log(negative comments) × (severity² + breadth). Severity compares the theme's negative share to the dataset average."
          />
          <ol className="divide-y divide-slate-100">
            {priorities.slice(0, 6).map((p) => (
              <li key={p.themeId} className="flex items-start gap-4 px-5 py-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">{p.rank}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs tabular-nums text-slate-500">{p.negativePct}% negative · {p.count} comments</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-negative" style={{ width: `${p.relative}%` }} />
                  </div>
                  {p.reasons.length > 0 && <p className="mt-1.5 text-xs text-slate-500">{p.reasons.join(' · ')}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Themes and their drivers"
          description="Driver terms are words unusually common in the negative comments of that theme, compared with the rest of the dataset"
          tooltip="Log-odds ratio with smoothing. Plain word counts would return 'course' and 'assignment' for every theme."
          actions={<Button variant="secondary" size="sm" icon={Download} onClick={onDownload}>Export JSON</Button>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Themes with comment counts, sentiment split and driver terms</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-3">Theme</th>
                <th scope="col" className="px-3 py-3 text-right">Comments</th>
                <th scope="col" className="px-3 py-3 text-right">Distinct</th>
                <th scope="col" className="px-3 py-3 text-right">Negative</th>
                <th scope="col" className="px-3 py-3">Mix</th>
                <th scope="col" className="px-3 py-3">Driver terms in negative comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {themes.map((t) => (
                <tr key={t.themeId ?? 'unclassified'} className={t.themeId ? '' : 'bg-slate-50/60'}>
                  <th scope="row" className="px-5 py-3 font-medium text-slate-900">
                    {t.name}
                    {!t.themeId && <span className="ml-2 text-xs font-normal text-slate-500">no theme matched</span>}
                  </th>
                  <td className="px-3 py-3 text-right tabular-nums">{t.count.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-500">{t.distinctCount.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{formatPct(t.pcts.negative)}</td>
                  <td className="px-3 py-3"><div className="w-24"><MixBar counts={t.counts} total={t.count} /></div></td>
                  <td className="px-3 py-3">
                    {t.suppressed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Lock className="size-3.5" aria-hidden /> Fewer than {MIN_RESPONSES} comments
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {t.drivers.map((d) => (
                          <Badge key={d.term} tone="slate" title={`in ${d.share}% of negative comments on this theme`}>{d.term}</Badge>
                        ))}
                        {!t.drivers.length && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Most repeated points" description="Near-duplicate comments grouped: one issue raised many times" />
          <ul className="divide-y divide-slate-100">
            {duplicates.slice(0, 5).map((d, i) => (
              <li key={i} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <Badge tone="navy">×{d.size}</Badge>
                  <p className="min-w-0 flex-1 text-sm text-slate-700">&ldquo;{d.representative.text.slice(0, 180)}{d.representative.text.length > 180 ? '…' : ''}&rdquo;</p>
                </div>
              </li>
            ))}
            {!duplicates.length && <li className="px-5 py-6 text-sm text-slate-500">No near-duplicate comments found.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Modules in this file" description={`${summary.groups.toLocaleString()} groups · showing the 8 largest`} />
          <ul className="divide-y divide-slate-100">
            {groups.slice(0, 8).map((g) => (
              <li key={g.group} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{g.group}{g.title ? ` — ${g.title}` : ''}</p>
                  <div className="mt-1.5 w-40"><MixBar counts={g.counts} total={g.count} /></div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm tabular-nums text-slate-900">{g.count}</p>
                  {g.suppressed
                    ? <p className="text-xs text-slate-400">below threshold</p>
                    : <p className="text-xs text-slate-500">{formatPct(g.pcts.negative)} negative</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sample classified comments" description="Highest-confidence predictions, showing how each was labelled" />
        <div className="grid gap-3 p-5 md:grid-cols-2">
          {themes.filter((t) => t.themeId).slice(0, 4).flatMap((t) => t.examples.slice(0, 1).map((e) => (
            <article key={e.id} className="rounded-lg border-l-4 border-l-negative bg-white p-4 ring-1 ring-slate-200">
              <p className="text-sm leading-relaxed text-slate-800">&ldquo;{e.text.slice(0, 220)}{e.text.length > 220 ? '…' : ''}&rdquo;</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <SentimentBadge sentiment="negative" />
                <Badge tone="slate">{t.name}</Badge>
                <span>confidence {Math.round(e.sentimentScore * 100)}%</span>
                {e.group && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{e.group}</span>}
              </div>
            </article>
          )))}
        </div>
      </Card>
    </div>
  );
}
