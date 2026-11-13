import assert from "node:assert/strict";
import test from "node:test";

import {
  findMatchingContacts,
} from "./contact-search";

const service = {
  name: "Psychological Support",
  description: "Confidential support and counseling coordination through PCS.",
  contacts: [
    {
      label: "Unified Psychological Service (24/7)",
      value: "150",
      extraInfo: "WhatsApp: +7 708 10 608 10",
    },
    {
      label: "Telegram @pcs_nu",
      value: "https://t.me/pcs_nu",
    },
  ],
};

test("returns every contact when the service itself matches", () => {
  const [result] = findMatchingContacts([service], "psychological");

  assert.equal(result.contacts.length, 2);
});

test("returns only the contact matching a label, number, or extra information", () => {
  const [byLabel] = findMatchingContacts([service], "24/7");
  const [byNumber] = findMatchingContacts([service], "708 10 608");
  const [byHandle] = findMatchingContacts([service], "pcs_nu");

  assert.deepEqual(byLabel.contacts.map((contact) => contact.value), ["150"]);
  assert.deepEqual(byNumber.contacts.map((contact) => contact.value), ["150"]);
  assert.deepEqual(byHandle.contacts.map((contact) => contact.value), [
    "https://t.me/pcs_nu",
  ]);
});

test("supports terms split between a service and one contact", () => {
  const [result] = findMatchingContacts([service], "psychological 150");

  assert.deepEqual(result.contacts.map((contact) => contact.value), ["150"]);
  assert.deepEqual(findMatchingContacts([service], "psychological housing"), []);
});

test("returns every contact for an empty query", () => {
  const [result] = findMatchingContacts([service], "   ");

  assert.equal(result.contacts.length, service.contacts.length);
});
