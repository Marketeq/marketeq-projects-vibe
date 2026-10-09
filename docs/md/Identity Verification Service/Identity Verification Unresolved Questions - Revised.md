__IDENTITY VERIFICATION__

__Unresolved Questions — Revised__

Prepared: 18 September 2026

Supersedes: IDENTITY\_VERIFICATION\_UNRESOLVED\_QUESTIONS\_FOR\_CHRISTOPHER\.docx \(17 September 2026\) — that file is not overwritten and remains available for reference\.

Source: Identity\_Verification\_Answers\.docx \(Christopher's answers to the 11\-question register\) and Technical\_Requirements\_Verification\_Gates2\.docx, cross\-checked against the current backend documentation set as updated 18 September 2026\.

*Christopher's answers resolve all 11 questions in the prior register at the level of stated product/behavioral decision, and the backend documentation has been updated accordingly \(see the accompanying package\)\. What remains below is narrower and different in kind: implementation details the answers don't reach, a vendor fact still pending confirmation, a design\-side reconciliation the new documents never touched, and one item that exists only as a spoken answer\. Nothing below is invented — each item states exactly what is missing and why it could not be closed out from the material available\.*

__SECURITY / ENGINEERING__

__VENDOR \(DIDIT\)__

__DESIGN__

__DOCUMENTATION GAP__

# __Remaining Items__

*Six items\. Everything else from the prior 11\-question register is now answered in writing and has been removed from this tracking list\. \[Updated 21 September 2026: item 6 added below — a location\-status/EXPIRED conflict newly surfaced by the five\-question technical resolution, Q1\.\]*

__1\. Document\-number hash algorithm \(carried forward, unchanged\)\.__

Christopher's answers don't name one, and TRVG2 doesn't either\. Doc 03 and Doc 05 still describe a placeholder plaintext transform explicitly marked “not production\-safe\.” This was never Christopher's decision to make — it needs a concrete algorithm choice from Security/Engineering before the field can be implemented as designed\. \[Updated 21 September 2026: Security/Engineering has now proposed a concrete algorithm — HMAC\-SHA\-256, keyed with a KMS\-held pepper, computed over the normalized document number only — as part of a five\-question technical resolution\. This is an engineering decision made under Christopher's SOP guidance, and Doc 03/Doc 05's code is unchanged pending implementation\.\]

*Status: carried forward from the prior register, unchanged by the new material\. \[Updated 21 September 2026: a proposed engineering answer now exists \(HMAC\-SHA\-256, KMS\-held pepper\); this item remains open until Security/Engineering confirms it and implementation lands\.\]*

__  SECURITY / ENGINEERING  __

__2\. Who builds the VPN/proxy detector \(partially new\)\.__

Answer 2 fully specifies the behavior — three distinct alerts \(VPN, proxy, both\), no attempt consumed, unlimited immediate retry — but not who owns building the detection mechanism itself\. Behavior is settled; ownership of the build is not\. \[Updated 21 September 2026: a proposed engineering answer now exists — identity\-verification\-service's own backend team, built inline, with a MaxMind GeoIP2 Anonymous IP\-style feed recommended — as part of a five\-question technical resolution\. This is an engineering decision made under Christopher's SOP guidance; the vendor, its cost, and the fallback policy when the signal is unavailable all remain genuinely open\.\]

*Status: behavior resolved by Answer 2 and reflected in the updated documentation; only the build assignment is open\. \[Updated 21 September 2026: a proposed owner and approach now exist for the build assignment, made under Christopher's SOP guidance; vendor/cost/fallback remain unresolved\.\]*

__  SECURITY / ENGINEERING  __

__3\. TLS / certificate\-termination fact \(carried forward from Correction 4, narrowed\)\.__

Answer 8 settles the rule — the vendor owns TLS termination and certificate management if they host the capture flow, otherwise we build it — but not the underlying fact of whether Didit hosts the capture flow\. This is now a vendor confirmation, not a Christopher decision, and Answer 8 itself says it should be confirmed before the first environment is stood up\. \[Updated 21 September 2026: Didit\-hosted capture is now the proposed architecture \(five\-question technical resolution, Q5\) — an engineering/architecture position made under Christopher's SOP guidance, not yet a Didit\-confirmed fact\. If adopted, this would make Didit the proposed owner of TLS termination and certificate management under Answer 8’s rule, but that ownership is not confirmed: whether Didit actually hosts the capture flow still requires Didit’s direct confirmation\.\]

*Status: rule resolved by Answer 8; Didit\-hosted capture is now the proposed architecture \(Q5\), but the factual determination — and therefore TLS/certificate ownership — remains pending direct confirmation from Didit\.*

__  VENDOR \(DIDIT\)  __

__4\. Persona\-branded hand\-off screen reconciliation \(newly surfaced, not addressed by either new document\)\.__

Doc 00 and Doc 01 both flag that the existing frontend design still shows a distinct Persona\-branded “ID not verified” hand\-off screen, unreconciled to Didit's single\-session model\. Neither the Answers document nor TRVG2 touches this\. It is a Figma/flow reconciliation, not a backend question, and Persona itself remains out of scope for the current build — this item is about a leftover screen reference, not a reopening of the vendor decision\.

*Status: not addressed by either new document; still open\.*

__  DESIGN  __

__5\. Document\-capture\-then\-face\-scan ordering \(carried forward — still only verbal\)\.__

This was flagged in the prior open\-questions re\-audit as Christopher's one answer that was genuinely verbal\-only, never written into any approved document\. Neither new document confirms it in writing\. Per standing instruction this is not being re\-asked — it is flagged here as the one item in this register that exists only as a spoken answer, so it is not lost\.

*Status: verbal answer stands; no document has been updated to state it in writing\.*

__  DOCUMENTATION GAP  __

__6\. Location\-status EXPIRED reachability vs\. the Location Build Specification \(newly surfaced, Q1\)\.__

TRVG2 §1\.1 defines location\_status using the same nine\-value status enumeration as identity\_status\. Doc 03’s 21 September 2026 update proposes seven of those nine values — excluding BLOCKED\_AGE and EXPIRED — as reachable for location\_status, explicitly leaving EXPIRED itself unresolved\. The Location Verification Build Specification states directly that a verified home country never expires, with no document\-validity requirement and no re\-verification timer\. Whether location\_status should ever reach EXPIRED at all, and if so under what conditions, is a genuine conflict between these two sources that no document in this set resolves\. The old\-value\-to\-new\-value migration mapping for location\_status \(Doc 03 Section 10\) is a related, separate open item\.

*Status: newly surfaced 21 September 2026 by the five\-question technical resolution \(Q1\); a proposed engineering position exists for seven of the nine values, but EXPIRED’s applicability to location\_status is an unresolved conflict, not a Christopher\-approved decision in either direction\.*

__  DESIGN  __

# __Note on Scope__

Didit integration mechanics and Persona are confirmed\-but\-deferred and out\-of\-scope items respectively for the current build, per Christopher's direction\. Item 3 above concerns a factual prerequisite for Didit integration work, not a reopening of that scope decision; item 4 concerns a stale UI reference to the retired Persona flow, not a reintroduction of Persona into scope\.

