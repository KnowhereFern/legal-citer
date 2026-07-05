# Product

## Register

product

## Users

**Primary:** Pro se filers — people representing themselves in court without a lawyer.

They are not paralegals. They are not法律 tech power users. They are an individual
staring down a filing deadline, often stressed, often on a phone or a borrowed laptop,
often doing this for the first time. They have a document (a motion, a brief, a response)
and a gut-level fear: *"did I cite real cases, and do they actually stand for what I said
they stand for?"*

Their context when using the product:

- High stakes, low patience. A wrong citation can embarrass them in front of a judge or
  weaken their position. Confusion reads as danger.
- They are not fluent in legal databases. The product must speak plain English and never
  make them feel stupid for asking.
- They are often mobile-first, sometimes on poor connections. The UI must be fast,
  legible at phone size, and forgiving of flaky networks.
- They have already been failed by the existing system (PACER, Westlaw paywalls, opaque
  court websites). They are skeptical of "legal tech."

**Secondary:** Solo practitioners and paralegals who use it as a fast cite-check before
filing. They expect precision, exportable PDF reports, and no fluff. They will not
tolerate a tool that wastes their time.

**Job to be done:** "Before I file this, I need to know — quickly, affordably, and in
language I understand — whether every citation in my document points to a real, still-good
case that actually supports what I'm claiming."

## Product Purpose

BaddieLegal ingests a legal document, extracts every citation, verifies each one against
real case law (CourtListener V4), and produces a clear report: which cites are real, which
are not, which have been overruled or undermined, and which have been miscited.

It exists because the alternatives are either paywalled, hostile to non-lawyers, or both.
It is **not a law firm** and **not legal advice** — it is a verification tool. The filer
stays responsible for the filing; BaddieLegal makes sure they don't file something
embarrassing or harmful.

Success looks like:

- A stressed pro se filer uploads a draft, gets a clear report in minutes, and files with
  more confidence than they started with.
- A solo practitioner ships a cleaner brief because BaddieLegal caught a dead citation
  that Westlaw would have caught — for $200/month more.

## Brand Personality

**Direct · Expert · Confident.**

- **Direct.** No filler. No hedging. No legalese to hide behind. The product tells you what
  your citations are, plainly, and moves on.
- **Expert.** It knows case law cold and it shows. The interface reflects competence, not
  cuteness. Trust comes from being right, not from being friendly.
- **Confident.** The visual identity is loud on purpose — hot pink and cyan on black,
  Y2K-baddie energy. It signals: *we are not afraid of you, and you should not be afraid
  of the courts.*

Emotional goal: take a user who feels outgunned by the legal system and make them feel
like they have a sharp, opinionated tool on their side. Not warm and cuddly — sharp.

## Anti-references

Explicitly **do not** look like:

- **LexisNexis / Westlaw / PACER.** Dense gray walls of text, premium-priced gates,
  interfaces that punish non-subscribers, search UX from 2003. The thing being replaced.
  BaddieLegal is the un-Lexis.
- **Stuffy law-firm marketing sites.** Stock-photo-of-gavels, navy-and-serif, "trusted
  counsel" energy. The opposite of baddie.
- **Generic muted-gray B2B SaaS.** The safe Linear-clone-with-all-the-color-removed look.
  We take Linear's craft, not its beige.
- **Patronizing "easy legal help!" products.** Big friendly pastel buttons that talk down
  to the user. Pro se filers are not children; they are adults under stress. Treat them
  like adults.

## Design Principles

1. **Show, don't tell.** A green check on a real citation is worth more than a paragraph
   explaining what "validated" means. Surface the actual case, the actual pin cite, the
   actual holding. Never paraphrase where you can quote.

2. **The loud identity is non-negotiable, but it never blocks the work.** Pink and cyan on
   black are the brand. They appear in chrome, CTAs, key moments. They do NOT appear as
   the only signal for "valid vs. invalid citation" — always pair color with shape, label,
   or icon so colorblind and stressed users can still read the report.

3. **Speed is trust.** A legal tool that feels slow feels incompetent. Every screen must
   load fast and react instantly. Skeletons over spinners; optimistic UI where safe; never
   leave the user wondering if the app froze.

4. **Plain English, always.** Replace "Case law validation complete (12/18 citations
   verified)" with "12 of 18 citations check out. 6 need your attention." If a pro se
   filer has to Google a word in the UI, the UI failed.

5. **Expert confidence over hand-holding.** Surfaces should feel like they were built by
   someone who knows case law, not by a startup that read a book about legal design. Empty
   states are useful, errors are specific, copy sounds like it was written by a person who
   has filed a brief — not by a marketing committee.

## Accessibility & Inclusion

**Target: WCAG 2.1 AA.** Non-negotiable for a tool serving stressed, non-expert users on
potentially poor hardware.

- **Color contrast.** The pink (#ff69b4) and cyan (#00ffff) on black are loud but they
  must still hit ≥4.5:1 for body text and ≥3:1 for large text and UI boundaries. Muted
  gray (#888888) on black for secondary text currently fails — needs to move toward
  #aaaaaa / #bbbbbb on dark surfaces.
- **Never color-only signals.** Citation validity (valid / overruled / miscited / not
  found) MUST be conveyed by icon + label + color, never color alone. The pink/cyan
  palette is also a deuteranopia/protanopia hazard when used as a status pair — design
  accordingly.
- **Reduced motion.** All neon glows, gradient animations, and transitions must respect
  `prefers-reduced-motion`. A stressed user does not need a light show.
- **Mobile legibility.** Pro se filers are phone-first. Body text ≥16px, tap targets ≥44px,
  no horizontal scroll on any report view.
- **Plain language.** Treat plain-English copy as an accessibility feature, not just a
  brand decision. Reading level matters for users under cognitive load.
- **Keyboard navigation.** Full keyboard reachability for upload, runs list, report review,
  and settings — pro se filers on screen readers or with motor differences must complete
  the core flow without a mouse.
