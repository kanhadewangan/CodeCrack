import fakeData from "./faker.js";
import {prisma} from "./index";

async function main() {
  console.log("Seeding users...");
  const userMap = new Map<string, string>(); // email -> id

  for (const u of fakeData.users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: u.password,
      },
    });
    userMap.set(user.email, user.id);
  }
  console.log(`  ${userMap.size} users seeded`);

  console.log("Seeding userStats...");
  for (const stat of fakeData.userStats) {
    const userId = userMap.get(stat.userEmail);
    if (!userId) {
      console.warn(`  skipped userStat — no user found for ${stat.userEmail}`);
      continue;
    }
    await prisma.userStat.upsert({
      where: { userId },
      update: {
        problemsSolved: stat.problemsSolved,
        totalSubmissions: stat.totalSubmissions,
        rating: stat.rating,
      },
      create: {
        userId,
        problemsSolved: stat.problemsSolved,
        totalSubmissions: stat.totalSubmissions,
        rating: stat.rating,
      },
    });
  }
  console.log(`  ${fakeData.userStats.length} userStats seeded`);

  console.log("Seeding leaderboard...");
  for (const entry of fakeData.leaderboard) {
    const userId = userMap.get(entry.userEmail);
    if (!userId) {
      console.warn(`  skipped leaderboard entry — no user found for ${entry.userEmail}`);
      continue;
    }
    await prisma.leaderboard.create({
      data: {
        userId,
        rating: entry.rating,
      },
    });
  }
  console.log(`  ${fakeData.leaderboard.length} leaderboard entries seeded`);

  console.log("Seeding problems...");
  const problemMap = new Map<string, string>(); // title -> id

  for (const p of fakeData.problems) {
    const problem = await prisma.problems.create({
      data: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        difficulty: p.difficulty as "EASY" | "MEDIUM" | "HARD",
        tags: p.tags, // plain string[] — no relation, no connectOrCreate
        testCases: {
          create: p.testCases,
        },
      },
    });
    problemMap.set(problem.title, problem.id);
  }
  console.log(`  ${problemMap.size} problems seeded`);

  console.log("Seeding submissions...");
  let submissionCount = 0;

  for (const s of fakeData.submissions) {
    const userId = userMap.get(s.userEmail);
    const problemId = problemMap.get(s.problemTitle);

    if (!userId || !problemId) {
      console.warn(
        `  skipped submission — missing reference (user: ${s.userEmail}, problem: ${s.problemTitle})`
      );
      continue;
    }

    await prisma.submissions.create({
      data: {
        userId,
        problemId,
        code: s.code,
        language: s.language,
        status: s.status as
          | "PENDING"
          | "RUNNING"
          | "ACCEPTED"
          | "WRONG_ANSWER"
          | "TIME_LIMIT_EXCEEDED"
          | "RUNTIME_ERROR",
        submissionStats: {
          create: {
            executionTime: s.executionTime,
            memoryUsage: s.memoryUsage,
          },
        },
      },
    });
    submissionCount++;
  }
  console.log(`  ${submissionCount} submissions seeded`);

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });