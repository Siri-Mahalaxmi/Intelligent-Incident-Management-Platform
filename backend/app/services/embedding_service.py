"""
Embedding service — generates and stores vector embeddings for incidents.

Uses Google's text-embedding-004 model (768 dimensions) via the google-genai
SDK. Embeddings are generated from a combined text of the incident title,
service, description, and logs so that similarity search captures full context.

Public API
----------
generate_and_store_embedding(incident_id)  — generate + persist to Supabase
find_similar_incidents(incident_id, ...)   — vector search via match_incidents()
"""

import os
from typing import List

from fastapi import HTTPException
from google import genai

from app.database import supabase_client
from app.models.incident import SimilarIncident

# ---------------------------------------------------------------------------
# Gemini embedding client (initialised lazily on first call so that .env is
# guaranteed loaded by main.py before this module is imported at request time)
# ---------------------------------------------------------------------------

_embedding_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _embedding_client
    if _embedding_client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
        _embedding_client = genai.Client(api_key=api_key)
    return _embedding_client


# ---------------------------------------------------------------------------
# Embedding model configuration
# ---------------------------------------------------------------------------

_EMBEDDING_MODEL = "gemini-embedding-001"  # supports output_dimensionality truncation
_EMBEDDING_DIMS  = 1536                    # truncated from 3072; fits HNSW 2000-dim limit
_EMBEDDING_TASK  = "RETRIEVAL_DOCUMENT"   # best task type for similarity search


def _build_embedding_text(incident: dict) -> str:
    """
    Concatenate incident fields into a single string for embedding.
    The richer the text, the more meaningful the similarity scores.
    """
    parts = [
        f"Title: {incident.get('title', '')}",
        f"Service: {incident.get('service', '')}",
        f"Severity: {incident.get('severity', '')}",
        f"Description: {incident.get('description', '')}",
        f"Logs: {incident.get('logs', '')}",
    ]
    return "\n".join(p for p in parts if p.split(": ", 1)[1].strip())


def _embed_text(text: str) -> List[float]:
    """Call Gemini gemini-embedding-001 truncated to 1536 dims and return as a plain list."""
    client = _get_client()
    response = client.models.embed_content(
        model=_EMBEDDING_MODEL,
        contents=text,
        config={
            "task_type": _EMBEDDING_TASK,
            "output_dimensionality": _EMBEDDING_DIMS,
        },
    )
    return response.embeddings[0].values


# ---------------------------------------------------------------------------
# Public: generate + store
# ---------------------------------------------------------------------------

def generate_and_store_embedding(incident_id: str) -> None:
    """
    Fetch the incident from Supabase, generate an embedding for it, and write
    the vector back to the `embedding` column.

    Raises HTTPException(404) if the incident is not found.
    Raises HTTPException(500) on embedding or DB failure.
    """
    # Fetch the incident row
    response = (
        supabase_client.table("incidents")
        .select("incident_id, title, service, severity, description, logs")
        .eq("incident_id", incident_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found.",
        )

    incident = response.data
    text = _build_embedding_text(incident)

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail=f"Incident '{incident_id}' has no text to embed.",
        )

    # Generate embedding
    try:
        vector = _embed_text(text)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {exc}",
        ) from exc

    # Persist to Supabase — pgvector accepts a plain Python list
    supabase_client.table("incidents").update(
        {"embedding": vector}
    ).eq("incident_id", incident_id).execute()


# ---------------------------------------------------------------------------
# Public: similarity search
# ---------------------------------------------------------------------------

def find_similar_incidents(
    incident_id: str,
    match_threshold: float = 0.5,
    match_count: int = 3,
) -> List[SimilarIncident]:
    """
    Find incidents most similar to `incident_id` using cosine similarity.

    1. Fetches the stored embedding for the query incident.
    2. Calls the match_incidents() Postgres function via Supabase RPC.
    3. Returns up to `match_count` results with similarity >= `match_threshold`.

    If the query incident has no embedding yet, generates one on the fly first.
    """
    # Check if query incident already has an embedding
    emb_response = (
        supabase_client.table("incidents")
        .select("embedding")
        .eq("incident_id", incident_id)
        .single()
        .execute()
    )

    if not emb_response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found.",
        )

    if not emb_response.data.get("embedding"):
        # Generate and store on the fly so search always works
        generate_and_store_embedding(incident_id)

        # Re-fetch the freshly stored embedding
        emb_response = (
            supabase_client.table("incidents")
            .select("embedding")
            .eq("incident_id", incident_id)
            .single()
            .execute()
        )

    query_vector = emb_response.data["embedding"]

    # Call the match_incidents() Postgres function
    try:
        rpc_response = supabase_client.rpc(
            "match_incidents",
            {
                "query_embedding": query_vector,
                "match_threshold": match_threshold,
                "match_count": match_count,
                "exclude_id": incident_id,
            },
        ).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Similarity search failed: {exc}",
        ) from exc

    rows = rpc_response.data or []
    return [
        SimilarIncident(
            incident_id=row["incident_id"],
            title=row["title"],
            service=row["service"],
            severity=row["severity"],
            status=row["status"],
            created_at=row["created_at"],
            similarity=round(float(row["similarity"]), 4),
        )
        for row in rows
    ]
