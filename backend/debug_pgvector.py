"""
Debug script — checks pgvector setup and embedding state.
Run with: python debug_pgvector.py
"""
import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

print("=" * 60)
print("CHECK 1: Embedding column + stored values")
print("=" * 60)
try:
    r = client.table("incidents").select("incident_id, embedding").execute()
    for row in r.data:
        emb = row.get("embedding")
        if emb:
            print(f"  {row['incident_id']}: STORED ({len(emb)} dims)")
        else:
            print(f"  {row['incident_id']}: NULL (no embedding yet)")
except Exception as e:
    print(f"  ERROR: {e}")

print()
print("=" * 60)
print("CHECK 2: match_incidents() RPC function")
print("=" * 60)
try:
    r2 = client.rpc("match_incidents", {
        "query_embedding": [0.0] * 768,
        "match_threshold": 0.0,
        "match_count": 3,
        "exclude_id": "NONE",
    }).execute()
    print(f"  OK — function exists, returned {len(r2.data)} rows")
except Exception as e:
    print(f"  ERROR: {e}")

print()
print("=" * 60)
print("CHECK 3: Try generating an embedding for INC-1001")
print("=" * 60)
try:
    from app.services.embedding_service import generate_and_store_embedding
    generate_and_store_embedding("INC-1001")
    print("  OK — embedding generated and stored for INC-1001")
except Exception as e:
    print(f"  ERROR: {e}")

print()
print("=" * 60)
print("CHECK 4: Run similarity search for INC-1001")
print("=" * 60)
try:
    from app.services.embedding_service import find_similar_incidents
    results = find_similar_incidents("INC-1001", match_threshold=0.0, match_count=5)
    if results:
        for r in results:
            print(f"  {r.incident_id} — similarity: {r.similarity:.4f} — {r.title[:50]}")
    else:
        print("  No results returned (embeddings may not exist for other incidents yet)")
except Exception as e:
    print(f"  ERROR: {e}")
