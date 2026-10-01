// Priority ranking: "what should I fix first?"
//
// This is the prescriptive layer. Sentiment and themes describe what happened;
// this ranks themes by how much attention each deserves, combining three
// factors a lecturer would weigh manually:
//
//   VOLUME    how many students raised it  (log-scaled: 40 comments is not
//             four times as urgent as 10)
//   SEVERITY  how negative that theme is, relative to the corpus average
//   BREADTH   how many DISTINCT issues it contains, not restatements of one
//
// The score is a transparent weighted product, not a learned ranking: a
// lecturer can see exactly why an item is at the top, and the components are
// reported alongside the score.
const WEIGHTS = { volume: 1.0, severity: 1.6, breadth: 0.6 };

export function rankPriorities(themeStats, { corpusNegativeShare = 0.3 } = {}) {
  const ranked = themeStats
    // 'Unclassified' is a gap in the theme vocabulary, not something a
    // lecturer can act on, so it is excluded from the action ranking.
    .filter((t) => t.count > 0 && t.themeId)
    .map((t) => {
      const negShare = t.count ? t.counts.negative / t.count : 0;
      // Volume of NEGATIVE comments, not total: 1,500 complaints inside a large
      // theme is a bigger problem than 50 inside a small one.
      const volume = Math.log1p(t.counts.negative);
      // Severity relative to the corpus: 1.0 means "typical", >1 means worse.
      const severity = corpusNegativeShare > 0 ? negShare / corpusNegativeShare : negShare;
      const breadth = t.distinctCount ? t.distinctCount / t.count : 1;

      // Severity is exponentiated so a theme that is meaningfully more negative
      // than average outranks a merely larger one.
      const score = WEIGHTS.volume * volume
        * (WEIGHTS.severity * severity ** 2 + WEIGHTS.breadth * breadth);

      const reasons = [];
      if (severity >= 1.3) reasons.push(`negative sentiment ${Math.round(severity * 100 - 100)}% above the dataset average`);
      if (t.count >= 20) reasons.push(`raised in ${t.count} comments`);
      if (breadth < 0.6) reasons.push('largely restatements of the same point');
      else if (t.distinctCount >= 10) reasons.push(`${t.distinctCount} distinct points`);
      if (t.trend?.direction === 'increasing') reasons.push(t.trend.description.toLowerCase());

      return {
        themeId: t.themeId,
        name: t.name,
        score: Math.round(score * 100) / 100,
        count: t.count,
        distinctCount: t.distinctCount ?? t.count,
        negativePct: Math.round(negShare * 100),
        severity: Math.round(severity * 100) / 100,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);

  const max = ranked[0]?.score || 1;
  return ranked.map((r, i) => ({
    ...r,
    rank: i + 1,
    // 0-100 so the UI can draw a comparable bar.
    relative: Math.round((r.score / max) * 100),
  }));
}
