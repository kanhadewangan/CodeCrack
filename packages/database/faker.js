 const fakeData = {
  "users": [
    { "email": "ananya.sharma@example.com", "password": "$2b$12$fakehashabcdefghijklmno1" },
    { "email": "rohit.verma@example.com", "password": "$2b$12$fakehashabcdefghijklmno2" },
    { "email": "priya.nair@example.com", "password": "$2b$12$fakehashabcdefghijklmno3" },
    { "email": "karan.mehta@example.com", "password": "$2b$12$fakehashabcdefghijklmno4" },
    { "email": "sneha.iyer@example.com", "password": "$2b$12$fakehashabcdefghijklmno5" }
  ],
  "problems": [
    {
      "title": "Two Sum",
      "slug": "two-sum",
      "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      "difficulty": "EASY",
      "tags": ["array", "hash-table"],
      "testCases": [
        { "input": "[[2,7,11,15], 9]", "output": "[0,1]" },
        { "input": "[[3,2,4], 6]", "output": "[1,2]" },
        { "input": "[[3,3], 6]", "output": "[0,1]" }
      ]
    },
    {
      "title": "Longest Substring Without Repeating Characters",
      "slug": "longest-substring-without-repeating-characters",
      "description": "Given a string s, find the length of the longest substring without repeating characters.",
      "difficulty": "MEDIUM",
      "tags": ["string", "sliding-window", "hash-table"],
      "testCases": [
        { "input": "[\"abcabcbb\"]", "output": "3" },
        { "input": "[\"bbbbb\"]", "output": "1" },
        { "input": "[\"pwwkew\"]", "output": "3" }
      ]
    },
    {
      "title": "Median of Two Sorted Arrays",
      "slug": "median-of-two-sorted-arrays",
      "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
      "difficulty": "HARD",
      "tags": ["array", "binary-search", "divide-and-conquer"],
      "testCases": [
        { "input": "[[1,3],[2]]", "output": "2.0" },
        { "input": "[[1,2],[3,4]]", "output": "2.5" }
      ]
    },
    {
      "title": "Valid Parentheses",
      "slug": "valid-parentheses",
      "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
      "difficulty": "EASY",
      "tags": ["string", "stack"],
      "testCases": [
        { "input": "[\"()\"]", "output": "true" },
        { "input": "[\"()[]{}\"]", "output": "true" },
        { "input": "[\"(]\"]", "output": "false" }
      ]
    },
    {
      "title": "Merge K Sorted Lists",
      "slug": "merge-k-sorted-lists",
      "description": "You are given an array of k linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
      "difficulty": "HARD",
      "tags": ["linked-list", "heap", "divide-and-conquer"],
      "testCases": [
        { "input": "[[[1,4,5],[1,3,4],[2,6]]]", "output": "[1,1,2,3,4,4,5,6]" },
        { "input": "[[]]", "output": "[]" }
      ]
    },
    {
      "title": "Climbing Stairs",
      "slug": "climbing-stairs",
      "description": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
      "difficulty": "EASY",
      "tags": ["dynamic-programming", "math"],
      "testCases": [
        { "input": "[2]", "output": "2" },
        { "input": "[3]", "output": "3" },
        { "input": "[5]", "output": "8" }
      ]
    },
    {
      "title": "Course Schedule",
      "slug": "course-schedule",
      "description": "There are numCourses courses labeled 0 to numCourses-1. Given prerequisites as pairs, return true if you can finish all courses, otherwise return false.",
      "difficulty": "MEDIUM",
      "tags": ["graph", "depth-first-search", "topological-sort"],
      "testCases": [
        { "input": "[2, [[1,0]]]", "output": "true" },
        { "input": "[2, [[1,0],[0,1]]]", "output": "false" }
      ]
    },
    {
      "title": "Word Search",
      "slug": "word-search",
      "description": "Given an m x n grid of characters board and a string word, return true if word exists in the grid.",
      "difficulty": "MEDIUM",
      "tags": ["array", "backtracking", "depth-first-search"],
      "testCases": [
        { "input": "[[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], \"ABCCED\"]", "output": "true" },
        { "input": "[[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], \"SEE\"]", "output": "true" }
      ]
    }
  ],
  "submissions": [
    {
      "userEmail": "ananya.sharma@example.com",
      "problemTitle": "Two Sum",
      "language": "javascript",
      "code": "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n}",
      "status": "ACCEPTED",
      "executionTime": 64.2,
      "memoryUsage": 42.1
    },
    {
      "userEmail": "rohit.verma@example.com",
      "problemTitle": "Valid Parentheses",
      "language": "python",
      "code": "def is_valid(s):\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for ch in s:\n        if ch in pairs.values():\n            stack.append(ch)\n        elif ch in pairs:\n            if not stack or stack.pop() != pairs[ch]:\n                return False\n    return not stack",
      "status": "ACCEPTED",
      "executionTime": 31.5,
      "memoryUsage": 16.8
    },
    {
      "userEmail": "priya.nair@example.com",
      "problemTitle": "Climbing Stairs",
      "language": "javascript",
      "code": "function climbStairs(n) {\n  let a = 1, b = 1;\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}",
      "status": "WRONG_ANSWER",
      "executionTime": 12.3,
      "memoryUsage": 9.4
    },
    {
      "userEmail": "karan.mehta@example.com",
      "problemTitle": "Course Schedule",
      "language": "python",
      "code": "def can_finish(numCourses, prerequisites):\n    # incomplete attempt\n    return True",
      "status": "RUNTIME_ERROR",
      "executionTime": 8.9,
      "memoryUsage": 11.2
    },
    {
      "userEmail": "sneha.iyer@example.com",
      "problemTitle": "Longest Substring Without Repeating Characters",
      "language": "cpp",
      "code": "int lengthOfLongestSubstring(string s) {\n    unordered_map<char,int> seen;\n    int start = 0, maxLen = 0;\n    for (int i = 0; i < s.size(); i++) {\n        if (seen.count(s[i]) && seen[s[i]] >= start) start = seen[s[i]] + 1;\n        seen[s[i]] = i;\n        maxLen = max(maxLen, i - start + 1);\n    }\n    return maxLen;\n}",
      "status": "TIME_LIMIT_EXCEEDED",
      "executionTime": 5002.0,
      "memoryUsage": 28.7
    }
  ],
  "userStats": [
    { "userEmail": "ananya.sharma@example.com", "problemsSolved": 47, "totalSubmissions": 112, "rating": 1620 },
    { "userEmail": "rohit.verma@example.com", "problemsSolved": 23, "totalSubmissions": 58, "rating": 1340 },
    { "userEmail": "priya.nair@example.com", "problemsSolved": 89, "totalSubmissions": 201, "rating": 1890 },
    { "userEmail": "karan.mehta@example.com", "problemsSolved": 5, "totalSubmissions": 14, "rating": 1180 },
    { "userEmail": "sneha.iyer@example.com", "problemsSolved": 61, "totalSubmissions": 140, "rating": 1755 }
  ],
  "leaderboard": [
    { "userEmail": "priya.nair@example.com", "rating": 1890 },
    { "userEmail": "sneha.iyer@example.com", "rating": 1755 },
    { "userEmail": "ananya.sharma@example.com", "rating": 1620 },
    { "userEmail": "rohit.verma@example.com", "rating": 1340 },
    { "userEmail": "karan.mehta@example.com", "rating": 1180 }
  ]
}

module.exports = fakeData;