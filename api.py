"""
Infinite Context MCP - FastAPI REST API Wrapper

This module provides HTTP REST API endpoints for the Infinite Context MCP server,
allowing Clawdbot plugins and other HTTP clients to interact with the memory system.

Usage:
    uvicorn api:app --host 0.0.0.0 --port 8787

Or programmatically:
    from api import app
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)
"""

import os
import asyncio
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import the MCP server
from main import InfiniteContextMCP

# ============================================================================
# Request/Response Models
# ============================================================================

class SaveContextRequest(BaseModel):
    summary: str = Field(..., description="Summary of the conversation")
    topics: Optional[List[str]] = Field(default=None, description="List of topics")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Structured data to save")
    key_findings: Optional[List[str]] = Field(default=None, description="Key findings")
    content: Optional[str] = Field(default=None, description="Full content to save")
    user_id: Optional[str] = Field(default=None, description="User ID for profile isolation")
    valid_from: Optional[str] = Field(default=None, description="Temporal validity start")
    valid_until: Optional[str] = Field(default=None, description="Temporal validity end")
    supersedes: Optional[str] = Field(default=None, description="ID of chunk this supersedes")


class SearchContextRequest(BaseModel):
    query: str = Field(..., description="Search query")
    top_k: Optional[int] = Field(default=5, description="Number of results to return")
    min_relevance: Optional[float] = Field(default=0.3, description="Minimum relevance score")
    generate_ai_response: Optional[bool] = Field(default=True, description="Generate AI response")
    user_id: Optional[str] = Field(default=None, description="User ID for profile context")
    use_profile_context: Optional[bool] = Field(default=True, description="Use profile for personalization")


class EnhancedSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    top_k: Optional[int] = Field(default=3, description="Number of results to return")
    use_rewrites: Optional[bool] = Field(default=True, description="Use query rewrites")
    min_relevance: Optional[float] = Field(default=0.7, description="Minimum relevance score")
    auto_refine: Optional[bool] = Field(default=True, description="Auto-refine if results are poor")
    generate_ai_response: Optional[bool] = Field(default=True, description="Generate AI response")


class AskQuestionRequest(BaseModel):
    question: str = Field(..., description="Question to ask about saved data")
    top_k: Optional[int] = Field(default=10, description="Number of contexts to retrieve")
    min_relevance: Optional[float] = Field(default=0.3, description="Minimum relevance threshold")


class AutoCompressRequest(BaseModel):
    conversation: str = Field(..., description="Conversation to compress")
    focus: Optional[str] = Field(default="general", description="Focus area for compression")


class UserProfileRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="User ID")


class UpdateUserProfileRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="User ID")
    current_focus: Optional[str] = Field(default=None, description="Current focus/project")
    add_topics: Optional[List[str]] = Field(default=None, description="Topics to add")
    preferences: Optional[Dict[str, Any]] = Field(default=None, description="Preferences to set")


class QueryKnowledgeGraphRequest(BaseModel):
    entity_name: str = Field(..., description="Entity name to query")
    find_path_to: Optional[str] = Field(default=None, description="Find path to another entity")
    relation_types: Optional[List[str]] = Field(default=None, description="Filter by relation types")
    max_depth: Optional[int] = Field(default=2, description="Max traversal depth")


class QueryFactsRequest(BaseModel):
    entity: Optional[str] = Field(default=None, description="Entity to filter by")
    fact_type: Optional[str] = Field(default=None, description="Fact type to filter by")
    include_superseded: Optional[bool] = Field(default=False, description="Include superseded facts")
    limit: Optional[int] = Field(default=20, description="Maximum facts to return")


class IndexRepositoryRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL")
    branch: Optional[str] = Field(default=None, description="Branch to index")
    file_patterns: Optional[List[str]] = Field(default=None, description="File patterns to include")


class IndexDocumentationRequest(BaseModel):
    url: str = Field(..., description="Documentation site URL")
    url_patterns: Optional[List[str]] = Field(default=None, description="URL patterns to include")
    exclude_patterns: Optional[List[str]] = Field(default=None, description="URL patterns to exclude")
    only_main_content: Optional[bool] = Field(default=True, description="Extract only main content")


class IndexWebsiteRequest(BaseModel):
    url: str = Field(..., description="Root URL of website")
    max_depth: Optional[int] = Field(default=3, description="Maximum crawl depth")
    max_pages: Optional[int] = Field(default=100, description="Maximum pages to index")
    url_patterns: Optional[List[str]] = Field(default=None, description="URL patterns to include")
    exclude_patterns: Optional[List[str]] = Field(default=None, description="URL patterns to exclude")
    only_main_content: Optional[bool] = Field(default=True, description="Extract only main content")
    wait_for: Optional[int] = Field(default=None, description="Wait time in ms")
    include_screenshot: Optional[bool] = Field(default=False, description="Include screenshots")


class IndexLocalFilesystemRequest(BaseModel):
    directory_path: str = Field(..., description="Absolute path to directory")
    inclusion_patterns: Optional[List[str]] = Field(default=None, description="Patterns to include")
    exclusion_patterns: Optional[List[str]] = Field(default=None, description="Patterns to exclude")
    max_file_size_mb: Optional[int] = Field(default=50, description="Max file size in MB")


class IndexUrlRequest(BaseModel):
    url: str = Field(..., description="URL to index")
    only_main_content: Optional[bool] = Field(default=True, description="Extract only main content")
    wait_for: Optional[int] = Field(default=None, description="Wait time in ms for dynamic content")


class SourceIdRequest(BaseModel):
    source_id: str = Field(..., description="Source ID")


class ClassifyQueryRequest(BaseModel):
    query: str = Field(..., description="Query to classify")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional domain context")


class RewriteQueryRequest(BaseModel):
    query: str = Field(..., description="Query to rewrite")
    rewrite_types: Optional[List[str]] = Field(
        default=None, 
        description="Types of rewrites: synonym, broader, expansion, substitute"
    )


class SmartActionRequest(BaseModel):
    request: str = Field(..., description="Natural language request")
    conversation_context: Optional[str] = Field(default=None, description="Conversation context for analysis")


class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool = True
    text: str = Field(..., description="Response text")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Additional data")


# ============================================================================
# Global MCP instance
# ============================================================================

mcp_instance: Optional[InfiniteContextMCP] = None


def get_mcp() -> InfiniteContextMCP:
    """Get or create the MCP instance"""
    global mcp_instance
    if mcp_instance is None:
        mcp_instance = InfiniteContextMCP()
    return mcp_instance


# ============================================================================
# Lifespan handler
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - initialize MCP on startup"""
    global mcp_instance
    print("🚀 Starting Infinite Context API server...")
    mcp_instance = InfiniteContextMCP()
    print("✅ MCP instance initialized")
    yield
    print("👋 Shutting down Infinite Context API server...")


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Infinite Context API",
    description="REST API wrapper for Infinite Context MCP - AI memory with vector search, knowledge graphs, and fact extraction",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    mcp = get_mcp()
    return {
        "status": "healthy",
        "service": "infinite-context-api",
        "session": mcp.current_session,
        "chunk_count": mcp.chunk_count
    }


# ============================================================================
# Core Memory Endpoints
# ============================================================================

@app.post("/api/save_context", response_model=ApiResponse)
async def save_context(request: SaveContextRequest):
    """Save conversation context to memory"""
    try:
        mcp = get_mcp()
        result = await mcp.save_context(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search_context", response_model=ApiResponse)
async def search_context(request: SearchContextRequest):
    """Search through saved contexts"""
    try:
        mcp = get_mcp()
        result = await mcp.search_context(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/enhanced_search", response_model=ApiResponse)
async def enhanced_search(request: EnhancedSearchRequest):
    """Enhanced search with query understanding and rewrites"""
    try:
        mcp = get_mcp()
        result = await mcp.enhanced_search(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask_question", response_model=ApiResponse)
async def ask_question(request: AskQuestionRequest):
    """RAG Question Answering over saved data"""
    try:
        mcp = get_mcp()
        result = await mcp.ask_question(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auto_compress", response_model=ApiResponse)
async def auto_compress(request: AutoCompressRequest):
    """Compress and save conversation"""
    try:
        mcp = get_mcp()
        result = await mcp.auto_compress(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get_memory_stats", response_model=ApiResponse)
@app.get("/api/get_memory_stats", response_model=ApiResponse)
async def get_memory_stats():
    """Get memory statistics"""
    try:
        mcp = get_mcp()
        result = await mcp.get_memory_stats()
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# User Profile Endpoints
# ============================================================================

@app.post("/api/get_user_profile", response_model=ApiResponse)
@app.get("/api/get_user_profile", response_model=ApiResponse)
async def get_user_profile(request: Optional[UserProfileRequest] = None):
    """Get user profile"""
    try:
        mcp = get_mcp()
        args = request.model_dump(exclude_none=True) if request else {}
        result = await mcp.get_user_profile(args)
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/update_user_profile", response_model=ApiResponse)
async def update_user_profile(request: UpdateUserProfileRequest):
    """Update user profile"""
    try:
        mcp = get_mcp()
        result = await mcp.update_user_profile(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Knowledge Graph Endpoints
# ============================================================================

@app.post("/api/query_knowledge_graph", response_model=ApiResponse)
async def query_knowledge_graph(request: QueryKnowledgeGraphRequest):
    """Query the knowledge graph for entity relationships"""
    try:
        mcp = get_mcp()
        result = await mcp.query_knowledge_graph(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get_graph_summary", response_model=ApiResponse)
@app.get("/api/get_graph_summary", response_model=ApiResponse)
async def get_graph_summary():
    """Get knowledge graph summary"""
    try:
        mcp = get_mcp()
        result = await mcp.get_graph_summary({})
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Fact Endpoints
# ============================================================================

@app.post("/api/query_facts", response_model=ApiResponse)
async def query_facts(request: Optional[QueryFactsRequest] = None):
    """Query extracted facts"""
    try:
        mcp = get_mcp()
        args = request.model_dump(exclude_none=True) if request else {}
        result = await mcp.query_facts(args)
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get_fact_summary", response_model=ApiResponse)
@app.get("/api/get_fact_summary", response_model=ApiResponse)
async def get_fact_summary():
    """Get fact store summary"""
    try:
        mcp = get_mcp()
        result = await mcp.get_fact_summary({})
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Indexing Endpoints
# ============================================================================

@app.post("/api/index_repository", response_model=ApiResponse)
async def index_repository(request: IndexRepositoryRequest):
    """Index a GitHub repository"""
    try:
        mcp = get_mcp()
        result = await mcp.index_repository(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/index_documentation", response_model=ApiResponse)
async def index_documentation(request: IndexDocumentationRequest):
    """Index a documentation site"""
    try:
        mcp = get_mcp()
        result = await mcp.index_documentation(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/index_website", response_model=ApiResponse)
async def index_website(request: IndexWebsiteRequest):
    """Index a full website"""
    try:
        mcp = get_mcp()
        result = await mcp.index_website(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/index_local_filesystem", response_model=ApiResponse)
async def index_local_filesystem(request: IndexLocalFilesystemRequest):
    """Index a local filesystem directory"""
    try:
        mcp = get_mcp()
        result = await mcp.index_local_filesystem(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/index_url", response_model=ApiResponse)
async def index_url(request: IndexUrlRequest):
    """Index a single URL"""
    try:
        mcp = get_mcp()
        result = await mcp.index_url(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/check_indexing_status", response_model=ApiResponse)
@app.get("/api/check_indexing_status/{source_id}", response_model=ApiResponse)
async def check_indexing_status(source_id: Optional[str] = None, request: Optional[SourceIdRequest] = None):
    """Check indexing status of a source"""
    try:
        mcp = get_mcp()
        sid = source_id or (request.source_id if request else None)
        if not sid:
            raise HTTPException(status_code=400, detail="source_id is required")
        result = await mcp.check_indexing_status({"source_id": sid})
        return ApiResponse(success=True, text=result.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/list_indexed_sources", response_model=ApiResponse)
@app.get("/api/list_indexed_sources", response_model=ApiResponse)
async def list_indexed_sources():
    """List all indexed sources"""
    try:
        mcp = get_mcp()
        result = await mcp.list_indexed_sources({})
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/delete_indexed_source", response_model=ApiResponse)
@app.delete("/api/delete_indexed_source/{source_id}", response_model=ApiResponse)
async def delete_indexed_source(source_id: Optional[str] = None, request: Optional[SourceIdRequest] = None):
    """Delete an indexed source"""
    try:
        mcp = get_mcp()
        sid = source_id or (request.source_id if request else None)
        if not sid:
            raise HTTPException(status_code=400, detail="source_id is required")
        result = await mcp.delete_indexed_source({"source_id": sid})
        return ApiResponse(success=True, text=result.text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Query Understanding Endpoints
# ============================================================================

@app.post("/api/classify_query", response_model=ApiResponse)
async def classify_query(request: ClassifyQueryRequest):
    """Classify a query to understand intent"""
    try:
        mcp = get_mcp()
        result = await mcp.classify_query(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rewrite_query", response_model=ApiResponse)
async def rewrite_query(request: RewriteQueryRequest):
    """Generate query rewrites for better recall"""
    try:
        mcp = get_mcp()
        result = await mcp.rewrite_query(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Smart Action Endpoint
# ============================================================================

@app.post("/api/smart_action", response_model=ApiResponse)
async def smart_action(request: SmartActionRequest):
    """Intelligent orchestration - natural language interface"""
    try:
        mcp = get_mcp()
        result = await mcp.smart_action(request.model_dump(exclude_none=True))
        return ApiResponse(success=True, text=result.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Main entry point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("INFINITE_CONTEXT_PORT", "8787"))
    host = os.getenv("INFINITE_CONTEXT_HOST", "0.0.0.0")
    
    print(f"🚀 Starting Infinite Context API on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
