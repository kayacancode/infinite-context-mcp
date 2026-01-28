# Infinite Context - Clawdbot Plugin

This plugin bridges the Infinite Context MCP Python server to Clawdbot, providing AI memory with:

- **Vector Search** - Semantic search over saved contexts using Pinecone
- **Knowledge Graphs** - Entity relationships and multi-hop reasoning
- **User Profiles** - Personalized context injection
- **Fact Extraction** - Atomic knowledge extraction and chaining
- **Smart Indexing** - Index repos, docs, websites, and local files

## Setup

### 1. Start the Python Server

The plugin requires the Infinite Context Python API server running:

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PINECONE_API_KEY="your-pinecone-api-key"
export OPENAI_API_KEY="your-openai-api-key"
export PINECONE_INDEX_NAME="infinite-context-index"

# Start the API server (you may need to add a FastAPI wrapper)
# See start_api.sh or run with uvicorn
python -m uvicorn api:app --host 0.0.0.0 --port 8000
```

### 2. Configure the Plugin

Add to your Clawdbot config (`~/.clawdbot/config.json5`):

```json5
{
  plugins: {
    entries: {
      "infinite-context": {
        // Path to this plugin directory
        path: "/path/to/infinite-context-plugin",
        config: {
          serverUrl: "http://localhost:8000",
          // Optional API key for authentication
          apiKey: "${INFINITE_CONTEXT_API_KEY}",
          // User ID for profile isolation
          userId: "your-user-id",
          // Auto-inject memories into context
          autoRecall: true,
          // Auto-save important conversations
          autoCapture: false,
          // Default results to return
          defaultTopK: 5
        }
      }
    }
  }
}
```

### 3. Enable Optional Tools

Some tools are optional and must be explicitly enabled in your agent config:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        tools: {
          allow: [
            "infinite-context",        // Enable all plugin tools
            // Or enable specific tools:
            "ic_index_repo",           // Index GitHub repos
            "ic_index_docs",           // Index documentation sites
            "ic_index_url",            // Index single URLs
            "ic_index_local",          // Index local directories
            "ic_update_profile"        // Update user profile
          ]
        }
      }
    ]
  }
}
```

## Available Tools

### Core Memory Tools

| Tool | Description |
|------|-------------|
| `ic_save_context` | Save conversation context with automatic entity/fact extraction |
| `ic_search` | Semantic search through saved contexts |
| `ic_enhanced_search` | Advanced search with query rewrites and auto-refinement |
| `ic_ask` | RAG question answering over saved data |
| `ic_smart_action` | Natural language interface - describe what you want |

### User Profile Tools

| Tool | Description |
|------|-------------|
| `ic_profile` | Get current user profile (preferences, entities, context) |
| `ic_update_profile` | Update preferences or focus areas (optional) |

### Knowledge Graph Tools

| Tool | Description |
|------|-------------|
| `ic_graph_query` | Query entity relationships in the knowledge graph |
| `ic_graph_summary` | Get overview of entities and relationships |

### Fact Tools

| Tool | Description |
|------|-------------|
| `ic_facts` | Query extracted facts by entity or type |
| `ic_facts_summary` | Get summary of all facts |

### Indexing Tools (Optional)

| Tool | Description |
|------|-------------|
| `ic_index_repo` | Index a GitHub repository |
| `ic_index_docs` | Index a documentation site |
| `ic_index_url` | Index a single URL |
| `ic_index_local` | Index a local directory |
| `ic_index_status` | Check indexing status |
| `ic_index_list` | List all indexed sources |

### Utility Tools

| Tool | Description |
|------|-------------|
| `ic_stats` | Get memory statistics |

## CLI Commands

The plugin adds CLI commands under `clawdbot ic`:

```bash
# Check server status
clawdbot ic status

# Show memory statistics
clawdbot ic stats

# Search saved contexts
clawdbot ic search "pinecone setup"

# Ask a question
clawdbot ic ask "what projects have I worked on?"

# Show user profile
clawdbot ic profile

# Query knowledge graph
clawdbot ic graph "ProjectName"

# List indexed sources
clawdbot ic sources
```

## Example Usage

### Save Context
```
Save this conversation about setting up the MCP server with Pinecone integration.
```

### Search Memories
```
What did we discuss about vector search optimization?
```

### Ask Questions
```
What projects am I currently working on?
```

### Query Knowledge Graph
```
Show me relationships for entity "Pinecone"
```

## Auto Features

### Auto-Recall
When enabled, automatically searches for relevant memories before each conversation and injects them into context.

### Auto-Capture
When enabled, automatically analyzes conversations after they end and saves important information.

## Architecture

```
┌─────────────────────┐     HTTP      ┌─────────────────────┐
│   Clawdbot Agent    │◄────────────►│  Python API Server  │
│  (index.ts plugin)  │               │     (main.py)       │
└─────────────────────┘               └─────────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────────┐
                                      │     Pinecone        │
                                      │   (Vector Store)    │
                                      └─────────────────────┘
```

## Requirements

- Python 3.10+ with dependencies from `requirements.txt`
- Pinecone account and API key
- OpenAI API key
- Node.js 18+ for Clawdbot

## Troubleshooting

### Server Not Available
If you see "server not available" warnings:
1. Ensure the Python server is running
2. Check the `serverUrl` in your config
3. Verify network connectivity

### No Results Found
1. Make sure you've saved some context first
2. Try broader search terms
3. Lower the `min_relevance` threshold

### Tools Not Appearing
1. Check that the plugin is properly loaded: `clawdbot doctor`
2. Verify optional tools are in your allowlist
3. Check for config validation errors
