import { fetchApi } from "./api-client.js";

export async function analyzeFolderStructure(payload: {
  data: {
    access_token: string;
    repo_full_name: string;
    file_tree: Array<{ path: string; type: string }>;
  };
}) {
  return fetchApi("/api/folder-analysis/analyze", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function saveFolderAnalysis(payload: {
  data: {
    access_token: string;
    repo_owner: string;
    repo_name: string;
    repo_full_name: string;
    result: any;
    file_tree: Array<{ path: string; type: string }>;
  };
}) {
  return fetchApi("/api/folder-analysis/save", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getFolderAnalysis(payload: {
  data: {
    id: string;
    access_token?: string;
  };
}) {
  return fetchApi("/api/folder-analysis/get", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getFolderAnalysisByToken(payload: {
  data: {
    token: string;
  };
}) {
  return fetchApi("/api/folder-analysis/get-by-token", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function listFolderAnalyses(payload: {
  data: {
    access_token: string;
    limit?: number;
  };
}) {
  return fetchApi("/api/folder-analysis/list", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function deleteFolderAnalysis(payload: {
  data: {
    id: string;
    access_token: string;
  };
}) {
  return fetchApi("/api/folder-analysis/delete", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}
