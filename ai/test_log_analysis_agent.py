import json

from log_analysis_agent import analyze_incident_logs, normalize_analysis_result


def test_normalize_analysis_result_handles_case_and_confidence_percentages():
    raw = {
        "summary": "The service is failing.",
        "probable_severity": "Medium",
        "key_error_patterns": ["Error rate elevated"],
        "confidence": 55,
    }

    normalized = normalize_analysis_result(raw)

    assert normalized["probable_severity"] == "MEDIUM"
    assert normalized["confidence"] == 0.55


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

logs_1002 = """2026-08-12 11:15:02.101 INFO  [checkout-service] Incoming POST /api/v1/checkout
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
2026-08-12 11:15:21.443 ERROR [checkout-service] HTTP 504 Gateway Timeout"""

logs_1003 = """2026-08-12 13:25:30.001 INFO  [deployment] Deployment started
2026-08-12 13:25:30.102 INFO  [deployment] Service: auth-service
2026-08-12 13:27:03.422 ERROR [auth-service] Missing required configuration property: JWT_SECRET
2026-08-12 13:27:08.442 ERROR [auth-service] NullPointerException: JWT secret is null
2026-08-12 13:27:08.443 ERROR [auth-service] HTTP 500 Internal Server Error
2026-08-12 13:27:15.001 WARN  [auth-service] Error rate increased from 0.2% to 38.7%"""

for name, logs in [("INC-1001 (Payment API)", logs_1001),
                    ("INC-1002 (Checkout Service)", logs_1002),
                    ("INC-1003 (Auth Service)", logs_1003)]:
    print(f"=== {name} ===")
    result = analyze_incident_logs(logs)
    print(json.dumps(result, indent=2))
    print()