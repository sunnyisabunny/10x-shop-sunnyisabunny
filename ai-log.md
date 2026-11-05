# AI usage log: 10X Shop

How AI was used on this project. Tool: **Claude Code (Opus 5.5)**, in the VS Code extension.

Prompts are quoted word for word, as they were written. The PRD allows AI at any stage. It also says
three things remain my responsibility: the product must work, I must be able to explain it, and the
process must be mine.

---

## Entry 1: reading the brief and asking questions

**Goal:** understand both documents before building anything.

**Prompt (verbatim):**
> "E:\zagruzki blia\10X-Shop-Graduation-Project-PRD.docx" "E:\zagruzki blia\დანართი A.docx" analyze these documents fully, this is a graduation project, first off all study all the requirements, tell them to me in a short understandable manner, before building anything, ask questions related to this project, more questions the better, we also need do decide on decide on design and branding for it, maybe some fun features.

**Result:** used. It listed the requirements and found contradictions in the documents, such as the password rule and leftover checkout rows. It also found technical traps, such as the newest TypeScript being outside the range the required linter supports.

**Correction:** the AI first told me Checkout stays at four fields. On a second reading it found that FULL adds Phone, Postal code and Country, and it corrected itself. I chose to add them.

---

## Entry 2: design and brand decisions

The AI proposed four concepts and made recommendations. These decisions were mine.

| Decision | AI recommended | I chose |
|---|---|---|
| Concept | Night Vending | Night Vending |
| Setting | Tbilisi at night | **Tokyo at night** |
| Background | Quiet glow, for performance | **Light rain** |
| Scope | CORE + all FULL | **FULL + BONUS, plus all eight extras** |

---

## Entry 3: how the code gets explained

**Prompt (verbatim), when asked how comfortable I am with React and TypeScript:**
> basically what we can do is every code that's written get's a written note explaining it, put the notes right in the codebase, keep explanations simple yet in depth

**Result:** every file has a header note, and every component, function, hook, effect and piece of state has a note above it, saying what it does, why it's done that way and what breaks without it.

---

## Entry 4: working through the night

**Prompt (verbatim):**
> i'll be up all night, so just keep working, and guide me step by step on every thing i need to do by hand

**Result:** the AI kept building and told me each step it couldn't do for me, with the exact clicks.

---

## Entry 5: what I decided after seeing the design

**Prompt (verbatim):**
> gh auth is done, design looks very good, continue, what else has to be done by hand by me?

**Result:** the pink buttons and the side panel stayed, as designed.

---

## Entry 6: the demo video and the deployment

**Prompt (verbatim):**
> the video we can definitely do with the brag skills, give me a step by step guide on deploying to vercel, and other things i need to do by hand. continue

**Result:** a step-by-step Vercel guide. The AI pointed out that the PRD asks for a screen recording, so the video starts from a real recording of the live site, with polish added around it.

---

## Entry 7: code review, and what was rejected

The AI ran a code review on its own work twice during the FULL stage. Each finding started as a claim from reading the code, so it first had to fail in a browser test before anything changed.

| Review finding | Outcome |
|---|---|
| A failed order saves twice on retry | Real. Reproduced and fixed (`DEBUG-LOG.md` entry 8) |
| A username of `constructor` breaks Profile | Real. Reproduced and fixed (entry 9) |
| Reviews in two tabs overwrite each other | Real. Reproduced and fixed (entry 10) |
| Two tabs can overwrite each other's orders | **Not reachable.** Placing an order empties the shared cart, so the other tab's Checkout redirects first. The test the AI wrote for this failed for that reason. The real risk was in reviews |
| Orders should belong to a username | **Rejected.** The annex's Order model has no owner field. Disclosed in `REPORT.md` |
| Migrate the old cart format | **Rejected.** The site had never been deployed, so no old carts exist |

**Corrections to the AI's own work:** its first fix for the footer's layout shift did nothing, because the rule was in the wrong CSS layer. Lighthouse showed the score hadn't moved, so it had to find out why (entry 14). A tool it wrote to split commits also corrupted line endings on Windows, which put the wrong contents in two unpushed commits. It redid them.
