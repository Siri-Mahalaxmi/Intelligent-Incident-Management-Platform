import json
from log_analysis_agent import analyze_incident_logs

logs_1001 = """2026-08-12 10:41:12.421 INFO  [payment-api] Incoming POST /api/v1/payments
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
2026-08-12 10:41:31.902 WARN  [payment-api] Connection utilization reached maximum capacity"""

logs_1003 = """2026-08-12 13:25:30.001 INFO  [deployment] Deployment started
2026-08-12 13:25:30.102 INFO  [deployment] Service: auth-service
2026-08-12 13:27:03.422 ERROR [auth-service] Missing required configuration property: JWT_SECRET
2026-08-12 13:27:08.442 ERROR [auth-service] NullPointerException: JWT secret is null
2026-08-12 13:27:08.443 ERROR [auth-service] HTTP 500 Internal Server Error
2026-08-12 13:27:15.001 WARN  [auth-service] Error rate increased from 0.2% to 38.7%"""

print("=== INC-1001 (Payment API) ===")
result_1001 = analyze_incident_logs(logs_1001)
print(json.dumps(result_1001, indent=2))

print("\n=== INC-1003 (Auth Service) ===")
result_1003 = analyze_incident_logs(logs_1003)
print(json.dumps(result_1003, indent=2))