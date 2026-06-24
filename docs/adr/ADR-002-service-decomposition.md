# ADR-002: Service Decomposition (God Class Refactoring)

## Status

Accepted (Phase 2)

## Context

`ChatService` (976 lines) and `MessageService` (852 lines) grew into god classes that violated the Single Responsibility Principle:
- Mixed business logic with data access concerns
- Controllers depended on repositories indirectly (violating layering)
- Impossible to test or reason about individual operations
- Every change risked breaking unrelated functionality

## Decision

Split each god class into multiple focused services behind a thin facade:

### ChatService → 6 services

| Service | Responsibility |
|---|---|
| `ChatService` (facade) | Routing: delegates to sub-services |
| `ChatAccessService` | Validation, access control, role/policy parsing, WebSocket notify |
| `ChatQueryService` | Read-only queries: list chats, find direct requests, get chat by ID |
| `DirectChatService` | Direct chat CRUD: create, accept, decline requests |
| `SavedMessagesService` | Saved Messages chat lifecycle |
| `GroupModerationService` | Group CRUD: invite, mute, ban, role/permissions/settings, archive |

### MessageService → 8 services

| Service | Responsibility |
|---|---|
| `MessageService` (facade) | Routing: delegates to sub-services |
| `MessageAccessService` | Validation: requireUser, requireCurrentDevice, requireParticipant, participantIds |
| `MessageSendService` | Send encrypted message, envelope validation, envelope persistence |
| `MessageEditService` | Edit message, delegates envelope logic to MessageSendService |
| `MessageDeleteService` | Soft delete with fanout |
| `MessageReceiptService` | Read/delivered receipts, bulk status updates |
| `MessageReactionService` | Toggle reactions, reaction summaries |
| `MessageTimelineService` | Chat timeline (paginated) |
| `MessageFanoutService` | WebSocket fanout, push notifications, unread counters, DTO mapping |

### ArchUnit enforcement

```java
layeredArchitecture()
    .consideringAllDependencies()
    .layer("Controller").definedBy("..api..")
    .layer("Service").definedBy("..service..")
    .layer("Repository").definedBy("..repository..")
    .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
    .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
    .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service");
```

## Consequences

### Positive
- Each service is focused, testable, and under 150 lines
- Controllers only depend on the facade service
- Sub-services can be composed and tested independently
- New features can be added without touching unrelated services

### Negative
- Increased number of classes (newcomer learning curve)
- Facade adds forwarding boilerplate
- Some shared logic (envelope validation in `MessageSendService`) requires careful cross-service injection

### Key insight
Shared envelope logic (`validateEnvelopeTargets`, `persistEnvelopes`) was kept public in `MessageSendService`. `MessageEditService` injects `MessageSendService` to reuse them — composition over duplication.
