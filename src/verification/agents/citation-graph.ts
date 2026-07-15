/**
 * The supervisor multi-agent graph for citation verification.
 *
 * PATTERN: Supervisor + subagents-as-tools.
 *   - One supervisor (LLM) decides which specialist to delegate to.
 *   - Two subagents: resolver (resolve a citation) and support_analyst
 *     (judge whether the source supports the proposition).
 *   - The supervisor is NOT a free LLM in production hot path — it's invoked
 *     per-citation only when the deterministic pipeline needs an agent loop.
 *
 * WHY THIS PATTERN (source-grounded):
 *   LangChain benchmark: "the supervisor architecture… makes the fewest
 *   assumptions about the underlying agents… feasible for all multi-agent
 *   scenarios." https://blog.langchain.com/benchmarking-multi-agent-architectures/
 *   LangChain multi-agent docs: subagents-as-tools gives "context isolation…
 *   67% fewer tokens overall." https://docs.langchain.com/oss/python/langchain/multi-agent
 *
 * The deterministic pipeline (runner.ts) remains the orchestrator and calls
 * runCitationVerification() only for citations needing an agent loop. This
 * keeps the agent system scoped to where it earns its cost (MARS: multi-agent
 * pays off only for open-ended, retrieve-evaluate-adapt steps).
 */
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { MemorySaver } from "@langchain/langgraph";
import type { AIMessage, AIMessageChunk } from "@langchain/core/messages";

import {
  resolverAgentOutputSchema,
  supportAnalystOutputSchema,
  supervisorOutputSchema,
  type CitationTask,
  type SupervisorOutput,
} from "./schemas";
import { SUPERVISOR_PROMPT, RESOLVER_AGENT_PROMPT, SUPPORT_ANALYST_AGENT_PROMPT } from "./prompts";
import { ArtifactStore } from "./artifact-store";
import { buildResolverTools, buildAnalystTools } from "./tools";

/**
 * LLM factory. Uses the same OpenRouter/OpenAI-compatible endpoint the rest of
 * the app uses (see src/verification/support-analyst.ts), so no new credential
 * or provider is introduced.
 */
function createLlm(opts?: { temperature?: number }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured; agent system cannot run.");
  }
  return new ChatOpenAI({
    model: process.env.LLM_MODEL ?? "deepseek/deepseek-v4-pro",
    apiKey,
    temperature: opts?.temperature ?? 0,
    configuration: {
      baseURL: process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://baddielegal.com",
        "X-Title": "BaddieLegal",
      },
    },
  });
}

export interface CitationGraphResult {
  output: SupervisorOutput;
  trace: TraceEvent[];
  store: ArtifactStore;
}

export interface TraceEvent {
  agent: string;
  action: string;
  outcome: string;
  ts: string;
}

/** Build the supervisor graph with two subagents. Returns a compiled graph. */
function buildGraph(store: ArtifactStore) {
  const llm = createLlm();

  // Subagent 1: resolver. responseFormat enforces structured handoff output.
  const resolverAgent = createReactAgent({
    llm,
    name: "resolver",
    prompt: RESOLVER_AGENT_PROMPT,
    tools: buildResolverTools(store),
    responseFormat: resolverAgentOutputSchema,
  });

  // Subagent 2: support analyst.
  const analystAgent = createReactAgent({
    llm,
    name: "support_analyst",
    prompt: SUPPORT_ANALYST_AGENT_PROMPT,
    tools: buildAnalystTools(store),
    responseFormat: supportAnalystOutputSchema,
  });

  // Supervisor: addHandoffBackMessages=false strips the handoff bookkeeping
  // from the subagent's view (LangChain benchmark mitigation for the
  // "telephone" problem — cluttered context degrades reliability).
  const supervisor = createSupervisor({
    agents: [resolverAgent, analystAgent],
    llm: createLlm(),
    prompt: SUPERVISOR_PROMPT,
    outputMode: "full_history",
    addHandoffBackMessages: false,
    responseFormat: supervisorOutputSchema,
    supervisorName: "citation_supervisor",
  });

  // MemorySaver gives durable checkpoints across tool calls (MARS: "resume
  // from where the agent was when errors occurred") and makes the trace
  // inspectable.
  const checkpointer = new MemorySaver();
  return supervisor.compile({ checkpointer });
}

/**
 * Run the supervisor for a single citation task.
 *
 * Returns the structured output plus a trace derived from the message history.
 * The trace is the auditability surface (success criterion #5: failures show
 * up in the trace and are recoverable).
 */
export async function runCitationVerification(
  task: CitationTask,
  preResolvedStore?: ArtifactStore,
): Promise<CitationGraphResult> {
  const store = preResolvedStore ?? new ArtifactStore();
  const trace: TraceEvent[] = [];
  const startedAt = Date.now();

  const graph = buildGraph(store);

  // Thread id for the checkpointer, scoped to this citation.
  const threadId = `citation-${task.citationId}-${startedAt}`;

  const userMessage =
    `Verify this citation.\n` +
    `citationId: ${task.citationId}\n` +
    `citationText: ${task.citationText}\n` +
    `proposition: ${task.proposition}\n` +
    (store.hasAuthority(task.citationId)
      ? `Note: an authority source is already resolved for this citation (skip resolver).`
      : `Note: no authority is resolved yet — delegate to the resolver first.`);

  const finalState = await graph.invoke(
    { messages: [{ role: "user", content: userMessage }] },
    { configurable: { thread_id: threadId }, recursionLimit: 25 },
  );

  // Derive a human-readable trace from the message stream. We track the
  // currently-active agent so each event is attributed to the agent that
  // actually emitted it (success criterion #2: prove each agent uses only its
  // own tools). Handoff tool calls ("transfer_to_X") flip the active agent.
  const messages = (finalState.messages ?? []) as Array<
    AIMessage & { tool_calls?: Array<{ name: string; args: unknown }> }
  >;
  let activeAgent = "supervisor";
  for (const msg of messages) {
    const role = (msg as { _getType?: () => string })._getType?.() ?? msg.constructor.name;
    if (role === "ai" && msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        if (tc.name.startsWith("transfer_to_")) {
          // Handoff: the supervisor transfers control to a subagent.
          activeAgent = tc.name.replace("transfer_to_", "");
          trace.push({
            agent: "supervisor",
            action: `handed off to ${activeAgent}`,
            outcome: "transfer",
            ts: new Date().toISOString(),
          });
        } else {
          // A tool call by whichever agent is currently active.
          trace.push({
            agent: activeAgent,
            action: `called ${tc.name}`,
            outcome: `args: ${JSON.stringify(tc.args).slice(0, 100)}`,
            ts: new Date().toISOString(),
          });
        }
      }
    } else if (role === "tool") {
      const toolMsg = msg as unknown as { name: string; content: string };
      const preview = String(toolMsg.content ?? "").slice(0, 120);
      // The tool result belongs to the agent that called it (activeAgent).
      trace.push({
        agent: activeAgent,
        action: `${toolMsg.name} returned`,
        outcome: preview,
        ts: new Date().toISOString(),
      });
    } else if (role === "ai") {
      // Agent's own reasoning/response message.
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      if (content && content.trim()) {
        trace.push({
          agent: activeAgent,
          action: "produced output",
          outcome: content.slice(0, 200),
          ts: new Date().toISOString(),
        });
      }
    }
  }

  const structured = (finalState as { structuredResponse?: unknown }).structuredResponse;
  let output: SupervisorOutput;
  if (structured && typeof structured === "object") {
    output = supervisorOutputSchema.parse(structured);
  } else {
    // Fallback: synthesize a minimal structured output from the trace so the
    // caller always gets a schema-valid result (recoverable failure).
    output = {
      citationText: task.citationText,
      authorityResolved: store.hasAuthority(task.citationId),
      propositionSupported: "inconclusive",
      confidence: 0,
      analysis: "Supervisor did not return a structured response.",
      trace: trace.map((t) => ({ agent: t.agent, action: t.action, outcome: t.outcome })),
    };
  }

  return { output, trace, store };
}

/** Re-export for callers that want to pre-seed the store (e.g. from DB findings). */
export { ArtifactStore };
// Silence the unused-import lint for AIMessageChunk while keeping the type
// available for downstream typing if needed.
export type { AIMessageChunk };
