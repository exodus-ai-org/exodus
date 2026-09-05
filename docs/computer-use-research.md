# Computer Use — Research Notes

**Date:** 2026-09-06
**Status:** research / exploration. No implementation decision yet.

Inputs: the user's blog post *"AI's Ultimate Form"*
(`yanceyleo.com/post/1b27acf6…`), the full user↔ChatGPT thread
(pasted 2026-09-06 — the "Computer Runtime" architecture in §4), and the
state of the field as of early September 2026.

---

## 1. The vision (from the blog)

Five claims, in the author's framing:

1. **Perceive video, not screenshots.** Humans get a continuous stream;
   discrete frames lose information (games, visually dense pages,
   animations, drag interactions).
2. **The screenshot → upload → infer → parse → act loop is too slow.** It
   runs on the order of a minute per decision; humans react in
   milliseconds.
3. **Tesla FSD is the existence proof.** Cameras stream, the model runs
   in real time and *collocated* (no transmission bottleneck), directives
   drive actuators — and FSD is "not even frame-by-frame independent
   understanding" (i.e. it carries temporal state / a world model).
4. **Deploy inference at neighbourhood scale.** Not centralised cloud, not
   purely local — AI "substations" like EV chargers or 5G towers, so
   transmission latency stays low.
5. **Emit human motor primitives, not app APIs.** `move_mouse(dx,dy)` /
   `key(...)`, never `page.scroll()` — so the same policy can later
   transfer to a physical robot.

---

## 2. Where the field actually is (Sept 2026)

### Short-horizon computer use is close to solved

- **OSWorld:** 12% success (Apr 2024) → **85%** (Jun 2026)
  ([Masood, *The Hardest Easy Problem*](https://medium.com/@adnanmasood/the-hardest-easy-problem-in-ai-the-state-of-computer-use-agents-a7e3aea7fa3a)).
- **GPT-6 Astra** (OpenAI, released 3 Sep 2026) is built "like a computer
  operator" and is claimed SOTA in computer use, browsing, SWE, 3D/CAD
  ([Fortune](https://fortune.com/2026/09/03/openai-debuts-gpt-6-astra-computer-use-greg-brockman-says-start-of-agi/)).
  $10 / $50 per M tokens, 1M context.

### Long-horizon and efficiency are wide open — and this is exactly the blog's point

- **OSWorld 2.0** (108 tasks, median human time **1.6 h**, explicit
  challenge categories: *dynamic environments, streaming interaction,
  proactive interaction, implicit-state inference*): best frontier system
  **20.6%**
  ([arXiv 2606.29537](https://arxiv.org/pdf/2606.29537)).
- **Efficiency is the headline complaint of 2026.** Best agents take
  **2.7–4.3× more steps** than necessary and have end-to-end latency of
  **"tens of minutes"** for tasks humans do in a few minutes — described
  as "practically unusable"
  ([OSWorld 2.0](https://arxiv.org/pdf/2606.29537);
  [OSWorld-Human, MLSys 2026](https://mlsys.org/virtual/2026/oral/3865)).
  Dedicated work now targets this: *Step-level Optimization for Efficient
  Computer-use Agents* ([arXiv 2604.27151](https://arxiv.org/pdf/2604.27151)).

**The blog's latency critique is now the mainstream critique.** It was
contrarian a year ago; it is the consensus research frontier today.

### Streaming perception is an emerging, named direction

- **StreamArena** — "continuous, interactive, long-horizon agentic
  streaming video understanding" ([arXiv 2608.05703](https://arxiv.org/html/2608.05703v1)).
- *StreamingReasoning*, *StreamingClaw* ([arXiv 2603.22120](https://arxiv.org/pdf/2603.22120)),
  and a curated [awesome-streaming-agents](https://github.com/lg-li/awesome-streaming-agents)
  list — VLM/VLA systems that ingest unbounded streams and respond in
  real time.
- Real-time *video-agent infrastructure* exists (e.g.
  [Vision Agents by Stream](https://github.com/GetStream/Vision-Agents),
  ~30 ms media latency over an edge network) — but it is built for
  voice/vision assistants, **not** GUI control. Nobody is shipping a
  production video-native GUI operator yet.

### The action-space debate is going the *other* way

The blog wants raw motor primitives. Two 2026 papers push toward
**declarative / hybrid** action spaces instead, for reliability:

- *From Imperative to Declarative: Towards LLM-friendly OS Interfaces*
  ([arXiv 2510.04607](https://arxiv.org/pdf/2510.04607)).
- **UltraCUA** — a foundation model with a **hybrid** action space that
  mixes API calls and GUI actions, precisely to cut step count and
  latency ([arXiv 2510.17790](https://arxiv.org/pdf/2510.17790)).

### Open / self-hostable stack

- **UI-TARS** (ByteDance) — fully open weights, pixels → coordinates, *no*
  accessibility tree or DOM. UI-TARS-2 (Sep 2025) adds RL reasoning; the
  7B runs locally on vLLM. **UI-TARS Desktop** already drives a local
  machine, a remote machine, or a browser
  ([github.com/bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop)).
- Also 2026: *Fara-1.5* (scalable CUA training envs), *OS-Symphony*,
  *Agent S2* (generalist–specialist composition).

---

## 3. Pillar-by-pillar: vision vs. reality

| # | Blog claim | Verdict | Notes |
|---|---|---|---|
| 1 | Video, not screenshots | **Directionally right, now mainstream research, not yet product** | Screenshot loops still dominate because training data is screenshot–action pairs, video tokens are costly, and most GUI tasks aren't reflex-time. Video decisively wins for a *minority* of tasks: games, video scrubbing, drag/resize, reacting to animation or streamed content. Start there, not everywhere. |
| 2 | The loop is too slow | **Correct, and it's the field's #1 problem** | Real numbers: cloud VLM step = 2–10 s; multi-step task = minutes to tens of minutes. Fixes in progress: small dedicated grounding models (~sub-second), step-level RL, hybrid actions (skip the GUI when an API exists), predictive/speculative execution. |
| 3 | FSD is the proof | **Half-right — a useful intuition, a dangerous analogy** | *Holds:* end-to-end, temporal state (not stateless frames), collocated compute. GUI agents genuinely need persistent history / implicit-state tracking (an OSWorld-2.0 challenge category). *Breaks:* FSD has a **bounded** action space (steer/accel/brake) and **billions of homogeneous fleet miles**. Computer use has an unbounded action space and sparse, heterogeneous data. FSD-style monolithic end-to-end works *because driving is narrow*. |
| 4 | Neighbourhood-scale inference | **Right problem (edge/MEC), wrong unit for a desktop app** | You will not build AI substations. But you *have* a homelab (Tailscale, Caddy, GPU-capable). The realistic "collocated low-latency inference" for Exodus is: run the grounding model **on the homelab box, reached over Tailscale** — single-digit-ms LAN/WG latency, local GPU. That is the buildable middle path between "cloud API per action" and "science-fiction substation". |
| 5 | Motor primitives → robot transfer | **Partly already true; the transfer story is speculative but not crazy** | UI-TARS *already* outputs `(x,y)` + keystrokes. A GUI policy whose action space is `{move, click, type, scroll, drag}` is structurally a **VLA** (vision-language-action) model, same family as robot-control research (RT-2 / OpenVLA lineage). Robot transfer today = hand-wave. "Action space as the universal interface" = a real, defensible design principle. |

---

## 4. The converged architecture (user + ChatGPT thread, 2026-09-06)

The full ChatGPT thread lands on a specific, and good, structural idea:
**a `Computer Runtime` module, owned by Exodus and independent of the
Agent.** Whichever lab's computer-use model wins (Astra, Claude, Gemini),
you swap the Agent layer and the Runtime is untouched — that is the moat.

```
Exodus
 ├── Agent            (swappable: GPT-6 Astra / Claude / Gemini / local)
 ├── Tools            (GraphRAG, Browser, Code, Computer)
 └── Computer Runtime
      ├── Capture          screen frames, cursor, target window/VM
      ├── Perception       "three-eye": DOM  +  Accessibility tree  +  Screenshot
      ├── Temporal Engine  frame diff → change list → keyframes ("visual git")
      ├── World State       compact JSON, not images
      └── Controller        deterministic low-level loop: observe→move→correct→click
```

**Core principles from the thread (all sound):**

1. **The LLM is the brain, never the camera or the mouse driver.** It
   receives `World State`, emits *goals*; the Controller runs the
   millisecond loop. Same split as a car: perception/planning/control are
   separate stages, not one model.
2. **Never feed raw video to the LLM.** Even when models allow it, it's
   waste. Compress the stream to a `World State` first.
3. **Don't start at 60 FPS.** V0 = ~2 FPS screenshot agent · V1 = ~10 FPS
   + temporal diff · V2 = 30–60 FPS realtime. The thing to *validate*
   first is "how much does temporal state help the agent", not "can I
   process 60 FPS".
4. **`observe()` returns a `ComputerState`, not a screenshot** — viewport,
   cursor, scene, `changes[]`, `history[]`, `objects[]`, `trajectory`.
5. **Keyframe + diff.** A cheap local detector decides "did anything
   meaningful change?" — 60 FPS in, ~4 FPS to the VLM, ~0.1 FPS for a
   static page, ~15 FPS for a game. One order of magnitude saved for free.
6. **Region-of-interest, not full-frame Vision.** Find *where* to look
   with cheap signals, then send only that crop to the expensive model.
7. **For web, skip Vision — use DOM + Accessibility tree.** Exodus's
   biggest cheat: `{role:"button", name:"Create repository", bounds:[…]}`
   is smaller, faster, and more accurate than a screenshot description.
8. **Three-tier model economy.** L0 pure code (DOM/a11y/OCR/pixel-diff,
   ≈ $0) · L1 local small model (UI/object detection, temporal embedding)
   · L2 frontier model (planning, ambiguity, failure recovery) — L2 called
   0.1–2×/s, not 60.
9. **The Controller owns its own closed loop.** LLM says "find Settings";
   the Controller scrolls + observes + stops + reports back. The LLM is
   *not* re-invoked after every micro-action. This is what kills the
   latency problem.
10. **GraphRAG analogy.** GraphRAG = long-term world *knowledge* ("what did
    I know before"); Temporal World State = short-term continuous GUI
    *state* ("what just happened"). Both keep the "AI decides when to look"
    philosophy — but note the integration differs: GraphRAG is *pull* (a
    tool the agent calls), World State is *push* (ambient context refreshed
    each loop).

## 5. Assessment — where I agree, and where to be careful

**Agree, no reservation:** the brain/controller split, no-raw-video,
staged V0→V2, DOM-first for web, three-tier economy, and above all the
model-agnostic Runtime as the durable asset. This matches where the 2026
literature is heading (hierarchical agents, step-level optimization,
hybrid action spaces).

**Push back / add nuance:**

- **The Temporal Engine / "visual git" / World Model is the actual
  research problem** — a reliable semantic diff for *arbitrary* GUIs is
  what the streaming-GUI papers are still fighting. Do **not** build it
  early. V0–V1 get ~80% of the temporal benefit for near-zero cost by
  passing *the previous screenshot* + *a text log of "actions taken since
  last observe"*. Earn the World Model with data.
- **`observe()` output is app-dependent.** Web → rich (DOM/a11y). Native
  macOS apps → often just a screenshot + thin a11y. Design `ComputerState`
  as "best available signal", not a schema that assumes DOM.
- **"Local small model on a Mac Mini"** — UI-TARS-7B wants a real GPU for
  low latency. Mac-Mini-viable L1 is more like OmniParser / a small
  UI-detector / OCR, not a 7B VLM. Your homelab GPU box (over Tailscale)
  is where an L1 VLM realistically lives.
- **Host-control is a security surface.** Exodus is Electron; driving the
  real mouse/keyboard needs native modules (`nut.js`) **and** OS
  accessibility grants (macOS TCC). Letting a model drive your actual
  desktop while you work is not a V0 default — V0 targets a **single
  window** or a **disposable VM**. Every action stays behind the existing
  permission model, and each episode is one `traceId` in the logging
  system just shipped.

## 6. What I would build first

**Phase 1 — a `computer-use` tool, screenshot loop, ~1–2 weeks.** Scaffold
the *whole* `Computer Runtime` folder on day one, but with each layer
stubbed to its simplest form:

| Layer | Phase 1 form |
|---|---|
| Capture | Electron `desktopCapturer` on one target window (or a VM), ~2 FPS on demand |
| Perception | screenshot only (add DOM/a11y in Phase 3) |
| Temporal Engine | just `{ previousScreenshot, actionsSinceLastObserve: string[] }` |
| World State | `{ screenshot, viewport, cursor, actionLog }` |
| Controller | execute one action (`nut.js`), no inner loop yet |
| Agent | Claude / GPT-6 Astra computer-use format; UI-TARS as the local option |

Deliverable: the agent can complete a short OSWorld-style task in a
sandboxed window, and the whole episode is one trace you can replay.

Then Phase 2 (temporal diff → "what changed"), Phase 3 (three-eye
perception), Phase 4 (local keyframe engine), Phase 5 (Controller inner
loop — "go to Settings" not `move(1241,83)`), Phase 6 (the real World
Model). The blog's video-native thesis is Phase 4+; don't touch it before
Phase 2 has shown temporal state pays off.

## 7. Open questions for the user

1. **Phase 1 scope of control** — a single app window, or a disposable VM
   (heavier, but safe enough to let it run unattended)?
2. **First Agent** — Claude computer-use (best-documented reference), GPT-6
   Astra (newest, SOTA, pricey), or UI-TARS local (open, self-host, weaker)?
3. **Is homelab-over-Tailscale inference a real Phase-4 target**, or is
   cloud fine and "collocated" stays a someday-thing?
4. Ready to take this into `brainstorming` for a Phase 1 spec, or keep it
   as research a while longer?
