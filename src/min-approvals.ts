import * as core from "@actions/core";
import * as github from "@actions/github";
import type { components } from "@octokit/openapi-types";

type ApprovalsAll = "all";
export type Labels = components["schemas"]["pull-request"]["labels"];
export type Review = components["schemas"]["pull-request-review"];
export type Reviews = Review[];

export function getMinApprovals(labels: Labels): ApprovalsAll | number {
  const pattern = /min-(\d+|all)-approvals/;

  for (const label of labels) {
    const m = label.name.match(pattern);
    if (m) {
      return m[1] === "all" ? m[1] : parseInt(m[1], 10);
    }
  }

  return 0;
}

export function requirementPassed(
  reviews: Review[],
  requestedReviewers: number,
  minReviewers: number | ApprovalsAll,
): boolean {
  const latestReviews = reviews
    .reverse()
    .filter((review) => review.state.toLowerCase() !== "commented")
    .filter((review, index, array) => {
      // https://dev.to/kannndev/filter-an-array-for-unique-values-in-javascript-1ion
      return array.findIndex((x) => review.user?.id === x.user?.id) === index;
    });

  const approvedReviews = latestReviews.filter((review) => review.state.toLowerCase() === "approved");
  core.info(`Approved reviews: ${approvedReviews.length}. Required: ${minReviewers}`);

  if (minReviewers === "all") {
    core.debug(`Pull request reviewers: ${requestedReviewers}`);

    // some reviewers have not reviewed
    if (requestedReviewers > 0) {
      return false;
    }

    return latestReviews.every((review) => review.state.toLowerCase() === "approved");
  }

  return approvedReviews.length >= minReviewers;
}

export async function run(): Promise<void> {
  const token: string = core.getInput("GITHUB_TOKEN", { required: true });

  if (!token) {
    throw new Error("No GITHUB_TOKEN found in input");
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  if (!context.payload.pull_request) {
    throw new Error("No pull request found in payload");
  }

  const { data: pull } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
  });

  const minApprovals = getMinApprovals(pull.labels);
  core.info(`Min approvals: ${minApprovals}`);

  if (minApprovals === 0) {
    core.info("Label matching pattern not found");
    return;
  }

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100,
  });

  if (reviews.length === 0) {
    core.setFailed("No reviews found");
  }

  const requestedReviewers = pull.requested_reviewers ?? [];
  if (!requirementPassed(reviews, requestedReviewers.length, minApprovals)) {
    core.setFailed("Minimal requirement not met");
  }

  core.info("Done.");
}
