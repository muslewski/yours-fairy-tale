# Blog → videos + AI-crafted positioning — design

> **Status:** approved 2026-06-04. Next step: writing-plans → implementation plan.

**Goal:** Bring the Journal (blog) and the remaining "by hand / real artist"
copy in line with the product as it is today: a **personalized animated video**,
**crafted with professional editing tools and AI for a polished, cinematic
result** — not a hand-illustrated hardcover book made by a real artist.

**Why:** The product pivoted from hardcover books to animated videos, but the
blog and a few site-wide lines still describe books and a human illustrator.
The owner also wants the craft message corrected: we do **not** hand-make; we
use editing software with AI to deliver the highest quality. Leaving the blog
and footer as-is makes the site contradict its own homepage.

---

## Two messaging shifts (apply throughout)

1. **Product:** book / hardcover / printed / bound / "on the page" / "on the
   shelf" / "package on your doorstep" / "turn the page" → personalized
   **animated video / film / scene / on screen / saved to watch again /
   delivered as a link**.
2. **Craft:** "by hand" / "a real artist" / "hand-illustrate(d)" / "drawn, not a
   machine" / "Made by hand" → **crafted with professional editing tools and AI,
   for a polished, cinematic result**. Calm, quality-framed (the brand-voice
   "calm confidence" pillar). Foreground the AI/quality story in behind-the-
   scenes posts; do not shout it elsewhere.

**Voice guardrails (brand-voice skill):** American English, sentence case,
**no em-dashes**, rare exclamation points, no emoji in copy, short sentences,
concrete over hype, child is the hero / parent is the audience.

---

## Per-post treatment (10 posts in `content/blog/`)

### Rewrite (3 — built around the book/illustrator, cannot be word-swapped)

| File | New title / excerpt | Reframe |
|---|---|---|
| `illustrated-by-hand.md` | **"How we bring your child to life on screen"** · excerpt: "A look at how a few photos and details become your child's animated hero." | The AI + editing pipeline: you share a few photos and details → we shape the likeness → animate the scenes → you preview → we finish the cut. Honest about the tools: professional editing software and AI, guided by our team, tuned for quality. Author **Jonah Reyes** kept but reframed from illustrator to the person who directs that pipeline. This post now carries the "AI for highest quality" message most directly. Replace the "drawn by a real artist, not a machine" framing with "shaped with our tools, checked by people who care." Keep the preview/"that is me" beat. |
| `how-a-book-comes-together.md` | **"From their name to the screen: how your video comes together"** · excerpt: "A simple walk through what happens between the moment you order and the day your video is ready." | order → we build & animate the story → you see a preview → we render the final cut → it arrives as a link to watch (not a package). Drop print/bind/paper/doorstep. Keep the "email at each step" reassurance and the warm closing. |
| `the-quiet-pull-of-hardcover.md` | **"The quiet pull of a story that's just theirs"** · excerpt: "Screens are full of things that vanish. A story made for your child is one they return to." · category stays **Keepsakes** | Flip the thesis from "paper beats screens" to "*their* story vs. disposable scroll." A personalized film they choose at bedtime, re-watch, share with grandparents, and keep for years. It belongs to them; it lasts (saved, re-watchable). Do not bash screens wholesale (the product is a screen experience); contrast a story made for them against endless content that is gone in a minute. Author Jonah Reyes kept. |

### Translate (4 — our product is referred to as a "book")

Light, surgical edits: "book" → "video" or "story", "read"/"read aloud" → "watch",
"on the shelf"/"on the page" → "saved"/"on screen", drop "hand-illustrate". Keep
each post's structure and warmth.
- `a-note-for-grandparents.md` — excerpt + "Why a book holds up" → "Why a video
  holds up"; "stays on the shelf for years" → "stays saved for years, ready to
  play"; "a short dedication on the first page" → "a short dedication at the
  start"; "in their book, in their hands" → "in their story, theirs to keep".
- `what-makes-a-keepsake.md` — "a book that was read so many times the spine went
  soft" → a video example ("a story watched so many times they could mouth the
  words"); "We make books as hardcovers" paragraph → reframed to a video kept and
  re-watched; "A book with their name in it, read again and again" → "A story with
  their name in it, watched again and again".
- `hearing-their-own-name.md` — "name read aloud from a book" → "name in their
  own story"; "the same book gets read a hundred times" → "the same video gets
  watched a hundred times"; "Seeing themselves on the page" → "Seeing themselves
  on screen"; closing "A book with your child's name" → "A story with your child's
  name".
- `let-your-child-help.md` — "order a book" → "order a video"; "It is not just a
  book they were given. It is a book they made decisions about" → story/video;
  closing "The book arrives later" → "The video arrives later". Keep "a small
  project to share, away from screens" (the *making* happens off-screen — still
  true and on-brand).

### Light touch (3 — general parenting content; only fix lines that call OUR product a book)

These stay as warm, universal content (the brand still loves stories and bedtime).
Only adjust lines implying our product is a physical book:
- `a-gentle-bedtime-routine.md` — "time to find our book" → "time to find our
  story"; "If it is a book made for your child" → "If it is a story made for your
  child".
- `a-story-for-a-shy-child.md` — "the hero of their own book" → "the hero of their
  own story". (Generic "if a page feels like too much" → "if a moment feels like
  too much".)
- `reading-aloud-at-bedtime.md` — keep as universal reading advice (reading aloud
  is a real, cherished habit). Only soften the personalized-product tie: "When
  their name is in the book" → "When the story is made for them"; "in the book"
  → "in their story". Leave generic page/turn-the-page advice about ordinary books
  intact (this post is about reading any book aloud, not selling ours).

> Frontmatter `date`, `author`, and `category` are preserved for every post
> except the emoji change below. Reading time is derived, so it updates itself.

---

## Blog chrome

- `app/blog/page.tsx` — `metadata.description` and the intro paragraph: "notes on
  **books**, bedtime, and the small things worth keeping" → "notes on **bedtime,
  stories,** and the small things worth keeping". Keep "from the studio behind
  your child's story" wording (drop "storybook").
- `app/blog/rss.xml/route.ts` — `<description>` same edit.
- `app/blog/[slug]/page.tsx` — end CTA:
  - "Want a **book** like this for your child?" → "Want a **video** like this for
    your child?"
  - "Add their name, choose an adventure, and we'll **hand-illustrate** the rest."
    → "Add their name, choose an adventure, and we'll **create** the rest."
  - Button "**Create your book →**" → "**Create their video →**" (matches the
    homepage primary CTA).
- `lib/blog.ts` — `CATEGORY_META`: "Behind the scenes" emoji `🎨` → `🎬`. All
  other categories and the helper logic unchanged.

---

## Footer (app-shell)

`components/home/site-footer.tsx`:
- Brand blurb (currently "Hand-animated fairy tales starring your child. Written
  with care, animated by a real artist, and made to be watched again and again.")
  → **"Personalized animated fairy tales starring your child. Crafted with
  professional editing tools and AI for a polished, cinematic result, and made to
  be watched again and again."** (No em-dash.)
- Copyright tagline "© 2026 Yours Fairy Tale. **Made by hand, with love.**" →
  "© 2026 Yours Fairy Tale. **Made with love, frame by frame.**"

---

## Brand voice + positioning (the source of truth must change too)

- **`.claude/skills/brand-voice/SKILL.md`** — this skill is stale. Update:
  - Word bank "Reach for": replace "hand-illustrated, hardcover, real artist"
    with video/keepsake-appropriate terms (e.g. "animated, cinematic, scene,
    watch together, saved, crafted with care"). Keep keepsake/treasure/starring/
    again and again/cherish/gift/remember.
  - Canonical CTAs: "Create your book" / "Make their book" → "Create their video"
    / "Start their story" / "Make their video"; secondary "See sample books" →
    "See sample videos".
  - The one example and the error/empty-state examples: swap book → video.
  - Add a short line that we use professional editing tools and AI to achieve the
    quality, and we frame it calmly (never "AI-powered!" hype).
  - Overview line "a trusted friend who handcrafts something" → "a trusted friend
    who makes something a family will treasure" (drop "handcrafts").
- **`fairy-tale-mind/map/product.md`** — update the "hand-animated by a real
  artist" / "animated by a real artist" lines to the AI-crafted framing; keep the
  emotional promise (keepsake, watched again and again).
- **Tech-debt:** update / close the books→videos copy-drift item(s) that this
  resolves (e.g. `[[claude-md-says-hardcover]]` scope). Note CLAUDE.md still has
  the "hardcover books" description line; flag or fix as a small follow-up (it is
  a project-instructions file, lower priority than live copy).
- **New decision record** `map/decisions/ai-crafted-not-hand-animated.md`:
  positioning is now "crafted with editing tools + AI for highest quality," not
  "hand-animated by a real artist," and why (it is the truth of how the product is
  made; calm quality framing per brand voice).
- Re-stamp `journal` and `app-shell` zone `verifiedAt`; run `npm run mind`.

---

## Verification

- `npm run build` succeeds (blog is statically generated from the markdown).
- **Grep gate:** no user-facing `book|hardcover|hand-illustrat|by hand|real artist|
  printed|on the shelf` remains in `content/blog/`, `app/blog/`, `lib/blog.ts`, or
  `components/home/site-footer.tsx`. (Generic "read aloud" / ordinary-book
  references inside `reading-aloud-at-bedtime.md` are allowed and expected.)
- Browser pass: `/blog` index (intro + featured card), one rewritten post
  (`/blog/illustrated-by-hand` etc. — note slugs are unchanged unless we rename),
  the post CTA, and the footer. Capture a screenshot.

### Slugs
Keep existing filenames/slugs (e.g. `illustrated-by-hand`, `how-a-book-comes-together`,
`the-quiet-pull-of-hardcover`) to preserve any inbound links and the RSS guids, even
though the titles change. Renaming slugs is out of scope (would need redirects).

## Out of scope (YAGNI)

- The 10 legacy concept pages (`app/1-…` through `app/10-…`) — frozen archive.
- `components/checkout/README.md` (internal dev doc).
- Renaming blog slugs / adding redirects.
- New blog posts beyond the 3 rewrites.
