/**
 * Clawdbot Infinite Context Plugin
 *
 * HTTP bridge to the Infinite Context MCP Python server.
 * Provides AI memory with vector search, knowledge graphs, user profiles,
 * fact extraction, and intelligent indexing.
 */

import { Type } from "@sinclair/typebox";
import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";

// ============================================================================
// Types
// ============================================================================

interface PluginConfig {
  serverUrl: string;
  apiKey?: string;
  userId?: string;
  autoRecall?: boolean;
  autoCapture?: boolean;
  defaultTopK?: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// HTTP Client
// ============================================================================

class InfiniteContextClient {
  constructor(
    private readonly serverUrl: string,
    private readonly apiKey?: string,
    private readonly userId?: string,
  ) {}

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "POST",
    body?: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    const url = `${this.serverUrl.replace(/\/$/, "")}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    // Inject userId into body if available
    if (body && this.userId) {
      body.user_id = this.userId;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      return { success: true, data: data as T };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // Core memory operations
  async saveContext(params: {
    summary: string;
    topics?: string[];
    data?: Record<string, unknown>;
    key_findings?: string[];
    content?: string;
  }) {
    return this.request("/api/save_context", "POST", params);
  }

  async searchContext(params: {
    query: string;
    top_k?: number;
    min_relevance?: number;
    use_profile_context?: boolean;
  }) {
    return this.request("/api/search_context", "POST", params);
  }

  async enhancedSearch(params: {
    query: string;
    top_k?: number;
    use_rewrites?: boolean;
    min_relevance?: number;
    auto_refine?: boolean;
  }) {
    return this.request("/api/enhanced_search", "POST", params);
  }

  async askQuestion(params: {
    question: string;
    top_k?: number;
    min_relevance?: number;
  }) {
    return this.request("/api/ask_question", "POST", params);
  }

  // User profile operations
  async getUserProfile(params: { user_id?: string } = {}) {
    return this.request("/api/get_user_profile", "POST", params);
  }

  async updateUserProfile(params: {
    user_id?: string;
    current_focus?: string;
    add_topics?: string[];
    preferences?: Record<string, unknown>;
  }) {
    return this.request("/api/update_user_profile", "POST", params);
  }

  // Knowledge graph operations
  async queryKnowledgeGraph(params: {
    entity_name: string;
    find_path_to?: string;
    relation_types?: string[];
    max_depth?: number;
  }) {
    return this.request("/api/query_knowledge_graph", "POST", params);
  }

  async getGraphSummary() {
    return this.request("/api/get_graph_summary", "POST", {});
  }

  // Fact operations
  async queryFacts(params: {
    entity?: string;
    fact_type?: string;
    include_superseded?: boolean;
    limit?: number;
  }) {
    return this.request("/api/query_facts", "POST", params);
  }

  async getFactSummary() {
    return this.request("/api/get_fact_summary", "POST", {});
  }

  // Indexing operations
  async indexRepository(params: {
    repo_url: string;
    branch?: string;
    file_patterns?: string[];
  }) {
    return this.request("/api/index_repository", "POST", params);
  }

  async indexDocumentation(params: {
    url: string;
    url_patterns?: string[];
    exclude_patterns?: string[];
    only_main_content?: boolean;
  }) {
    return this.request("/api/index_documentation", "POST", params);
  }

  async indexWebsite(params: {
    url: string;
    max_depth?: number;
    max_pages?: number;
    url_patterns?: string[];
    exclude_patterns?: string[];
    only_main_content?: boolean;
  }) {
    return this.request("/api/index_website", "POST", params);
  }

  async indexUrl(params: {
    url: string;
    only_main_content?: boolean;
    wait_for?: number;
  }) {
    return this.request("/api/index_url", "POST", params);
  }

  async indexLocalFilesystem(params: {
    directory_path: string;
    inclusion_patterns?: string[];
    exclusion_patterns?: string[];
    max_file_size_mb?: number;
  }) {
    return this.request("/api/index_local_filesystem", "POST", params);
  }

  async checkIndexingStatus(params: { source_id: string }) {
    return this.request("/api/check_indexing_status", "POST", params);
  }

  async listIndexedSources() {
    return this.request("/api/list_indexed_sources", "POST", {});
  }

  async deleteIndexedSource(params: { source_id: string }) {
    return this.request("/api/delete_indexed_source", "POST", params);
  }

  // Query understanding
  async classifyQuery(params: {
    query: string;
    context?: Record<string, unknown>;
  }) {
    return this.request("/api/classify_query", "POST", params);
  }

  async rewriteQuery(params: {
    query: string;
    rewrite_types?: string[];
  }) {
    return this.request("/api/rewrite_query", "POST", params);
  }

  // Smart action
  async smartAction(params: {
    request: string;
    conversation_context?: string;
  }) {
    return this.request("/api/smart_action", "POST", params);
  }

  // Stats
  async getMemoryStats() {
    return this.request("/api/get_memory_stats", "POST", {});
  }

  // Health check
  async healthCheck() {
    return this.request("/health", "GET");
  }
}

// ============================================================================
// Helper functions
// ============================================================================

function formatApiResult(result: ApiResponse): { type: "text"; text: string }[] {
  if (!result.success) {
    return [{ type: "text", text: `❌ Error: ${result.error}` }];
  }

  if (typeof result.data === "string") {
    return [{ type: "text", text: result.data }];
  }

  // Handle MCP-style response with text content
  if (result.data && typeof result.data === "object") {
    const data = result.data as Record<string, unknown>;
    if (data.text) {
      return [{ type: "text", text: String(data.text) }];
    }
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find((c: unknown) => 
        c && typeof c === "object" && (c as Record<string, unknown>).type === "text"
      );
      if (textContent && typeof (textContent as Record<string, unknown>).text === "string") {
        return [{ type: "text", text: (textContent as Record<string, unknown>).text as string }];
      }
    }
  }

  return [{ type: "text", text: JSON.stringify(result.data, null, 2) }];
}

// ============================================================================
// Plugin Definition
// ============================================================================

const infiniteContextPlugin = {
  id: "infinite-context",
  name: "Infinite Context",
  description: "AI memory layer with vector search, knowledge graphs, and fact extraction",
  kind: "memory" as const,

  register(api: ClawdbotPluginApi) {
    const cfg = api.pluginConfig as PluginConfig;
    const client = new InfiniteContextClient(
      cfg.serverUrl || "http://localhost:8000",
      cfg.apiKey,
      cfg.userId || "default_user",
    );
    const defaultTopK = cfg.defaultTopK || 5;

    api.logger.info(
      `infinite-context: plugin registered (server: ${cfg.serverUrl})`,
    );

    // ========================================================================
    // Core Memory Tools
    // ========================================================================

    api.registerTool({
      name: "ic_save_context",
      label: "Save Context",
      description:
        "Save conversation context to long-term memory. Extracts entities, builds knowledge graph, and chains facts automatically.",
      parameters: Type.Object({
        summary: Type.String({ description: "Summary of the conversation" }),
        topics: Type.Optional(Type.Array(Type.String(), { description: "Relevant topics" })),
        key_findings: Type.Optional(Type.Array(Type.String(), { description: "Key findings or insights" })),
        content: Type.Optional(Type.String({ description: "Full content to save" })),
      }),
      async execute(_toolCallId, params) {
        const result = await client.saveContext(params as Parameters<typeof client.saveContext>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool({
      name: "ic_search",
      label: "Search Context",
      description:
        "Search through saved conversation contexts using semantic search. Uses user profile for personalization.",
      parameters: Type.Object({
        query: Type.String({ description: "What to search for" }),
        top_k: Type.Optional(Type.Number({ description: `Max results (default: ${defaultTopK})` })),
        min_relevance: Type.Optional(Type.Number({ description: "Minimum relevance score 0-1" })),
      }),
      async execute(_toolCallId, params) {
        const searchParams = {
          ...params,
          top_k: (params as Record<string, unknown>).top_k ?? defaultTopK,
        };
        const result = await client.searchContext(searchParams as Parameters<typeof client.searchContext>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool({
      name: "ic_enhanced_search",
      label: "Enhanced Search",
      description:
        "Advanced search with query understanding, rewrites, and automatic refinement for better recall.",
      parameters: Type.Object({
        query: Type.String({ description: "What to search for" }),
        top_k: Type.Optional(Type.Number({ description: "Max results" })),
        use_rewrites: Type.Optional(Type.Boolean({ description: "Use query rewrites for better recall (default: true)" })),
        auto_refine: Type.Optional(Type.Boolean({ description: "Automatically refine if results are poor (default: true)" })),
      }),
      async execute(_toolCallId, params) {
        const result = await client.enhancedSearch(params as Parameters<typeof client.enhancedSearch>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool({
      name: "ic_ask",
      label: "Ask Question",
      description:
        "RAG Question Answering - Ask questions about your saved data. Searches relevant contexts and generates comprehensive answers.",
      parameters: Type.Object({
        question: Type.String({ description: "Question about your saved data" }),
        top_k: Type.Optional(Type.Number({ description: "Number of contexts to retrieve (default: 10)" })),
      }),
      async execute(_toolCallId, params) {
        const result = await client.askQuestion(params as Parameters<typeof client.askQuestion>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool({
      name: "ic_smart_action",
      label: "Smart Action",
      description:
        "Natural language interface - describe what you want to do and it routes to the appropriate tool.",
      parameters: Type.Object({
        request: Type.String({ description: "What you want to do (e.g., 'save this conversation', 'find past discussions about X')" }),
        conversation_context: Type.Optional(Type.String({ description: "Full conversation context for analysis" })),
      }),
      async execute(_toolCallId, params) {
        const result = await client.smartAction(params as Parameters<typeof client.smartAction>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    // ========================================================================
    // User Profile Tools
    // ========================================================================

    api.registerTool({
      name: "ic_profile",
      label: "Get User Profile",
      description:
        "Get the current user profile with preferences, entities, and context. Shows what the system knows about you.",
      parameters: Type.Object({}),
      async execute() {
        const result = await client.getUserProfile();
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool(
      {
        name: "ic_update_profile",
        label: "Update Profile",
        description: "Update user profile preferences or focus areas.",
        parameters: Type.Object({
          current_focus: Type.Optional(Type.String({ description: "Set current focus/project" })),
          add_topics: Type.Optional(Type.Array(Type.String(), { description: "Topics to add to interests" })),
        }),
        async execute(_toolCallId, params) {
          const result = await client.updateUserProfile(params as Parameters<typeof client.updateUserProfile>[0]);
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    // ========================================================================
    // Knowledge Graph Tools
    // ========================================================================

    api.registerTool({
      name: "ic_graph_query",
      label: "Query Knowledge Graph",
      description:
        "Query the knowledge graph for entity relationships. Find connections between people, projects, concepts.",
      parameters: Type.Object({
        entity_name: Type.String({ description: "Name of entity to query" }),
        find_path_to: Type.Optional(Type.String({ description: "Find path to another entity" })),
        max_depth: Type.Optional(Type.Number({ description: "Max traversal depth (default: 2)" })),
      }),
      async execute(_toolCallId, params) {
        const result = await client.queryKnowledgeGraph(params as Parameters<typeof client.queryKnowledgeGraph>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool({
      name: "ic_graph_summary",
      label: "Graph Summary",
      description: "Get a summary of the knowledge graph - entities, relationships, and most connected nodes.",
      parameters: Type.Object({}),
      async execute() {
        const result = await client.getGraphSummary();
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    // ========================================================================
    // Fact Tools
    // ========================================================================

    api.registerTool({
      name: "ic_facts",
      label: "Query Facts",
      description:
        "Query extracted facts by entity or type. Facts are atomic pieces of knowledge extracted from saved contexts.",
      parameters: Type.Object({
        entity: Type.Optional(Type.String({ description: "Get facts mentioning this entity" })),
        fact_type: Type.Optional(Type.String({ description: "Filter by type: statement, preference, decision, event, etc." })),
        include_superseded: Type.Optional(Type.Boolean({ description: "Include outdated facts" })),
        limit: Type.Optional(Type.Number({ description: "Max facts to return" })),
      }),
      async execute(_toolCallId, params) {
        const result = await client.queryFacts(params as Parameters<typeof client.queryFacts>[0]);
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    api.registerTool({
      name: "ic_facts_summary",
      label: "Facts Summary",
      description: "Get a summary of all extracted facts - counts by type, clusters, and recent facts.",
      parameters: Type.Object({}),
      async execute() {
        const result = await client.getFactSummary();
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    // ========================================================================
    // Indexing Tools (Optional - for power users)
    // ========================================================================

    api.registerTool(
      {
        name: "ic_index_repo",
        label: "Index Repository",
        description: "Index a GitHub repository for intelligent code search.",
        parameters: Type.Object({
          repo_url: Type.String({ description: "GitHub repository URL" }),
          branch: Type.Optional(Type.String({ description: "Branch to index" })),
          file_patterns: Type.Optional(Type.Array(Type.String(), { description: "File patterns to include" })),
        }),
        async execute(_toolCallId, params) {
          const result = await client.indexRepository(params as Parameters<typeof client.indexRepository>[0]);
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "ic_index_docs",
        label: "Index Documentation",
        description: "Index a documentation site for intelligent search.",
        parameters: Type.Object({
          url: Type.String({ description: "Documentation site URL" }),
          url_patterns: Type.Optional(Type.Array(Type.String(), { description: "URL patterns to include" })),
          exclude_patterns: Type.Optional(Type.Array(Type.String(), { description: "URL patterns to exclude" })),
        }),
        async execute(_toolCallId, params) {
          const result = await client.indexDocumentation(params as Parameters<typeof client.indexDocumentation>[0]);
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "ic_index_url",
        label: "Index URL",
        description: "Index a single URL (ChatGPT conversations, Twitter posts, blog posts, etc.).",
        parameters: Type.Object({
          url: Type.String({ description: "URL to index" }),
          only_main_content: Type.Optional(Type.Boolean({ description: "Extract only main content" })),
        }),
        async execute(_toolCallId, params) {
          const result = await client.indexUrl(params as Parameters<typeof client.indexUrl>[0]);
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "ic_index_local",
        label: "Index Local Directory",
        description: "Index a local filesystem directory.",
        parameters: Type.Object({
          directory_path: Type.String({ description: "Absolute path to directory" }),
          inclusion_patterns: Type.Optional(Type.Array(Type.String(), { description: "Patterns to include" })),
          exclusion_patterns: Type.Optional(Type.Array(Type.String(), { description: "Patterns to exclude" })),
        }),
        async execute(_toolCallId, params) {
          const result = await client.indexLocalFilesystem(params as Parameters<typeof client.indexLocalFilesystem>[0]);
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "ic_index_status",
        label: "Check Indexing Status",
        description: "Check the indexing status of a source.",
        parameters: Type.Object({
          source_id: Type.String({ description: "Source ID returned from indexing" }),
        }),
        async execute(_toolCallId, params) {
          const result = await client.checkIndexingStatus(params as Parameters<typeof client.checkIndexingStatus>[0]);
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "ic_index_list",
        label: "List Indexed Sources",
        description: "List all indexed sources.",
        parameters: Type.Object({}),
        async execute() {
          const result = await client.listIndexedSources();
          return {
            content: formatApiResult(result),
            details: result.data,
          };
        },
      },
      { optional: true },
    );

    // ========================================================================
    // Utility Tools
    // ========================================================================

    api.registerTool({
      name: "ic_stats",
      label: "Memory Stats",
      description: "Get statistics about stored conversation memory.",
      parameters: Type.Object({}),
      async execute() {
        const result = await client.getMemoryStats();
        return {
          content: formatApiResult(result),
          details: result.data,
        };
      },
    });

    // ========================================================================
    // CLI Commands
    // ========================================================================

    api.registerCli(
      ({ program }) => {
        const ic = program
          .command("ic")
          .description("Infinite Context memory commands");

        ic.command("status")
          .description("Check server status")
          .action(async () => {
            const result = await client.healthCheck();
            if (result.success) {
              console.log("✅ Infinite Context server is healthy");
              console.log(JSON.stringify(result.data, null, 2));
            } else {
              console.log("❌ Server unavailable:", result.error);
            }
          });

        ic.command("stats")
          .description("Show memory statistics")
          .action(async () => {
            const result = await client.getMemoryStats();
            console.log(JSON.stringify(result.data, null, 2));
          });

        ic.command("search")
          .description("Search saved contexts")
          .argument("<query>", "Search query")
          .option("--limit <n>", "Max results", "5")
          .action(async (query, opts) => {
            const result = await client.searchContext({
              query,
              top_k: parseInt(opts.limit),
            });
            console.log(formatApiResult(result)[0].text);
          });

        ic.command("ask")
          .description("Ask a question about saved data")
          .argument("<question>", "Question to ask")
          .action(async (question) => {
            const result = await client.askQuestion({ question });
            console.log(formatApiResult(result)[0].text);
          });

        ic.command("profile")
          .description("Show user profile")
          .action(async () => {
            const result = await client.getUserProfile();
            console.log(formatApiResult(result)[0].text);
          });

        ic.command("graph")
          .description("Query knowledge graph")
          .argument("<entity>", "Entity name")
          .action(async (entity) => {
            const result = await client.queryKnowledgeGraph({ entity_name: entity });
            console.log(formatApiResult(result)[0].text);
          });

        ic.command("sources")
          .description("List indexed sources")
          .action(async () => {
            const result = await client.listIndexedSources();
            console.log(JSON.stringify(result.data, null, 2));
          });
      },
      { commands: ["ic"] },
    );

    // ========================================================================
    // Lifecycle Hooks
    // ========================================================================

    // Auto-recall: inject relevant memories before agent starts
    if (cfg.autoRecall) {
      api.on("before_agent_start", async (event) => {
        if (!event.prompt || event.prompt.length < 10) return;

        try {
          const result = await client.searchContext({
            query: event.prompt,
            top_k: 3,
            min_relevance: 0.4,
          });

          if (!result.success || !result.data) return;

          // Extract memory content from response
          const data = result.data as Record<string, unknown>;
          if (data.text && typeof data.text === "string" && data.text.includes("Sources")) {
            api.logger.info("infinite-context: injecting relevant memories into context");
            return {
              prependContext: `<relevant-memories>\n${data.text.slice(0, 2000)}\n</relevant-memories>`,
            };
          }
        } catch (err) {
          api.logger.warn(`infinite-context: recall failed: ${String(err)}`);
        }
      });
    }

    // Auto-capture: save important information after agent ends
    if (cfg.autoCapture) {
      api.on("agent_end", async (event) => {
        if (!event.success || !event.messages || event.messages.length < 2) return;

        try {
          // Extract conversation content
          const texts: string[] = [];
          for (const msg of event.messages) {
            if (!msg || typeof msg !== "object") continue;
            const msgObj = msg as Record<string, unknown>;
            const role = msgObj.role;
            if (role !== "user" && role !== "assistant") continue;

            const content = msgObj.content;
            if (typeof content === "string" && content.length > 20) {
              texts.push(`${role}: ${content}`);
            }
          }

          if (texts.length < 2) return;

          // Use smart_action to analyze and save
          const conversationContext = texts.slice(-6).join("\n\n");
          await client.smartAction({
            request: "save this conversation if it contains useful information",
            conversation_context: conversationContext,
          });

          api.logger.info("infinite-context: auto-captured conversation context");
        } catch (err) {
          api.logger.warn(`infinite-context: capture failed: ${String(err)}`);
        }
      });
    }

    // ========================================================================
    // Service
    // ========================================================================

    api.registerService({
      id: "infinite-context",
      start: async () => {
        // Health check on startup
        const health = await client.healthCheck();
        if (health.success) {
          api.logger.info(
            `infinite-context: connected to server at ${cfg.serverUrl}`,
          );
        } else {
          api.logger.warn(
            `infinite-context: server not available at ${cfg.serverUrl} - ${health.error}`,
          );
        }
      },
      stop: () => {
        api.logger.info("infinite-context: stopped");
      },
    });
  },
};

export default infiniteContextPlugin;
