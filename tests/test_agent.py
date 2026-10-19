import hashlib
import hmac
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent  # noqa: E402

RULES = agent.Rules(
    owners=frozenset({"me@acme.io"}),
    internal=frozenset({"acme.io", "acme-data.com"}),
    partners={"partner.org": "me@partner-desk.io"},
    default_sender="me@acme-data.com",
)


def meeting(*emails):
    return {"participants": [{"email_address": e} for e in emails]}


def people(*emails):
    return agent.participants(meeting(*emails), RULES)


class Routing(unittest.TestCase):
    def test_prospect_call(self):
        sender, to, cc = agent.route(people("me@acme.io", "bob@client.com", "ann@acme.io"), RULES)
        self.assertEqual(sender, "me@acme-data.com")
        self.assertEqual(to, ["bob@client.com"])
        self.assertEqual(cc, ["ann@acme.io"])

    def test_partner_only_call(self):
        sender, to, cc = agent.route(people("me@acme.io", "eve@partner.org"), RULES)
        self.assertEqual(sender, "me@partner-desk.io")
        self.assertEqual((to, cc), (["eve@partner.org"], []))

    def test_partner_with_prospect(self):
        sender, to, cc = agent.route(people("me@acme.io", "eve@partner.org", "bob@client.com"), RULES)
        self.assertEqual(sender, "me@partner-desk.io")
        self.assertEqual((to, cc), (["bob@client.com"], ["eve@partner.org"]))

    def test_should_process(self):
        self.assertTrue(agent.should_process(meeting("me@acme.io", "bob@client.com"), RULES)[0])
        self.assertFalse(agent.should_process(meeting("me@acme.io", "ann@acme.io"), RULES)[0])
        self.assertFalse(agent.should_process(meeting("ann@acme.io", "bob@client.com"), RULES)[0])


CTX = {
    "meeting": {"id": "m1", "title": "Acme <> Client", "date": "2026-10-12"},
    "participants": people("me@acme.io", "bob@client.com", "ann@acme.io"),
    "sender": "me@acme-data.com",
    "company": {"id": "c1", "name": "Client", "fields": {"crm": "HubSpot"}},
    "deals": [{"id": "d1", "name": "Client pilot", "stage": "Demo done", "fields": {"stage": "Demo done", "value": 5000}}],
    "people_ids": {},
    "fields": {
        "deal": {"stage": {"title": "Deal stage", "type": "status", "options": ["Demo done", "Pricing discussion"]},
                 "value": {"title": "Deal value", "type": "currency"}},
        "company": {"crm": {"title": "CRM", "type": "select", "options": ["HubSpot", "Salesforce"]}},
    },
}


def draft(**over):
    base = {"language": "en", "summary": "s", "deal_action": "update", "deal_id": "d1", "new_deal_name": "",
            "changes": [], "tasks": [], "note": "n", "email_to": ["bob@client.com"], "email_cc": ["ann@acme.io"],
            "email_subject": "Notes", "email_body": "Hi Bob — notes.", "questions": []}
    return {**base, **over}


class Plan(unittest.TestCase):
    def test_valid_changes_and_noop(self):
        plan = agent.make_plan(draft(changes=[
            {"object": "deal", "attribute": "stage", "value": "pricing discussion", "evidence": "q"},
            {"object": "deal", "attribute": "value", "value": "$12,000", "evidence": "q"},
            {"object": "company", "attribute": "crm", "value": "hubspot", "evidence": "q"},
        ]), CTX, [])
        self.assertEqual([(c["attribute"], c["old"], c["new"]) for c in plan["changes"]],
                         [("stage", "Demo done", "Pricing discussion"), ("value", 5000, 12000)])

    def test_bad_changes_dropped(self):
        plan = agent.make_plan(draft(changes=[
            {"object": "deal", "attribute": "stage", "value": "Won big", "evidence": ""},
            {"object": "deal", "attribute": "owner", "value": "x", "evidence": ""},
        ]), CTX, [])
        self.assertEqual(plan["changes"], [])
        self.assertEqual(len(plan["warnings"]), 2)

    def test_unknown_deal_id(self):
        plan = agent.make_plan(draft(deal_id="nope", changes=[
            {"object": "deal", "attribute": "value", "value": "1", "evidence": ""}]), CTX, [])
        self.assertEqual(plan["deal_action"], "none")
        self.assertEqual(plan["changes"], [])

    def test_recipients_limited_to_meeting_and_feedback(self):
        plan = agent.make_plan(draft(email_to=["bob@client.com", "evil@x.com"], email_cc=["new@client.com"]),
                               CTX, ["also cc new@client.com"])
        self.assertEqual(plan["email"]["to"], ["bob@client.com"])
        self.assertEqual(plan["email"]["cc"], ["new@client.com"])
        self.assertIn("evil@x.com", plan["warnings"][0])

    def test_no_recipient_and_em_dash(self):
        plan = agent.make_plan(draft(email_to=[]), CTX, [])
        self.assertIn("No recipient. Send is off.", plan["warnings"])
        self.assertEqual(plan["email"]["body"], "Hi Bob - notes.")

    def test_create_needs_stage(self):
        plan = agent.make_plan(draft(deal_action="create", deal_id="", new_deal_name="Client - data"), CTX, [])
        self.assertEqual(plan["deal_action"], "create")
        self.assertTrue(any("no stage" in w for w in plan["warnings"]))


class Coerce(unittest.TestCase):
    def test_types(self):
        self.assertEqual(agent.coerce({"type": "number"}, "1,500"), 1500)
        self.assertEqual(agent.coerce({"type": "checkbox"}, "Yes"), True)
        self.assertEqual(agent.coerce({"type": "date"}, "2026-10-20"), "2026-10-20")
        for spec, value in (({"type": "date"}, "next week"), ({"type": "number"}, "12k"), ({"type": "number"}, "inf")):
            with self.assertRaises(ValueError):
                agent.coerce(spec, value)


class Text(unittest.TestCase):
    def test_transcript_merge(self):
        segs = [{"speech": "Hi.", "start_time": "58.4", "speaker": {"name": "Me"}},
                {"speech": "there", "start_time": "59", "speaker": {"name": "Me"}},
                {"speech": "Hello", "start_time": "61", "speaker": {"name": "Bob"}}]
        self.assertEqual(agent.format_transcript(segs), "[00:58] Me: Hi. there\n[01:01] Bob: Hello")

    def test_pack_respects_limit(self):
        blocks = ["a" * 50, "\n".join(["word " * 30] * 40), "b" * 10]
        msgs = agent.pack(blocks, limit=300)
        self.assertTrue(all(len(m) <= 300 for m in msgs))
        self.assertEqual("".join(msgs).count("a"), 50)

    def test_card_renders(self):
        plan = agent.make_plan(draft(tasks=[{"content": "Me: send <prices>", "due_date": "2026-10-20"}]), CTX, [])
        crm, mail = agent.render_card(CTX, plan, 2)
        self.assertIn("v2", crm[0])
        self.assertIn("&lt;prices&gt;", "\n".join(crm))
        self.assertIn("To: bob@client.com", mail[0])


class Security(unittest.TestCase):
    def test_attio_signature(self):
        body = b'{"events": []}'
        sig = hmac.new(b"secret", body, hashlib.sha256).hexdigest()
        self.assertTrue(agent.verify_attio(body, sig, b"secret"))
        self.assertFalse(agent.verify_attio(body, sig, b"other"))
        self.assertFalse(agent.verify_attio(body, "", b"secret"))

    def test_redact(self):
        self.assertEqual(agent.redact("https://api.telegram.org/bot123:ABC/sendMessage?x=1"),
                         "https://api.telegram.org/bot***/sendMessage")


class TwoDecisions(unittest.TestCase):
    """The CRM part and the email part are approved or skipped separately."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = agent.Store(Path(self.tmp.name) / "t.db")
        self.sent = []
        self.saved = {name: getattr(agent, name) for name in ("tg_send", "clear_buttons", "apply_crm", "send_email")}
        agent.tg_send = lambda text, markup=None: self.sent.append((text, markup)) or len(self.sent)
        agent.clear_buttons = lambda message_id: None
        plan = agent.make_plan(draft(), CTX, [])
        self.store.insert("r1", "m1", "drafted", version=1, context=CTX, plan=plan, rounds=[{"draft": draft()}])

    def tearDown(self):
        for name, fn in self.saved.items():
            setattr(agent, name, fn)
        self.tmp.cleanup()

    def press(self, data):
        agent.handle_button(self.store, RULES, {"data": data, "message": {"message_id": 1}})

    def fake_step(self, key, value):
        def step(store, *args):
            rid = args[-1]
            result = store.get(rid)["result"] or {}
            result[key] = value
            store.update(rid, result=result)
            return result
        return step

    def test_buttons_per_part(self):
        crm = agent.buttons("r1", 3, "crm")["inline_keyboard"][0]
        mail = agent.buttons("r1", 3, "email")["inline_keyboard"][0]
        self.assertEqual([b["callback_data"] for b in crm], ["ca:r1:3", "cx:r1:3"])
        self.assertEqual([b["callback_data"] for b in mail], ["es:r1:3", "ex:r1:3"])
        self.assertEqual(len(agent.buttons("r1", 3, "email", can_send=False)["inline_keyboard"][0]), 1)

    def test_card_status(self):
        self.assertEqual(agent.card_status({}), "drafted")
        self.assertEqual(agent.card_status({"crm": "applied"}), "drafted")
        self.assertEqual(agent.card_status({"crm": "applied", "email": "sending"}), "drafted")
        self.assertEqual(agent.card_status({"crm": "applied", "email": "msg1"}), "done")
        self.assertEqual(agent.card_status({"crm": "skipped", "email": "skipped"}), "skipped")

    def test_apply_crm_then_send(self):
        agent.apply_crm = self.fake_step("crm", "applied")
        agent.send_email = self.fake_step("email", "gmail-id")
        self.press("ca:r1:1")
        self.assertEqual(self.store.get("r1")["status"], "drafted")
        self.press("ca:r1:1")
        self.assertIn("already done", self.sent[-1][0])
        self.press("es:r1:1")
        self.assertEqual(self.store.get("r1")["status"], "done")
        self.assertIn("sent to bob@client.com", self.sent[-1][0])

    def test_skip_both(self):
        self.press("cx:r1:1")
        self.press("ex:r1:1")
        self.assertEqual(self.store.get("r1")["status"], "skipped")

    def test_old_and_unknown_buttons(self):
        self.press("ca:r1:0")
        self.press("s:r1:1")  # a button from before the split
        self.assertTrue(all("old" in text for text, _ in self.sent))
        self.assertEqual(self.store.get("r1")["status"], "drafted")

    def test_send_card_posts_only_open_parts(self):
        agent.send_card(self.store, "r1")
        markups = [m for _, m in self.sent if m]
        self.assertEqual([m["inline_keyboard"][0][0]["callback_data"][:2] for m in markups], ["ca", "es"])
        self.assertIn("Reply with text or voice", self.sent[-1][0])
        self.sent.clear()
        self.store.update("r1", result={"crm": "applied"})
        agent.send_card(self.store, "r1")
        self.assertTrue(all("CRM" not in text for text, _ in self.sent))
        self.assertEqual(self.sent[-1][1]["inline_keyboard"][0][0]["callback_data"], "es:r1:1")
        self.assertEqual(self.store.get("r1")["crm_message_id"], None)


class StoreTest(unittest.TestCase):
    def test_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            store = agent.Store(Path(d) / "t.db")
            store.insert("r1", "m1", "drafted", version=1, context={"a": 1}, rounds=[{"draft": {}}])
            store.add_messages("r1", [10, 11])
            store.update("r1", result={"tasks": ["t1"]})
            row = store.get("r1")
            self.assertEqual((row["context"], row["result"]["tasks"]), ({"a": 1}, ["t1"]))
            self.assertEqual(store.by_message(11), "r1")
            self.assertEqual([r["recording_id"] for r in store.open_calls()], ["r1"])


if __name__ == "__main__":
    unittest.main()
