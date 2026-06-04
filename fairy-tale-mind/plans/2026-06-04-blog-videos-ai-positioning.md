# Blog → videos + AI-crafted positioning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. All user-facing copy MUST follow the `brand-voice` skill: American English, sentence case, NO em-dashes, rare exclamation points, no emoji in copy, calm and concrete.

**Goal:** Update the Journal and the remaining "by hand / real artist" copy so the site describes a personalized animated video, crafted with professional editing tools and AI for the highest quality, not a hand-illustrated hardcover book.

**Architecture:** Pure content/copy edits. Blog posts are markdown in `content/blog/` rendered statically via `lib/blog.ts`. No logic changes except one emoji in `CATEGORY_META`. Also updates the `brand-voice` skill, the product north-star, and the Mind.

**Spec:** `fairy-tale-mind/specs/2026-06-04-blog-videos-ai-positioning-design.md`

**Slugs/filenames are preserved** for all posts (titles change, slugs do not).

---

### Task 1: Rewrite the three book-craft posts

**Files:** Overwrite `content/blog/illustrated-by-hand.md`, `content/blog/how-a-book-comes-together.md`, `content/blog/the-quiet-pull-of-hardcover.md` (keep filenames). Keep each post's `date`, `category`, and `author` frontmatter; change only `title` and `excerpt` plus the body.

- [ ] **Step 1: Overwrite `content/blog/illustrated-by-hand.md` with exactly:**

```markdown
---
title: "How we bring your child to life on screen"
excerpt: "A look at how a few photos and details become your child's animated hero."
date: "2026-05-06"
category: "Behind the scenes"
author: "Jonah Reyes"
---

People sometimes ask whether a person is really involved, or whether a computer just does it all. The honest answer is both. We use professional editing tools and AI to do the heavy lifting, and people guide every step. Here is how a child finds their way onto the screen.

## It starts with a few details

You share a little about your child. A few photos, their name, the color of their hair, the animal they love most, and a few things that make them, them. It does not take long, and it does not need to be perfect. A handful of true details is enough to begin.

## We shape their likeness

From your photos, we build the look of your child's animated hero. This is where the tools earn their keep. We can try many small variations quickly and keep the one that feels most like them. We are looking for the feeling of a child more than a perfect copy, the way a four year old stands, the particular joy of a kid who just learned to jump.

## The story takes shape around them

Then the world fills in around your child. If the favorite animal is a fox, the fox shows up in more scenes than you would expect. Small choices like that are what make a video feel personal rather than generic.

> The goal is not a perfect likeness. The goal is a child who watches and says, that is me.

## Color, motion, and a lot of checking

Once the look feels right, we animate the scenes and grade the color. Warm light for the cozy moments, deeper tones for the brave ones. We check the details you gave us one more time, because the curls and the freckles are the parts a child notices first. The tools are fast, and the care is human.

## Before it is finished

Nothing is final until you have seen it. We send a preview, and you can ask for changes. Maybe a scene should be brighter, or the rabbit needs to be a little smaller. We are glad to adjust. It is your child, and it should look like them.

When the final video arrives, it carries real attention in every frame. That is the part we are proud of, and the part we hope you feel the first time you press play.
```

- [ ] **Step 2: Overwrite `content/blog/how-a-book-comes-together.md` with exactly:**

```markdown
---
title: "From their name to the screen: how your video comes together"
excerpt: "A simple walk through what happens between the moment you order and the day your video is ready."
date: "2026-01-27"
category: "Behind the scenes"
author: "The Yours Fairy Tale studio"
---

People are often curious about what happens after they place an order. It is not a mystery, and we are happy to walk you through it. Here is the path your video takes, from a few details to a finished film.

## You share the details

It begins with you. You tell us the child's name, their hair, their favorite animal, share a few photos, and pick the story you like best. This part takes a few minutes. Everything that follows grows from these small, true facts.

## We build the story around them

Next, the writing and the animation come together. Their name is woven into the story, and we shape your child as the hero using our editing tools and AI. The favorite animal finds its way into the scenes. The story bends a little to fit the specific kid it is about.

## You see a preview

Before anything is finished, we send you a preview. This is your chance to check the details and ask for changes. If the hair is not quite right, or you want a brighter scene, tell us. We would rather fix it now than have you notice it later.

## We render the final cut

Once you are happy, we render the full video in HD, with the color, sound, and motion all in place. We watch it through one more time, because we know exactly how these get used: on the couch, at bedtime, again and again.

## It arrives

Most videos are animated and ready within about two weeks. You will get an email at each step, so you are never left wondering. Then one day a link lands in your inbox, and inside is a story with your child as the hero.

That is the whole journey. A handful of details at the start, a little care in the middle, and a keepsake at the end.
```

- [ ] **Step 3: Overwrite `content/blog/the-quiet-pull-of-hardcover.md` with exactly:**

```markdown
---
title: "The quiet pull of a story that's just theirs"
excerpt: "Screens are full of things that vanish. A story made for your child is one they return to."
date: "2026-02-24"
category: "Keepsakes"
author: "Jonah Reyes"
---

A child can swipe through a hundred bright videos in a minute. They are quick, and they are fun, and then they are gone. A story made just for your child asks for something different, and gives back something different too.

## It is about them

Most of what fills a screen is made for everyone, which means it is made for no one in particular. A personalized video is the opposite. Their name, their face, their favorite animal, all of it is theirs. A child can tell the difference, and they lean in when the story is truly about them.

## One thing at a time

Endless feeds are built to keep going: another clip, another tap, another bright thing. A story with a beginning and an end is built to be finished. For a young mind, that shape is a gift. The story gets to be the only thing in the room, and then it gets to be over, which is its own kind of calm.

## It belongs to them

You can hand a child their own video and say, this one is yours. They can choose it at bedtime, watch it on the couch, and show it to grandparents on a phone. It becomes a small thing a child is proud of, in a way the next autoplay never quite does.

## It lasts

Most of what a child watches is forgotten by morning. A story made for them is saved, and it keeps. The video you watch together tonight can sit in a folder for years, ready to play long after the bedtimes end, still holding the same story and the same name.

We are not against screens. We make something you watch on one. But when you want something a child will return to, and keep, and maybe one day show to a child of their own, a story made just for them is the one that stays.
```

- [ ] **Step 4: Verify** — `grep -niE "hardcover|hand-illustrat|hand-drawn|by hand|real artist|printed|bound|on the shelf|on the page" content/blog/illustrated-by-hand.md content/blog/how-a-book-comes-together.md content/blog/the-quiet-pull-of-hardcover.md` returns nothing.

- [ ] **Step 5: Commit**
```bash
git add content/blog/illustrated-by-hand.md content/blog/how-a-book-comes-together.md content/blog/the-quiet-pull-of-hardcover.md
git commit -m "content(blog): rewrite the three book-craft posts for video + AI"
```

---

### Task 2: Translate the four "our product is a book" posts

**Files:** `content/blog/a-note-for-grandparents.md`, `content/blog/what-makes-a-keepsake.md`, `content/blog/hearing-their-own-name.md`, `content/blog/let-your-child-help.md`. Apply the exact string replacements below. Do not touch lines not listed. Keep frontmatter `date`/`category`/`author`.

- [ ] **Step 1: `a-note-for-grandparents.md`**
  - excerpt `"If you want to give a grandchild something they will keep, a personalized book is hard to beat."` → `"If you want to give a grandchild something they will keep, a personalized video is hard to beat."`
  - heading `## Why a book holds up` → `## Why a video holds up`
  - `It gets read at bedtime, so it becomes part of a daily routine. And it stays on the shelf for years, which means it can carry your name as the giver for a long time.` → `It gets watched at bedtime, so it becomes part of a daily routine. And it stays saved for years, ready to play, which means it can carry your name as the giver for a long time.`
  - `you can add a short dedication on the first page. A single warm line is enough:` → `you can add a short dedication at the start. A single warm line is enough:`
  - `It is your voice, in their book, in their hands.` → `It is your voice, in their story, theirs to keep.`
  - `## When it arrives` body: `A book like this tends to become a fixture. The parents read it, then the child asks for it, then it gets read again. You gave them a story, and quietly, you gave them a habit of being read to.` → `A video like this tends to become a fixture. The parents play it, then the child asks for it, then it gets watched again. You gave them a story, and quietly, you gave them a moment they return to.`

- [ ] **Step 2: `what-makes-a-keepsake.md`**
  - `A book that was read so many times the spine went soft.` → `A video watched so many times they could mouth the words.`
  - `That is why a personalized book tends to last.` → `That is why a personalized video tends to last.`
  - `## Made to be handled` section: `A keepsake should be touched, not protected behind glass. We make books as hardcovers for that reason. They are built to be carried to bed, read at the kitchen table, and packed in a bag for grandma's house. The small wear they pick up over the years is part of the story.` → `A keepsake should be lived with, not protected behind glass. We make videos to be watched, not filed away and forgotten. They are made to be played at bedtime, on the couch, and on a phone at grandma's house. The story they become part of, over all those nights, is the point.`
  - `A book with their name in it, read again and again, often does.` → `A video with their name in it, watched again and again, often does.`

- [ ] **Step 3: `hearing-their-own-name.md`**
  - opening `There is a particular look a child gets when they hear their own name read aloud from a book.` → `There is a particular look a child gets when they hear their own name in a story made for them.`
  - `So when that same name appears inside a story, something clicks. The book is not about a stranger in a faraway place. It is about them.` → `So when that same name appears inside a story, something clicks. The story is not about a stranger in a faraway place. It is about them.`
  - heading `## Seeing themselves on the page` → `## Seeing themselves on screen`
  - `It helps to see the rest of themselves there too. Their hair, the gap in their teeth, the stuffed rabbit they carry everywhere. When the details match, the story feels true, and a true story is one a child will ask for again and again.` → keep, but change `there too` stays fine. (No book word; leave as-is.)
  - `We hear from parents that the same book gets read a hundred times.` → `We hear from parents that the same video gets watched a hundred times.`
  - In `## A gentle way to read it`, retitle to `## A gentle way to watch it` and update its list: `Read their name a touch slower than the rest.` → `Watch for the moment their name first appears.` ; `Pause after it, and look up.` → `Point it out, and look over at them.` ; `Let them fill in what they already know is coming.` → `Let them grin at seeing themselves.` ; trailing `You are not performing. You are just sharing something that was made for them, and letting them feel it.` → keep.
  - closing `A book with your child's name in it is a small thing.` → `A story with your child's name in it is a small thing.`

- [ ] **Step 4: `let-your-child-help.md`**
  - opening `You can order a book entirely on your own` → `You can order a video entirely on your own`
  - `It is not just a book they were given. It is a book they made decisions about, with you.` → `It is not just a video they were given. It is a video they made decisions about, with you.`
  - `## A quiet bonus` body keep `away from screens` (the making happens off-screen). Change `The book arrives later. The time together happens now.` → `The video arrives later. The time together happens now.`

- [ ] **Step 5: Verify** the four files contain no `book|hardcover|on the shelf|on the page|read aloud` (run the grep across just these four).

- [ ] **Step 6: Commit**
```bash
git add content/blog/a-note-for-grandparents.md content/blog/what-makes-a-keepsake.md content/blog/hearing-their-own-name.md content/blog/let-your-child-help.md
git commit -m "content(blog): translate four posts from book to video"
```

---

### Task 3: Light-touch the three general-parenting posts

**Files:** `content/blog/a-gentle-bedtime-routine.md`, `content/blog/a-story-for-a-shy-child.md`, `content/blog/reading-aloud-at-bedtime.md`. Only the listed lines change; the universal reading/bedtime advice stays.

- [ ] **Step 1: `a-gentle-bedtime-routine.md`**
  - `like "time to find our book."` → `like "time to find our story."`
  - `If it is a book made for your child, even better, because they will settle into a page that is theirs.` → `If it is a story made for your child, even better, because they will settle into something that is theirs.`

- [ ] **Step 2: `a-story-for-a-shy-child.md`**
  - `When a shy child becomes the hero of their own book, something kind happens.` → `When a shy child becomes the hero of their own story, something kind happens.`
  - `If a page feels like too much, skip it.` → `If a moment feels like too much, skip it.`

- [ ] **Step 3: `reading-aloud-at-bedtime.md`** (keep as universal reading advice; only drop the implication that OUR product is a book)
  - heading `## When their name is in the book` → `## When the story is made for them`
  - `If you are reading a story made for your child, lean into the moments that are theirs.` → keep (already says "story").
  - Leave generic ordinary-book references intact: "Give each page a beat before you turn it.", "stop and study the fox on page six", "Let your child turn the pages when they can.", "the book is just the reason." These describe reading any physical book aloud and are allowed.

- [ ] **Step 4: Commit**
```bash
git add content/blog/a-gentle-bedtime-routine.md content/blog/a-story-for-a-shy-child.md content/blog/reading-aloud-at-bedtime.md
git commit -m "content(blog): light-touch general posts to drop the book product framing"
```

---

### Task 4: Blog chrome — index, RSS, post CTA, category emoji

**Files:** `app/blog/page.tsx`, `app/blog/rss.xml/route.ts`, `app/blog/[slug]/page.tsx`, `lib/blog.ts`.

- [ ] **Step 1: `app/blog/page.tsx`**
  - `metadata.description`: `"Gentle notes on books, bedtime, and the small things worth keeping, from the studio behind your child's storybook."` → `"Gentle notes on bedtime, stories, and the small things worth keeping, from the studio behind your child's video."`
  - intro paragraph `Gentle thoughts on books, bedtime, and the small things worth keeping.` → `Gentle thoughts on bedtime, stories, and the small things worth keeping.`

- [ ] **Step 2: `app/blog/rss.xml/route.ts`**
  - `<description>Gentle notes on books, bedtime, and the small things worth keeping.</description>` → `<description>Gentle notes on bedtime, stories, and the small things worth keeping.</description>`

- [ ] **Step 3: `app/blog/[slug]/page.tsx`** end CTA
  - `Want a book like this for your child?` → `Want a video like this for your child?`
  - `Add their name, choose an adventure, and we&apos;ll hand-illustrate the rest.` → `Add their name, choose an adventure, and we&apos;ll create the rest.`
  - `Create your book →` → `Create their video →`

- [ ] **Step 4: `lib/blog.ts`** — in `CATEGORY_META`, change the `"Behind the scenes"` entry emoji from `"🎨"` to `"🎬"`. Leave bg color and all other entries unchanged.

- [ ] **Step 5: Verify** `npx tsc --noEmit` → 0 errors.

- [ ] **Step 6: Commit**
```bash
git add app/blog/page.tsx app/blog/rss.xml/route.ts app/blog/[slug]/page.tsx lib/blog.ts
git commit -m "content(blog): update index/RSS/CTA copy to videos; behind-the-scenes emoji"
```

---

### Task 5: Footer

**File:** `components/home/site-footer.tsx`.

- [ ] **Step 1:** Replace the brand blurb (currently `Hand-animated fairy tales starring your child. Written with care, animated by a real artist, and made to be watched again and again.`) with:

```
Personalized animated fairy tales starring your child. Crafted with professional editing tools and AI for a polished, cinematic result, and made to be watched again and again.
```

- [ ] **Step 2:** Replace `© 2026 Yours Fairy Tale. Made by hand, with love.` with `© 2026 Yours Fairy Tale. Made with love, frame by frame.`

- [ ] **Step 3: Verify** `npx tsc --noEmit` → 0 errors; `grep -nE "by hand|real artist|Hand-animated" components/home/site-footer.tsx` returns nothing.

- [ ] **Step 4: Commit**
```bash
git add components/home/site-footer.tsx
git commit -m "content(footer): videos + AI-crafted positioning, drop made-by-hand"
```

---

### Task 6: Brand-voice skill, product north-star, decision record, Mind

**Files:** `.claude/skills/brand-voice/SKILL.md`, `fairy-tale-mind/map/product.md`, new `fairy-tale-mind/map/decisions/ai-crafted-not-hand-animated.md`, a tech-debt update, and `npm run mind`.

- [ ] **Step 1: `.claude/skills/brand-voice/SKILL.md`** — update the stale book/handmade vocabulary:
  - Overview: `a trusted friend who handcrafts something a family will treasure` → `a trusted friend who makes something a family will treasure`.
  - Word bank "Reach for": remove `hand-illustrated, hardcover, real artist`; add `animated, cinematic, scene, watch together, saved, crafted with care`. Keep keepsake, treasure, their very own, starring, again and again, made just for them, cherish, gift, remember.
  - Add one line under "Voice pillars" or "Word bank": "We use professional editing tools and AI to reach the quality we want. Say it plainly and calmly when it is relevant; never as hype (no 'AI-powered!')."
  - Canonical patterns:
    - Primary CTA: `"Create your book" · "Start their story" · "Make their book"` → `"Create their video" · "Start their story" · "Make their video"`
    - Secondary CTA: `"See how it works" · "See sample books"` → `"See how it works" · "See sample videos"`
    - Error example: `"Something went wrong while creating your book. Please try again in a moment."` → `"...while creating your video..."`
    - Empty state: `"No books yet. When you create one, it'll live here, ready for story time."` → `"No videos yet. When you create one, it'll live here, ready for story time."`
  - "One example": rewrite both lines for video, e.g. off-brand `POW! Your Little Legend stars in their very own story—hand-drawn just for them!` and on-brand `Your child becomes the hero of their very own animated story, made just for them.`
  - Common mistakes table: change the em-dash example `their name—woven in` only if needed (keep, it is still a valid example); update any `Create Your Book` → `Create Their Video` in the Title Case row.

- [ ] **Step 2: `fairy-tale-mind/map/product.md`** — update the craft framing:
  - The hero/`how it works`/positioning lines that say `hand-animated by a real artist` / `animated by a real artist` → `crafted with professional editing tools and AI` (keep "personalized animated video", "cinematic", "in HD", keepsake promise). Specifically the "What it is" paragraph and the "Positioning & brand" line. Keep the books→videos pivot note. Add a sentence noting the craft is "editing tools + AI for quality, guided by the team", not hand-made.

- [ ] **Step 3: Create `fairy-tale-mind/map/decisions/ai-crafted-not-hand-animated.md`:**

```markdown
---
type: decision
summary: "Positioning is now 'crafted with professional editing tools and AI for the highest quality', not 'hand-animated by a real artist'. The product is made with software + AI guided by the team; we say so plainly and calmly, never as hype. Updated the blog, the footer, the brand-voice skill, and the product north-star to match."
tags: [positioning, brand, content]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[journal]]", "[[app-shell]]", "[[homepage]]"]
sources: ["[[2026-06-04-blog-videos-ai-positioning-design]]"]
decided: 2026-06-04
supersededBy: ""
---

## Context
Live copy still described a hand-illustrated hardcover book made by a real
artist. The product is a personalized animated video, and the owner confirmed
the truth of how it is made: professional editing software and AI, guided by the
team, to deliver the highest quality. The earlier "hand-animated by a real
artist" framing was both off (books to videos) and inaccurate (not hand-made).

## Decision
Reposition the craft as "crafted with professional editing tools and AI for a
polished, cinematic result." Keep the calm, keepsake-focused emotional promise
(a story watched again and again). State the AI plainly where relevant
(behind-the-scenes posts), never as hype. Applied to the Journal (10 posts +
chrome), the footer, the brand-voice skill, and the product north-star.

## Consequences
- The brand-voice word bank no longer reaches for "hand-illustrated / hardcover /
  real artist"; CTAs say "Create their video".
- CLAUDE.md still describes "hand-illustrated hardcover storybooks" (project
  instructions, not live copy) — tracked as remaining drift, lower priority.
- The 10 legacy concept pages keep their book copy (frozen archive).
```

- [ ] **Step 4: Tech-debt** — update the existing books→videos drift note (`fairy-tale-mind/tech-debt/claude-md-says-hardcover.md` if present) to record that the live blog + footer + brand-voice + product north-star are now corrected, and that CLAUDE.md remains the last book reference. If that file does not exist, add a one-paragraph note to the most relevant existing copy-drift tech-debt file. Do not invent new tracking files beyond this.

- [ ] **Step 5: Re-stamp + regenerate**
  - Update `verifiedAt` to the latest HEAD short SHA in `fairy-tale-mind/map/zones/journal.md` and `fairy-tale-mind/map/zones/app-shell.md`, and add a one-line Lineage note to each (journal: posts/chrome repositioned to video + AI; app-shell: footer repositioned).
  - Run `npm run mind`.

- [ ] **Step 6: Commit**
```bash
git add .claude/skills/brand-voice/ fairy-tale-mind/
git commit -m "docs(mind): AI-crafted positioning — brand-voice, product, decision, zones"
```

---

### Task 7: Verification

- [ ] **Step 1: Build** — `npm run build` succeeds (blog statically generated).

- [ ] **Step 2: Grep gate** — these marketing/craft phrases must NOT appear in the live blog or footer (generic ordinary-book references in `reading-aloud-at-bedtime.md` are allowed and not matched by this set):
```bash
grep -rniE "hardcover|hand-illustrat|hand-drawn|by hand|real artist|made by hand" content/blog app/blog lib/blog.ts components/home/site-footer.tsx
```
Expected: no output.

- [ ] **Step 3: Browser pass** (REQUIRED SUB-SKILL: `verify`) — run the app, open `/blog` (intro + featured card title), one rewritten post (e.g. `/blog/illustrated-by-hand`, `/blog/the-quiet-pull-of-hardcover`), confirm the post end-CTA reads "Create their video", and scroll the footer to confirm the new blurb + tagline. Capture a screenshot.

- [ ] **Step 4: Finish** (REQUIRED SUB-SKILL: `superpowers:finishing-a-development-branch`) — present merge/PR options.

---

## Self-review notes

- **Spec coverage:** 3 rewrites (Task 1), 4 translates (Task 2), 3 light-touch (Task 3), chrome incl. emoji (Task 4), footer (Task 5), brand-voice + product + decision + tech-debt + Mind (Task 6), verify (Task 7). All spec sections mapped.
- **Voice:** all new prose avoids em-dashes, uses American English + sentence case, stays calm/concrete. Delivery time ("about two weeks") matches the homepage FAQ.
- **Slugs preserved** (no redirects needed). Filenames unchanged.
- **Grep gate** targets craft/marketing phrases, not the bare word "book", so the universal reading-aloud post keeps its ordinary-book references without failing the gate.
- **No logic changes** except one emoji in `CATEGORY_META`; `tsc` should stay at 0 errors.
