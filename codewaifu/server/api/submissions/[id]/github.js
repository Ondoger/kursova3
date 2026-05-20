import { connectToDatabase } from "../../_lib/db.js";
import { requireAuth } from "../../_lib/auth.js";
import { requireSubmissionAccess } from "../../_lib/assignments.js";
import {
  parseRepoUrl,
  fetchRepoSummary,
  fetchPrSummary,
  fetchRepoAutocheck,
} from "../../_lib/github-repo.js";

/*
 * GET /api/submissions/[id]/github
 *
 * Server-side GitHub fetch so:
 *   1. Browsers don't burn the user's 60/hr unauthenticated rate limit.
 *   2. We can later move to GITHUB_PAT without changing the frontend.
 *   3. We can validate ownership before exposing repo info (already done
 *      by requireSubmissionAccess — only the student or a teacher
 *      gets through).
 *
 * Returns { repo: ..., pr: ...|null, error?: string }.
 */
export default requireAuth(
  requireSubmissionAccess(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await connectToDatabase();

    const url = req.submission.prUrl || req.submission.repoUrl;
    if (!url) {
      return res
        .status(200)
        .json({ repo: null, pr: null, hint: "Студент не вказав посилання" });
    }
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      return res.status(200).json({
        repo: null,
        pr: null,
        hint: "Не схоже на GitHub URL — переходь по посиланню вручну",
      });
    }

    try {
      // Use assignment publish/createdAt as a since-filter so commit list
      // is scoped to "after the assignment was given". Falls back to no
      // filter if the assignment hasn't been published.
      const since =
        req.assignment.publishedAt?.toISOString?.() ??
        req.assignment.createdAt?.toISOString?.();

      const [repo, pr] = await Promise.all([
        fetchRepoSummary({
          owner: parsed.owner,
          repo: parsed.repo,
          since,
        }),
        parsed.prNumber
          ? fetchPrSummary({
              owner: parsed.owner,
              repo: parsed.repo,
              prNumber: parsed.prNumber,
            })
          : Promise.resolve(null),
      ]);
      const autocheck = repo
        ? await fetchRepoAutocheck({
            owner: parsed.owner,
            repo: parsed.repo,
            assignment: req.assignment,
            submission: req.submission,
            repoSummary: repo,
            pr,
          })
        : null;

      return res.status(200).json({ repo, pr, autocheck });
    } catch (e) {
      console.error("[github] fetch error:", e);
      return res.status(200).json({
        repo: null,
        pr: null,
        error: e instanceof Error ? e.message : "GitHub error",
      });
    }
  }),
);
