import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3001),
  githubToken: process.env.GITHUB_TOKEN || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  githubRepo: process.env.GITHUB_REPO || "castlery/joyboy",
  defaultBranch: process.env.DEFAULT_BRANCH || "master",
  databasePath: process.env.DATABASE_PATH || "data/c-pointer.sqlite"
};
