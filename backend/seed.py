"""
seed.py — Insert the 3 demo incidents into Supabase.

Run from the backend/ directory with the venv active:
    python seed.py

Safe to run multiple times — skips any incident whose incident_id already exists.
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load .env before importing anything that reads env vars
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in backend/.env")
    sys.exit(1)

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

now = datetime.now(timezone.utc)

INCIDENTS = [
    {
        "incident_id": "INC-1001",
        "title": "Payment API Database Connection Pool Exhausted",
        "service": "Payment API",
        "severity": "CRITICAL",
        "status": "OPEN",
        "description": (
            "The Payment API began throwing HTTP 500 errors after its database "
            "connection pool reached maximum capacity. Payments are failing for all "
            "users. Connection wait times spiked from 120 ms to over 2400 ms before "
            "the pool was fully exhausted."
        ),
        "logs": """\
2026-08-12 10:41:12.421 INFO  [payment-api] Incoming POST /api/v1/payments
2026-08-12 10:41:12.438 INFO  [payment-api] Processing payment request payment_id=PAY-78231
2026-08-12 10:41:15.902 WARN  [payment-api] Database connection acquisition taking longer than expected
2026-08-12 10:41:16.104 WARN  [payment-api] Active database connections: 98/100
2026-08-12 10:41:17.331 ERROR [payment-api] Failed to acquire database connection
2026-08-12 10:41:17.332 ERROR [payment-api] SQLTransientConnectionException: Timeout after 30000ms waiting for connection
2026-08-12 10:41:18.114 ERROR [payment-api] Payment request failed payment_id=PAY-78231
2026-08-12 10:41:18.115 ERROR [payment-api] HTTP 500 Internal Server Error
2026-08-12 10:41:21.552 WARN  [payment-api] Active database connections: 100/100
2026-08-12 10:41:22.002 WARN  [payment-api] Average query latency increased from 120ms to 2400ms
2026-08-12 10:41:25.761 ERROR [payment-api] Database connection timeout
2026-08-12 10:41:26.104 ERROR [payment-api] Database connection timeout
2026-08-12 10:41:27.442 ERROR [payment-api] Database connection timeout
2026-08-12 10:41:31.902 WARN  [payment-api] Connection utilization reached maximum capacity""",
        "created_at": (now - timedelta(hours=3)).isoformat(),
    },
    {
        "incident_id": "INC-1002",
        "title": "Checkout Service Cascading Timeout — Inventory Service Degraded",
        "service": "Checkout Service",
        "severity": "HIGH",
        "status": "IN_PROGRESS",
        "description": (
            "The Checkout Service is returning HTTP 504 Gateway Timeout errors "
            "due to cascading failures from a degraded Inventory Service. Thread "
            "pool utilization has reached 92 % and the retry queue has grown to "
            "over 400 items. Checkout latency has increased to an average of 8.7 seconds."
        ),
        "logs": """\
2026-08-12 11:15:02.101 INFO  [checkout-service] Incoming POST /api/v1/checkout
2026-08-12 11:15:02.115 INFO  [checkout-service] Processing checkout_id=CHK-45921
2026-08-12 11:15:02.210 INFO  [checkout-service] Calling Inventory Service
2026-08-12 11:15:03.902 WARN  [checkout-service] Inventory Service response time: 1692ms
2026-08-12 11:15:05.442 WARN  [checkout-service] Inventory Service response time exceeded threshold
2026-08-12 11:15:06.201 WARN  [checkout-service] Request retry triggered attempt=1
2026-08-12 11:15:07.913 WARN  [checkout-service] Inventory Service response time: 5800ms
2026-08-12 11:15:08.002 WARN  [checkout-service] Request retry triggered attempt=2
2026-08-12 11:15:09.771 ERROR [checkout-service] Inventory Service request timeout
2026-08-12 11:15:09.772 ERROR [checkout-service] TimeoutException
2026-08-12 11:15:10.114 WARN  [checkout-service] Active request threads: 185/200
2026-08-12 11:15:11.002 WARN  [checkout-service] Thread pool utilization: 92%
2026-08-12 11:15:12.341 ERROR [checkout-service] Checkout request timeout
2026-08-12 11:15:12.342 ERROR [checkout-service] HTTP 504 Gateway Timeout
2026-08-12 11:15:14.112 WARN  [checkout-service] Retry queue size increased to 427
2026-08-12 11:15:15.004 WARN  [checkout-service] Average checkout latency: 8.7 seconds
2026-08-12 11:15:18.771 ERROR [checkout-service] Multiple requests waiting for Inventory Service
2026-08-12 11:15:21.443 ERROR [checkout-service] HTTP 504 Gateway Timeout""",
        "created_at": (now - timedelta(hours=2)).isoformat(),
    },
    {
        "incident_id": "INC-1003",
        "title": "Auth Service Down After Deployment — Missing JWT_SECRET",
        "service": "Auth Service",
        "severity": "CRITICAL",
        "status": "RESOLVED",
        "description": (
            "A deployment of the Auth Service failed to include the JWT_SECRET "
            "environment variable. The service started throwing NullPointerExceptions "
            "on every authentication attempt, causing the error rate to spike from "
            "0.2 % to 38.7 %. All login and token-refresh requests are failing."
        ),
        "logs": """\
2026-08-12 13:25:30.001 INFO  [deployment] Deployment started
2026-08-12 13:25:30.102 INFO  [deployment] Service: auth-service
2026-08-12 13:27:03.422 ERROR [auth-service] Missing required configuration property: JWT_SECRET
2026-08-12 13:27:08.442 ERROR [auth-service] NullPointerException: JWT secret is null
2026-08-12 13:27:08.443 ERROR [auth-service] HTTP 500 Internal Server Error
2026-08-12 13:27:15.001 WARN  [auth-service] Error rate increased from 0.2% to 38.7%""",
        "created_at": (now - timedelta(hours=1)).isoformat(),
    },
]

# ---------------------------------------------------------------------------
# Insert — skip existing rows
# ---------------------------------------------------------------------------

def seed():
    print("Fetching existing incident IDs from Supabase...")
    existing_response = client.table("incidents").select("incident_id").execute()
    existing_ids = {row["incident_id"] for row in (existing_response.data or [])}
    print(f"  Found {len(existing_ids)} existing incident(s): {existing_ids or 'none'}")

    inserted = 0
    skipped = 0

    for inc in INCIDENTS:
        iid = inc["incident_id"]
        if iid in existing_ids:
            print(f"  SKIP  {iid} — already exists")
            skipped += 1
            continue

        response = client.table("incidents").insert(inc).execute()
        if response.data:
            print(f"  OK    {iid} — {inc['title'][:60]}")
            inserted += 1
        else:
            print(f"  ERROR {iid} — insert returned no data: {response}")

    print(f"\nDone. Inserted: {inserted}  Skipped: {skipped}")


if __name__ == "__main__":
    seed()
