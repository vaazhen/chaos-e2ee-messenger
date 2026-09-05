import { describe, expect, it } from "vitest";
import {
  applyIncomingToChat,
  collectNewRemoteMessages,
  confirmOptimistic,
  filterVisibleMessages,
  mergeDecryptedIntoChat,
  rollbackOptimistic,
} from "../messageTimeline";

describe("filterVisibleMessages", () => {
  it("drops hidden ids and server-deleted rows", () => {
    const hidden = new Set(["2", "4"]);
    const messages = [
      { id: 1, _text: "visible" },
      { id: 2, _text: "hidden" },
      { id: 3, deleted: true, _text: "deleted flag" },
      { id: 4, deletedAt: "2026-01-01T00:00:00.000Z", _text: "hidden and deleted" },
      { id: 5, _text: "ok" },
    ];

    expect(filterVisibleMessages(messages, hidden)).toEqual([
      { id: 1, _text: "visible" },
      { id: 5, _text: "ok" },
    ]);
  });
});

describe("collectNewRemoteMessages", () => {
  it("skips cached plaintext and keeps new remote ids", () => {
    const cached = [
      { id: 1, content: "hello", _text: "hello" },
      { id: 2, content: "[encrypted]", _text: "[encrypted]" },
    ];
    const remote = [
      { id: 1, content: "hello", _text: "hello" },
      { id: 2, content: "world", _text: "world" },
      { id: 3, content: "new", _text: "new" },
      { id: 4, deleted: true, _text: "gone" },
    ];
    const hidden = new Set(["5"]);

    expect(collectNewRemoteMessages(remote, cached, hidden)).toEqual([
      { id: 2, content: "world", _text: "world" },
      { id: 3, content: "new", _text: "new" },
    ]);
  });

  it("treats encrypted placeholders in cache as not yet resolved", () => {
    const cached = [{ id: 10, content: "[encrypted]", _text: "[encrypted]" }];
    const remote = [{ id: 10, content: "decrypted", _text: "decrypted" }];

    expect(collectNewRemoteMessages(remote, cached, new Set())).toEqual([
      { id: 10, content: "decrypted", _text: "decrypted" },
    ]);
  });
});

describe("mergeDecryptedIntoChat", () => {
  it("does not overwrite local plaintext with an encrypted placeholder", () => {
    const existing = [{ id: 1, content: "hi", _text: "hi" }];
    const decrypted = [{ id: 1, content: "[encrypted]", _text: "[encrypted]", status: "DELIVERED" }];

    expect(mergeDecryptedIntoChat(existing, decrypted)).toEqual([
      { id: 1, content: "hi", _text: "hi", status: "DELIVERED" },
    ]);
  });

  it("appends messages that are not already in the chat", () => {
    const existing = [{ id: 1, _text: "first" }];
    const decrypted = [{ id: 2, _text: "second" }];

    expect(mergeDecryptedIntoChat(existing, decrypted)).toEqual([
      { id: 1, _text: "first" },
      { id: 2, _text: "second" },
    ]);
  });
});

describe("applyIncomingToChat", () => {
  it("replaces optimistic temp row with the real incoming message", () => {
    const existing = [
      {
        id: "tmp_100",
        _clientMessageId: "tmp_100",
        _temp: true,
        _out: true,
        _text: "sending",
      },
      { id: 99, _text: "other" },
    ];
    const incoming = {
      id: 42,
      _out: true,
      _text: "sent",
      status: "SENT",
    };

    expect(
      applyIncomingToChat(existing, incoming, { isOut: true, clientMessageId: "tmp_100" }),
    ).toEqual([
      { id: 99, _text: "other" },
      { id: 42, _out: true, _text: "sent", status: "SENT" },
    ]);
  });

  it("merges into an existing row with the same id", () => {
    const existing = [{ id: 7, content: "old", _text: "old" }];
    const incoming = { id: 7, content: "new", _text: "new" };

    expect(applyIncomingToChat(existing, incoming, { isOut: false })).toEqual([
      { id: 7, content: "new", _text: "new" },
    ]);
  });
});

describe("confirmOptimistic", () => {
  it("promotes the temp row with server id and clears _temp", () => {
    const messages = [
      { id: "tmp_1", _temp: true, _text: "draft", status: "SENT" },
      { id: 99, _text: "other" },
    ];

    expect(
      confirmOptimistic(messages, "tmp_1", {
        id: 100,
        status: "DELIVERED",
        reactions: { "👍": 1 },
        myReactions: ["👍"],
      }),
    ).toEqual([
      {
        id: 100,
        _temp: false,
        _text: "draft",
        status: "DELIVERED",
        reactions: { "👍": 1 },
        myReactions: ["👍"],
      },
      { id: 99, _text: "other" },
    ]);
  });
});

describe("rollbackOptimistic", () => {
  it("removes the temp row by client message id", () => {
    const messages = [
      { id: "tmp_9", _temp: true, _text: "failed send" },
      { id: 1, _text: "kept" },
    ];

    expect(rollbackOptimistic(messages, "tmp_9")).toEqual([{ id: 1, _text: "kept" }]);
  });
});
