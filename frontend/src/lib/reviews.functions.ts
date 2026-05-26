import { fetchApi } from "./api-client.js";

export async function processReview(payload: {
  data: {
    review_id: string;
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/process-review", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function createReview(payload: {
  data: {
    pr_url: string;
    access_token: string;
    user_id: string;
  };
}) {
  return fetchApi("/api/reviews/create", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function retryReview(payload: {
  data: {
    review_id: string;
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/retry", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getUserRepos(payload: {
  data: {
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/user-repos", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getRepoPullRequests(payload: {
  data: {
    access_token: string;
    owner: string;
    repo: string;
  };
}) {
  return fetchApi("/api/reviews/pr-pulls", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getRepoGitTree(payload: {
  data: {
    owner: string;
    repo: string;
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/git-tree", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function applyFindingFix(payload: {
  data: {
    review_id: string;
    finding_id: string;
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/apply-fix", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function postReviewStyled(payload: {
  data: {
    review_id: string;
    access_token: string;
    style: "devpulse" | "human";
    reviewer_name: string;
    reviewer_login: string;
  };
}) {
  return fetchApi("/api/reviews/post-styled", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function emailReviewReport(payload: {
  data: {
    review_id: string;
    email: string;
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/email-report", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getUserProfileData(payload: {
  data: {
    access_token: string;
  };
}) {
  return fetchApi("/api/reviews/user-profile", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}
