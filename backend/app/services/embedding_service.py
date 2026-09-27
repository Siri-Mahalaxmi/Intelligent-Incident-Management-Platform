"""
Embedding service — generates and stores vector embeddings for incidents.
Updated to support org-scoped similarity search via match_incidents().
"""

import os
from typing import List, Optional

from fastapi import HTTPException
from google import genai

from app.database import supabase_client
from app.models.incident import SimilarIncident

_embedding_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _embedding_client
    if _embedding_client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
        _embedding_client = genai.Client(api_key=api_key)
    return _embedding_client


_EMBEDDING_MODEL = "gemini-embedding-001"
_EMBEDDING_DIMS  = 1536
_EMBEDDING_TASK  = "RETRIEVAL_DOCUMENT"


def _build_embedding_text(incident: dict) -> str:
    parts = [
        f"Title: {incident.get('title', '')}",
        f"Service: {incident.get('service', '')}",
        f"Severity: {incident.get('severity', '')}",
        f"Description: {incident.get('description', '')}",
        f"Logs: {incident.get('logs', '')}",
    ]
    return "\n".join(p for p in parts if p.split(": ", 1)[1].strip())


def _embed_text(text: str) -> List[float]:
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


def generate_and_store_embedding(incident_id: str) -> None:
    """
    Fetch the incident from Supabase, generate an embedding, and write
    the vector back to the `embedding` column.
    """
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

    try:
        vector = _embed_text(text)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {exc}",
        ) from exc

    supabase_client.table("incidents").update(
        {"embedding": vector}
    ).eq("incident_id", incident_id).execute()


def find_similar_incidents(
    incident_id: str,
    match_threshold: float = 0.5,
    match_count: int = 3,
    organization_id: Optional[str] = None,
) -> List[SimilarIncident]:
    """
    Find incidents most similar to `incident_id` using cosine similarity.
    If organization_id is provided, only returns matches within that org.
    """
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
        generate_and_store_embedding(incident_id)
        emb_response = (
            supabase_client.table("incidents")
            .select("embedding")
            .eq("incident_id", incident_id)
            .single()
            .execute()
        )

    query_vector = emb_response.data["embedding"]

    try:
        rpc_params = {
            "query_embedding": query_vector,
            "match_threshold": match_threshold,
            "match_count": match_count,
            "exclude_id": incident_id,
        }
        # Pass org filter if provided (updated match_incidents() supports this)
        if organization_id:
            rpc_params["p_organization_id"] = organization_id

        rpc_response = supabase_client.rpc(
            "match_incidents",
            rpc_params,
        ).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Similarity search failed: {exc}",
        ) from exc

    results = rpc_response.data or []
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
        for row in results
    ]
