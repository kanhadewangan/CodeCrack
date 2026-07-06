const API_BASE = "http://localhost:3001"; // Replace with your actual API base URL

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("oj_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Auth APIs
export const authApi = {
  register: (body: any) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getMe: () => apiRequest("/auth/me"),
};

// Problems APIs
export const problemsApi = {
  list: (difficulty?: string, tag?: string) => {
    let url = "/problems/problems";
    const params = new URLSearchParams();
    if (difficulty) params.append("difficulty", difficulty);
    if (tag) params.append("tag", tag);
    const query = params.toString();
    if (query) url += `?${query}`;
    return apiRequest(url);
  },
  get: (id: string) => apiRequest(`/problems/problems/${id}`),
  create: (body: any) => apiRequest("/problems/problems", { method: "POST", body: JSON.stringify(body) }),
};

// Submissions APIs
export const submissionsApi = {
  list: () => apiRequest("/api/submissions"),
  get: (id: string) => apiRequest(`/api/submissions/${id}`),
  submit: (body: { problemId: string; code: string; language: string }) =>
    apiRequest("/api/submission", { method: "POST", body: JSON.stringify(body) }),
};

// Leaderboard APIs
export const leaderboardApi = {
  get: () => apiRequest("/leaderboard"),
};

// Streaks APIs
export const streaksApi = {
  get: () => apiRequest("/streaks/streaks"),
  getContributions: () => apiRequest("/streaks/contributions"),
};


// contest APIs

export const contestApi = {
  getContests: () => apiRequest("/contest/get-contests"),
  createContest: (body: any) => apiRequest("/contest/create-contest", { method: "POST", body: JSON.stringify(body) }),
  joinContest: (body: any) => apiRequest("/contest/join-contest", { method: "POST", body: JSON.stringify(body) }),
  getContestParticipants: (contestId: string) => apiRequest(`/contest/get-contest-participants/${contestId}`),
}
