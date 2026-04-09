import OpenAI from "openai";
import { z } from "zod";
import { config } from "./config.js";

const analysisSchema = z.object({
  summary: z.string(),
  displayContent: z.array(z.string()).default([]),
  interactions: z.array(z.object({
    action: z.string(),
    effect: z.string()
  })).default([]),
  states: z.array(z.object({
    name: z.string(),
    description: z.string()
  })).default([]),
  dependencies: z.array(z.object({
    filePath: z.string(),
    role: z.string()
  })).default([]),
  confirmedFacts: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([])
});

const answerSchema = z.object({
  summary: z.string(),
  details: z.string(),
  confirmedFacts: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([])
});

const client = config.openAiApiKey
  ? new OpenAI({
      apiKey: config.openAiApiKey,
      baseURL: config.openAiBaseUrl || undefined
    })
  : null;

function requireClient(): OpenAI {
  if (!client) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  return client;
}

async function requestJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const completion = await requireClient().chat.completions.create({
    model: config.openAiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an internal Castlery code analysis assistant. Return valid JSON only."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  return schema.parse(JSON.parse(content));
}

export async function generateInitialAnalysis(prompt: string) {
  return requestJson(prompt, analysisSchema);
}

export async function generateFollowUpAnswer(prompt: string) {
  return requestJson(prompt, answerSchema);
}

export async function verifyOpenAiAccess(): Promise<"ok" | "missing" | "error"> {
  if (!config.openAiApiKey) {
    return "missing";
  }

  try {
    await requireClient().chat.completions.create({
      model: config.openAiModel,
      messages: [
        {
          role: "user",
          content: "reply with ok"
        }
      ],
      max_tokens: 5
    });
    return "ok";
  } catch {
    return "error";
  }
}
