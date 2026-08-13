# Kubernetes deployment

The root `k8s/` overlay deploys only stateless application workloads. It intentionally does not create database credentials or claim that a single PostgreSQL/Redis pod is production-grade.

## Required dependencies

- PostgreSQL 16 with backups and point-in-time recovery. `message_envelopes` is HASH-partitioned by `chat_id`.
- Redis 7 with authentication, persistence and failover. Backend pods publish realtime events on `chaos:ws:fanout`; only the pod that owns the matching WebSocket session delivers to the client.
- Kafka/Redpanda with at least three replicas. The realtime consumer group is shared (`chaos-realtime`), not unique per pod.
- Hikari `maximum-pool-size` is 4 in prod so 40 backend replicas stay around 160 connections to one primary. Do not raise HPA without lowering the pool or adding a connection pooler.
- Native STOMP WebSocket on `/ws`. SockJS remains on `/ws-sockjs` as a fallback.
- an RWX volume for the reference attachment backend, or a production object-storage adapter;
- metrics-server for HPA;
- cert-manager and an NGINX Ingress Controller.

Create `chaos-messenger-secret` using an external secret manager. `secret.example.yaml` documents the required keys and must never contain real values.

For a disposable local cluster only, deploy the reference stateful dependencies from `k8s/dev/` after creating a development secret. They are not high-availability services.

Before deployment, replace `chaos.example.com`, image placeholders, connection addresses, and CORS origins. The management port `9091` is intentionally not exposed by the public Ingress.
