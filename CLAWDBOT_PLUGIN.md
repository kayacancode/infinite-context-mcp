# Infinite Context - Clawdbot Plugin

This plugin bridges the Infinite Context MCP Python server to Clawdbot, providing AI memory with:

- **Vector Search** - Semantic search over saved contexts using Pinecone
- **Knowledge Graphs** - Entity relationships and multi-hop reasoning
- **User Profiles** - Personalized context injection
- **Fact Extraction** - Atomic knowledge extraction and chaining
- **Smart Indexing** - Index repos, docs, websites, and local files

## Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in the plugin directory or export these environment variables:

```bash
# Required
export PINECONE_API_KEY="your-pinecone-api-key"
export OPENAI_API_KEY="your-openai-api-key"

# Optional
export PINECONE_INDEX_NAME="infinite-context-index"  # Defaults to this
export INFINITE_CONTEXT_PORT="8787"                  # API server port
export INFINITE_CONTEXT_HOST="0.0.0.0"               # API server host
export GITHUB_TOKEN="your-github-token"              # For indexing private repos
```

### 2. Install Python Dependencies

```bash
cd /path/to/infinite-context-plugin

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Start the Python API Server

```bash
# Option 1: Direct run
python api.py

# Option 2: Using uvicorn (more control)
uvicorn api:app --host 0.0.0.0 --port 8787 --reload

# Option 3: Background with logging
nohup python api.py > api.log 2>&1 &
```

The server will start at `http://localhost:8787`. Test it:

```bash
curl http://localhost:8787/health
```

Expected response:
```json
{"status":"healthy","service":"infinite-context-api","session":"...","chunk_count":0}
```

### 4. Configure the Clawdbot Plugin

Add to your Clawdbot config (`~/.clawdbot/config.json5`):

```json5
{
  plugins: {
    entries: {
      "infinite-context": {
        // Path to this plugin directory
        path: "/path/to/infinite-context-plugin",
        config: {
          serverUrl: "http://localhost:8787",
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

### 5. Enable Optional Tools (If Needed)

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

### 6. Verify Installation

```bash
# Check plugin is loaded
clawdbot doctor

# Test server connection
clawdbot ic status

# Show memory stats
clawdbot ic stats
```

## API Endpoints

The Python API server exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/save_context` | POST | Save conversation context |
| `/api/search_context` | POST | Search saved contexts |
| `/api/enhanced_search` | POST | Enhanced search with query understanding |
| `/api/ask_question` | POST | RAG question answering |
| `/api/auto_compress` | POST | Compress and save conversation |
| `/api/get_memory_stats` | GET/POST | Get memory statistics |
| `/api/get_user_profile` | GET/POST | Get user profile |
| `/api/update_user_profile` | POST | Update user profile |
| `/api/query_knowledge_graph` | POST | Query entity relationships |
| `/api/get_graph_summary` | GET/POST | Get knowledge graph summary |
| `/api/query_facts` | POST | Query extracted facts |
| `/api/get_fact_summary` | GET/POST | Get fact summary |
| `/api/index_repository` | POST | Index a GitHub repository |
| `/api/index_documentation` | POST | Index a documentation site |
| `/api/index_website` | POST | Index a full website |
| `/api/index_local_filesystem` | POST | Index a local directory |
| `/api/index_url` | POST | Index a single URL |
| `/api/check_indexing_status` | GET/POST | Check indexing status |
| `/api/list_indexed_sources` | GET/POST | List indexed sources |
| `/api/delete_indexed_source` | DELETE/POST | Delete an indexed source |
| `/api/classify_query` | POST | Classify query intent |
| `/api/rewrite_query` | POST | Generate query rewrites |
| `/api/smart_action` | POST | Natural language orchestration |

## Available Clawdbot Tools

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
│  (index.ts plugin)  │               │     (api.py)        │
└─────────────────────┘               └─────────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────────┐
                                      │  InfiniteContextMCP │
                                      │     (main.py)       │
                                      └─────────────────────┘
                                               │
                           ┌───────────────────┼───────────────────┐
                           ▼                   ▼                   ▼
                    ┌───────────┐      ┌───────────┐      ┌───────────┐
                    │ Pinecone  │      │  OpenAI   │      │  Memory   │
                    │  (Vector  │      │ (Embed +  │      │  System   │
                    │   Store)  │      │   LLM)    │      │ (Profile, │
                    └───────────┘      └───────────┘      │  Graph,   │
                                                          │  Facts)   │
                                                          └───────────┘
```

## Requirements

- Python 3.10+ with dependencies from `requirements.txt`
- Pinecone account and API key
- OpenAI API key
- Node.js 18+ for Clawdbot

## Testing the Integration

After setup, test the full integration:

```bash
# 1. Start the Python API server
cd /path/to/infinite-context-plugin
source venv/bin/activate
python api.py &

# 2. Test health endpoint
curl http://localhost:8787/health

# 3. Test save context
curl -X POST http://localhost:8787/api/save_context \
  -H "Content-Type: application/json" \
  -d '{"summary": "Test context", "topics": ["testing"]}'

# 4. Test search
curl -X POST http://localhost:8787/api/search_context \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'

# 5. Test via Clawdbot CLI
clawdbot ic status
clawdbot ic stats
```

## Troubleshooting

### Server Not Available
If you see "server not available" warnings:
1. Ensure the Python server is running: `python api.py`
2. Check the `serverUrl` in your config matches the running server
3. Verify network connectivity: `curl http://localhost:8787/health`
4. Check for port conflicts

### No Results Found
1. Make sure you've saved some context first
2. Try broader search terms
3. Lower the `min_relevance` threshold

### Tools Not Appearing
1. Check that the plugin is properly loaded: `clawdbot doctor`
2. Verify optional tools are in your allowlist
3. Check for config validation errors

### Pinecone Connection Issues
1. Verify `PINECONE_API_KEY` is set correctly
2. Check the index name matches your Pinecone dashboard
3. Ensure your Pinecone region matches the code (default: us-east-1)

### OpenAI API Errors
1. Verify `OPENAI_API_KEY` is set correctly
2. Check your OpenAI account has API access
3. Monitor rate limits

## Development

### Running in Development Mode

```bash
# Start API with auto-reload
uvicorn api:app --host 0.0.0.0 --port 8787 --reload

# View logs
tail -f api.log
```

### API Documentation

When the server is running, visit:
- Swagger UI: http://localhost:8787/docs
- ReDoc: http://localhost:8787/redoc

### Running Tests

```bash
# Test API endpoints
python -m pytest tests/ -v

# Test specific endpoint
curl -X POST http://localhost:8787/api/get_memory_stats
```
