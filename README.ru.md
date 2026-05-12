<div align="center">

[English README](README.md) · [Быстрый запуск](SETUP_COMPLETE.ru.md) · [Аудит безопасности](SECURITY_AUDIT_RU.md) · [Issues](https://github.com/vaazhen/chaos-e2ee-messenger/issues)

<br/>

[![CI](https://github.com/vaazhen/chaos-e2ee-messenger/actions/workflows/ci.yml/badge.svg)](https://github.com/vaazhen/chaos-e2ee-messenger/actions/workflows/ci.yml)
[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

</div>

---

<div align="center">
  <img src="docs/assets/screenshots/header-ru.png" alt="Chaos Messenger" width="100%"/>
</div>

<br/>

<p align="center">
  <img src="docs/assets/screenshots/hero-ru.png" alt="Chaos Messenger — список чатов, переписка, устройства" width="100%"/>
</p>

<p align="center">
  <sub>Realtime-чат · encrypted envelopes под каждое устройство · WebSocket/STOMP · Spring Boot + React</sub>
</p>

---

## Что это

**Chaos Messenger** — full-stack MVP E2EE-мессенджера на Spring Boot и React.

Идея простая: браузер шифрует сообщения, backend маршрутизирует зашифрованные конверты, база хранит ciphertext. Сервер не должен знать plaintext сообщений.

Откройте DevTools, отправьте сообщение — сервер получает примерно такой envelope:

```json
{
  "targetDeviceId": "device-2aa3ae0e-ee08-4261-aa09-7d8f800b61e9",
  "ciphertext": "qzgHSg7zbwU6h8j8RqCPUYBWHJLi78eR9C0tj9I=",
  "nonce": "6KPcVjbpM4FUB0Vz",
  "ratchetPublicKey": "n9b7..."
}
```

Если спросить сервер, что написано в последнем сообщении, preview вернёт:

```json
{ "lastMessage": "[encrypted]" }
```

Не потому что сервер скрывает текст, а потому что у него нет plaintext.

**Текущий статус:** сильный solo MVP / portfolio project. Это ещё не production-ready аналог Signal.

---

## Стек

| Зона | Стек |
|---|---|
| Backend | Java 17 · Spring Boot 3 · Spring Security · WebSocket/STOMP |
| Frontend | React 18 · Vite · WebCrypto API |
| База | PostgreSQL 16 · Flyway migrations V1–V34 |
| Cache / realtime state | Redis 7 |
| Observability | Spring Actuator · Prometheus · Grafana |
| Tests | JUnit · Mockito · Testcontainers · Vitest · Playwright |
| Tooling | Docker Compose · GitHub Actions · OpenAPI/Swagger |

---

## Архитектура

> Клиент шифрует и расшифровывает. Backend аутентифицирует, хранит encrypted envelopes и доставляет их на устройства.

<p align="center">
  <img src="docs/assets/screenshots/architecture-ru.png" alt="Архитектура: Браузер · Spring Boot Backend · Данные и мониторинг" width="100%"/>
</p>

| Слой | Ответственность |
|---|---|
| Браузер | Генерация device keys · E2EE-сессии · encryption/decryption |
| Backend | Auth · чаты/устройства · хранение envelopes · WebSocket routing |
| PostgreSQL | users · devices · chats · messages · envelopes · receipts · attachments |
| Redis | refresh tokens · presence · unread counters · rate limits |
| WebSocket/STOMP | device topics · chat updates · typing · message statuses |

---

## Как работает E2EE

### 1. X3DH-like session setup

<p align="center">
  <img src="docs/assets/screenshots/e2ee-flow-ru.png" alt="E2EE flow: устройство Alice · Сервер · устройство Bob" width="100%"/>
</p>

Каждое устройство публикует public key bundle: identity key, signed prekey и one-time prekeys. Отправитель получает bundle устройства получателя и локально выводит shared secret. Private keys остаются в браузере.

Backend хранит public prekey material и резервирует one-time prekeys. Он не выводит session secret.

### 2. Double Ratchet MVP

<p align="center">
  <img src="docs/assets/screenshots/ratchet-ru.png" alt="Double Ratchet: root key, chain keys and per-message keys" width="100%"/>
</p>

Во frontend crypto engine уже есть основное состояние Double Ratchet:

```text
root key
sending / receiving chain keys
DH sending / receiving ratchet keys
message indexes
skipped message keys
previous chain length
ratchet public key per envelope
```

Для каждого сообщения клиент выводит отдельный message key, шифрует через AES-GCM и после этого ключ больше не переиспользуется.

Backend хранит только envelope-метаданные, которые нужны целевому устройству для расшифровки:

```text
ciphertext
nonce
sender device id
target device id
message index
ratchet public key
previous chain length
```

### 3. Per-device encrypted envelopes

Сообщение не хранится как один ciphertext на пользователя. Оно раскладывается на отдельные encrypted envelopes под конкретные устройства.

Пример:

```text
У Bob есть phone + laptop.
Alice отправляет одно сообщение.
Backend хранит один envelope для bob-phone и один envelope для bob-laptop.
Каждое устройство получает свой ciphertext через свой WebSocket topic.
```

Это базовая multi-device E2EE-доставка.

### Security scope

Это MVP-реализация, а не аудированный production cryptographic protocol.

Что ещё нужно усиливать:

- больше Double Ratchet test vectors;
- out-of-order и skipped-key edge cases;
- device verification / safety numbers;
- warnings при смене identity key;
- обработка prekey exhaustion;
- WebSocket reconnect и восстановление missed events.

---

## Возможности

| Зона | Возможности |
|---|---|
| E2EE | X3DH-like setup · Double Ratchet MVP · AES-GCM · WebCrypto |
| Multi-device | отдельная device identity · envelope под каждое устройство · управление устройствами · revoke |
| Auth | phone OTP · email/password · JWT access/refresh · Redis rate limits |
| Chats | direct chats · saved messages · group chats · chat requests |
| Messaging | send · edit · soft delete · reply · reactions · read/delivered receipts · typing |
| Attachments | encrypted image/file/voice payloads · локальное encrypted blob storage |
| Self-destruct | исчезающие сообщения с scheduled cleanup на backend |
| Realtime | SockJS/WebSocket/STOMP · device topics · chat updates · status updates |
| Push | хранение push subscriptions и VAPID config placeholder; полноценная Web Push delivery ещё planned |
| Observability | Actuator · Prometheus · Grafana dashboard |

Групповые роли и moderation logic есть, но README намеренно не делает на этом главный акцент. Основной фокус проекта — E2EE messaging, device delivery, realtime transport и backend hardening.

---

## Backend hardening после ревью

После внешнего ревью проект прошёл отдельный backend cleanup.

Что было улучшено:

- profile/chat update notifications ушли от N+1 repository loops;
- read/delivered status handling переведён на bulk SQL operations;
- reactions для timeline грузятся пачкой;
- chat list получил pagination и database-side ordering;
- ключевые REST-ответы используют typed DTO вместо `Map<String, Object>`;
- hot-path индексы вынесены в `V23__performance_indexes.sql`;
- device/prekey lookups батчатся там, где это безопасно;
- frontend умеет принимать bulk status updates.

Это не делает проект production-ready, но backend уже ближе к нормальному MVP, чем к простой демке.

---

## Local load-testing snapshot

Это локальные benchmark-результаты с dev-машины. Они полезны для понимания динамики и regression tracking, но это не production capacity claim.

### Direct-chat HTTP/API battery

| Сценарий | Requests | Iterations | Failed | send p95 | timeline p95 | read p95 | delivered p95 |
|---|---:|---:|---:|---:|---:|---:|---:|
| baseline, 5 VU / 2m / sleep=1 | 2,995 | 495 | 0 | 93 ms | 43 ms | 50 ms | 49 ms |
| normal, 25 VU / 5m / sleep=1 | 35,549 | 5,904 | 0 | 151 ms | 89 ms | 106 ms | 99 ms |
| heavy, 2 VU / 10m / sleep=0 | 49,546 | 8,256 | 0 | 54 ms | 28 ms | 45 ms | 35 ms |
| stress, 10 VU / 10m / sleep=0 | 161,018 | 26,828 | 0 | 81 ms | 42 ms | 55 ms | 48 ms |
| spike, 50 VU / 5m / sleep=0 | 76,816 | 12,761 | 0 | 428 ms | 375 ms | 394 ms | 379 ms |
| soak, 5 VU / 30m / sleep=0 | 250,795 | 41,795 | 0 | 81 ms | 44 ms | 60 ms | 52 ms |

Суммарно:

```text
576,719 HTTP requests
96,039 iterations
0 failed requests
100% checks
```

### WebSocket/SockJS/STOMP hold tests

Prepared WebSocket hold tests отделяют регистрацию пользователей/устройств от нагрузки на сам WS-слой.

Локально проверено:

```text
100 prepared WS connections: clean
500 prepared ramp connections: clean
1000 prepared ramp connections: clean
0 ws_errors in validated hold scenarios
```

Ramp к 10k WebSocket connections на локальной машине с 8 GB RAM упирается в JVM heap / Spring SimpleBroker memory limits. Это полезная находка, но не production capacity result. Для больших real-time нагрузок нужен отдельный broker/gateway strategy.

---

## Быстрый запуск

```bash
git clone https://github.com/vaazhen/chaos-e2ee-messenger.git
cd chaos-e2ee-messenger
```

Одной командой:

```bash
./START.sh        # macOS / Linux
START.bat         # Windows
```

Вручную:

```bash
# 1. Инфраструктура
cd backend
docker compose -f docker-compose.dev.yml up -d

# 2. Backend
./mvnw spring-boot:run

# 3. Frontend, в новом терминале
cd frontend
npm install
npm run dev
```

Открыть: [http://localhost:5173](http://localhost:5173)

В dev-режиме SMS-коды печатаются в backend logs. Реальный SMS provider не нужен.

Требования:

```text
Java 17+
Node.js 18+
Docker + Docker Compose
```

---

## Локальные адреса

| Сервис | URL |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/api-docs |
| Health | http://localhost:8080/actuator/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 · `admin / admin` |

---

## API overview

Каждый защищённый запрос требует:

```text
Authorization: Bearer <jwt>
X-Device-Id: <deviceId>
```

| Группа | Назначение |
|---|---|
| Auth | phone OTP, email auth, token refresh, logout |
| Devices | регистрация устройства, текущее устройство, список, deactivation |
| Crypto | prekey bundle, chat device resolution, prekey reservation |
| Chats | direct chat, saved messages, group chat, chat list, chat requests |
| Messages | encrypted send/edit/delete, timeline, read/delivered, reactions |
| Attachments | encrypted upload/download |
| Push | subscription management, VAPID public key |
| Users/Profile | current user, update profile, search, username availability |
| i18n | locale and translations |

### WebSocket topics

| Topic | Назначение |
|---|---|
| `/topic/devices/{deviceId}/chats/{chatId}` | device-specific message events |
| `/topic/devices/{deviceId}/status` | bulk/single message status updates |
| `/topic/users/{username}/chats` | chat list/profile updates |
| `/topic/chats/{chatId}/typing` | typing events |

---

## Тесты

Backend:

```bash
cd backend
./mvnw test
```

Frontend:

```bash
cd frontend
npm install
npm test -- --run
npm run build
```

E2E:

```bash
cd frontend
npm run test:e2e
```

---

## Статус и roadmap

Chaos Messenger — это MVP. Основной уже усиленный участок — direct-chat E2EE delivery и backend hardening.

Следующие инженерные зоны:

1. **WebSocket delivery benchmark** — измерить реальную delivery latency по `MESSAGE` frame.
2. **Preloaded 10k-message chat benchmark** — проверить timeline/read/delivered на большой готовой истории.
3. **Group fanout benchmark** — проверить envelopes и WebSocket fanout на 10/50/100 участников.
4. **Double Ratchet hardening** — test vectors, out-of-order tests, key-change warnings.
5. **Production realtime strategy** — broker relay / gateway / backpressure вместо одной MVP SimpleBroker-модели.
6. **Observability** — больше domain metrics по messages и WebSocket sessions.

См. [Issues](https://github.com/vaazhen/chaos-e2ee-messenger/issues).

---

## Ограничения

- Проект пока не является production-ready secure messenger.
- Double Ratchet реализован как MVP и требует большего количества edge-case тестов.
- WebSocket delivery latency ещё не полностью benchmarked.
- Group chat fanout требует отдельного нагрузочного тестирования.
- Spring SimpleBroker подходит для MVP, но не является финальной архитектурой для большого production realtime traffic.
- Attachments шифруются, но storage/access-control hardening ещё нужно усилить.
- Push subscriptions есть; полноценная Web Push delivery ещё planned.
- Локальные load-test результаты не являются production capacity guarantees.

---

## Статьи

Технические разборы:

- [Building an End-to-End Encrypted Messenger with Spring Boot and WebCrypto](https://dev.to/vaazhen/i-built-an-end-to-end-encrypted-messenger-with-spring-boot-and-webcrypto-1if5)
- [Статья и обсуждение на Habr](https://habr.com/ru/articles/1030854/)

---

## Contributing

Проект открыт для backend, frontend, crypto, docs, tests и performance contributions.

Хорошие точки входа:

- документация и setup;
- frontend empty/loading/error states;
- WebSocket connection state UI;
- дополнительные backend tests;
- документация по k6/load tests.

Сложные направления:

- WebSocket delivery latency benchmark;
- group chat fanout;
- Double Ratchet edge cases;
- device verification;
- production observability.

Начать можно с [Issues](https://github.com/vaazhen/chaos-e2ee-messenger/issues).

---

## Лицензия

Apache License 2.0. См. [LICENSE](LICENSE).
