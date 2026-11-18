// Hardcoded sample content for the landing page. No API calls.
export const problems = [
  { id: 1, title: "Two Sum", level: "Easy", rate: 54, solved: true },
  { id: 17, title: "Rotate a Matrix", level: "Medium", rate: 41, solved: true },
  { id: 42, title: "Merge K Sorted Lists", level: "Hard", rate: 28, solved: false },
  { id: 88, title: "Word Ladder", level: "Hard", rate: 23, solved: false },
  { id: 104, title: "LRU Cache", level: "Medium", rate: 37, solved: false },
] as const;

export const leaders = [
  { rank: 1, name: "nullptr_nina", score: 98420, streak: 61 },
  { rank: 2, name: "segfault_sam", score: 91375, streak: 44 },
  { rank: 3, name: "bigO_bea", score: 87110, streak: 102 },
  { rank: 4, name: "heap_hari", score: 80260, streak: 19 },
  { rank: 5, name: "mutex_mo", score: 76905, streak: 33 },
] as const;

export const features = [
  { key: "problems", title: "Problems", text: "1,200+ problems from warm-ups to nightmares, judged in seconds." },
  { key: "contests", title: "Live contests", text: "Timed rounds every week. Everyone gets the same set and the same clock." },
  { key: "leaderboard", title: "Leaderboard", text: "Every accepted solution moves your rating. See where you stand." },
  { key: "streaks", title: "Streaks", text: "Solve one a day. Keep the chain alive and watch it grow." },
] as const;

export const code = [
  "def two_sum(nums, target):",
  "    seen = {}",
  "    for i, n in enumerate(nums):",
  "        if target - n in seen:",
  "            return [seen[target - n], i]",
  "        seen[n] = i",
] as const;
