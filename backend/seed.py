"""
seed.py — Insert the 5 demo incidents into Supabase.

Run from the backend/ directory with the venv active:
    python seed.py

Safe to run multiple times — skips any incident whose incident_id already exists.

Incidents:
  INC-1001  Payment API - Increased Failures and Latency          (HIGH,     OPEN)
  INC-1002  Checkout Service - High Latency and Request Timeouts  (CRITICAL, OPEN)
  INC-1003  Auth Service - Sudden 500 Errors                      (HIGH,     OPEN)
  INC-1004  Payment API - DB Pool Exhausted Under Flash Sale      (CRITICAL, RESOLVED) — RAG corpus
  INC-1005  Auth Service - Missing Env Var After Deployment       (HIGH,     RESOLVED) — RAG corpus
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

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
    # -------------------------------------------------------------------------
    # INC-1001 — primary demo incident
    # -------------------------------------------------------------------------
    {
        "incident_id": "INC-1001",
        "title": "Payment API - Increased Failures and Latency",
        "service": "Payment API",
        "severity": "HIGH",
        "status": "OPEN",
        "description": (
            "Payment requests are experiencing increased latency and intermittent "
            "failures. Multiple users are unable to complete payments successfully."
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
        "created_at": "2026-08-12T10:41:12Z",
    },

    # -------------------------------------------------------------------------
    # INC-1002 — primary demo incident
    # -------------------------------------------------------------------------
    {
        "incident_id": "INC-1002",
        "title": "Checkout Service - High Latency and Request Timeouts",
        "service": "Checkout Service",
        "severity": "CRITICAL",
        "status": "OPEN",
        "description": (
            "Checkout requests are taking significantly longer than normal and "
            "several requests are failing with gateway timeout errors."
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
        "created_at": "2026-08-12T11:15:02Z",
    },

    # -------------------------------------------------------------------------
    # INC-1003 — primary demo incident
    # -------------------------------------------------------------------------
    {
        "incident_id": "INC-1003",
        "title": "Auth Service - Sudden 500 Errors",
        "service": "Auth Service",
        "severity": "HIGH",
        "status": "OPEN",
        "description": (
            "Authentication requests started failing with HTTP 500 errors. "
            "The issue appeared shortly after a new application version was deployed."
        ),
        "logs": """\
2026-08-12 13:25:30.001 INFO  [deployment] Deployment started
2026-08-12 13:25:30.102 INFO  [deployment] Service: auth-service
2026-08-12 13:25:30.103 INFO  [deployment] Previous version: v2.7.4
2026-08-12 13:25:30.104 INFO  [deployment] New version: v2.8.0
2026-08-12 13:27:00.001 INFO  [deployment] Deployment completed successfully
2026-08-12 13:27:01.001 INFO  [auth-service] Starting application
2026-08-12 13:27:01.442 INFO  [auth-service] Application version: v2.8.0
2026-08-12 13:27:03.201 INFO  [auth-service] Loading application configuration
2026-08-12 13:27:03.422 ERROR [auth-service] Missing required configuration property: JWT_SECRET
2026-08-12 13:27:03.423 WARN  [auth-service] JWT configuration could not be initialized
2026-08-12 13:27:05.102 INFO  [auth-service] Application started successfully
2026-08-12 13:27:08.441 INFO  [auth-service] Incoming POST /api/v1/login
2026-08-12 13:27:08.442 ERROR [auth-service] Authentication module initialization failed
2026-08-12 13:27:08.442 ERROR [auth-service] NullPointerException: JWT secret is null
2026-08-12 13:27:08.443 ERROR [auth-service] HTTP 500 Internal Server Error
2026-08-12 13:27:09.112 ERROR [auth-service] Authentication request failed
2026-08-12 13:27:09.113 ERROR [auth-service] HTTP 500 Internal Server Error
2026-08-12 13:27:15.001 WARN  [auth-service] Error rate increased from 0.2% to 38.7%
2026-08-12 13:27:18.220 ERROR [auth-service] Failed to initialize JWT provider
2026-08-12 13:27:20.002 ERROR [auth-service] HTTP 500 Internal Server Error""",
        "created_at": "2026-08-12T13:27:08Z",
    },

    # -------------------------------------------------------------------------
    # INC-1004 — resolved historical variant (RAG similarity search corpus)
    # Similar failure class to INC-1001 (Payment API / DB connection exhaustion)
    # -------------------------------------------------------------------------
    {
        "incident_id": "INC-1004",
        "title": "Payment API - Database Connection Pool Exhausted Under Flash Sale",
        "service": "Payment API",
        "severity": "CRITICAL",
        "status": "RESOLVED",
        "description": (
            "A scheduled flash sale generated 18x normal traffic. The connection "
            "pool was sized for normal peak traffic and exhausted within 90 seconds, "
            "causing HTTP 503 errors for 62% of payment requests. Resolved by "
            "emergency pool size increase via config."
        ),
        "logs": """\
2026-05-20 18:00:00.001 INFO  [payment-api] Flash sale event started
2026-05-20 18:00:14.332 WARN  [payment-api] Request rate: 4200 req/min (normal: 230 req/min)
2026-05-20 18:00:41.881 WARN  [payment-api] Active database connections: 91/100
2026-05-20 18:01:12.002 ERROR [payment-api] SQLTransientConnectionException: Timeout 30000ms
2026-05-20 18:01:12.003 ERROR [payment-api] HTTP 503 Service Unavailable
2026-05-20 18:01:30.441 ERROR [payment-api] Connection pool exhausted — 100/100 active
2026-05-20 18:02:04.003 WARN  [payment-api] Queue depth: 812 requests waiting
2026-05-20 18:04:11.220 INFO  [payment-api] Pool size increased to 250 via hot config reload
2026-05-20 18:04:45.001 INFO  [payment-api] Connection availability restored
2026-05-20 18:06:00.002 INFO  [payment-api] Error rate < 1% — incident resolved""",
        "created_at": (now - timedelta(days=85)).isoformat(),
    },

    # -------------------------------------------------------------------------
    # INC-1005 — resolved historical variant (RAG similarity search corpus)
    # Similar failure class to INC-1003 (Auth Service / missing env var)
    # -------------------------------------------------------------------------
    {
        "incident_id": "INC-1005",
        "title": "Auth Service - Missing Environment Variable After Deployment",
        "service": "Auth Service",
        "severity": "HIGH",
        "status": "RESOLVED",
        "description": (
            "A secrets rotation process updated credentials in Vault but did not "
            "trigger a redeployment of the Auth Service. On the next rolling restart "
            "the service failed to initialise, causing all login requests to fail "
            "with NullPointerExceptions. Resolved by redeploying with updated secrets."
        ),
        "logs": """\
2026-07-03 08:01:00.001 INFO  [deployment] Rolling update started — auth-service v3.2.0
2026-07-03 08:01:44.332 INFO  [auth-service] Initialising configuration
2026-07-03 08:01:44.881 ERROR [auth-service] Missing required environment variable: SESSION_SECRET
2026-07-03 08:01:44.882 ERROR [auth-service] NullPointerException: Session secret is null
2026-07-03 08:01:44.883 ERROR [auth-service] Failed to initialise auth module
2026-07-03 08:01:45.002 ERROR [auth-service] Service startup failed — exiting
2026-07-03 08:03:01.220 WARN  [deployment] Pod restart loop detected — CrashLoopBackOff
2026-07-03 08:15:00.001 INFO  [deployment] Secret SESSION_SECRET injected from updated Vault path
2026-07-03 08:15:14.441 INFO  [auth-service] Auth module initialised successfully
2026-07-03 08:15:15.002 INFO  [auth-service] Service healthy — login requests resuming""",
        "created_at": (now - timedelta(days=46)).isoformat(),
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
