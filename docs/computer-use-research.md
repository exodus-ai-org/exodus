# Computer Use — Research Notes

**Date:** 2026-09-06
**Status:** research / exploration. No implementation decision yet.

Inputs: the user's blog post *"AI's Ultimate Form"*
(`yanceyleo.com/post/1b27acf6…`) and the state of the field as of early
September 2026. The user's full ChatGPT thread on this is not yet in hand;
this doc will be revised when it is.

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

## 4. What Exodus can realistically be

**Exodus cannot out-model OpenAI/Anthropic/Google/ByteDance.** Billions of
dollars are already pointed at the brain. Exodus's leverage is the
**harness** — the operator environment around whatever brain you plug in:

- captures the screen (frames now; a rolling video buffer later),
- runs and paces the perceive→act loop,
- owns the workspace / sandbox / permissions,
- **logs and traces every episode** (the trace infra just landed on
  `master` is directly reusable — one computer-use episode = one
  `traceId`, every step a log line),
- lets the user swap the model: cloud (Astra / Claude) **or** homelab
  (UI-TARS over Tailscale).

This is the "PID pipeline" idea from the ChatGPT thread — Exodus is the
loop and the plumbing, not the policy.

### Staged path

- **Stage 0 — a `computer-use` tool (buildable now, ~1–2 wk).**
  Screenshot → VLM → coordinate actions via a native driver
  (`nut.js` / `@nut-tree` or Electron's `robotjs` successor). Bounded to a
  target window; every action gated by the existing permission model;
  each episode is one trace. Model-agnostic: Claude computer-use format,
  GPT-6 Astra, or local UI-TARS. This matches Anthropic's reference
  implementation and is immediately useful for real automation.
- **Stage 1 — collocated inference + memory.** UI-TARS-7B (or its
  successor) on the homelab, reached over Tailscale. Measure loop latency
  honestly. Add persistent action history / implicit-state memory so the
  agent isn't re-deriving context every frame (the "not frame-by-frame"
  point).
- **Stage 2 — streaming perception experiments.** For a *specific* task
  class (drag-resize, a browser game, scrubbing a video), feed a short
  rolling clip instead of one screenshot and compare success/latency.
  Research, not product.
- **Stage 3 — VLA-shaped action space.** Design the primitive set for
  eventual embodied transfer. Speculative; revisit when Stage 1–2 have
  data.

---

## 5. Open questions for the user

1. **Which end of the telescope first** — a genuinely useful Stage 0 tool
   (screenshot loop, existing models), or a research probe straight at the
   streaming-perception thesis (Stage 2)?
2. **Model stance** — is the homelab-over-Tailscale inference path
   (Stage 1) the real target, or is a cloud model fine for now and the
   "collocated" idea is a someday-thing?
3. **Scope of control** — a single sandboxed window, the whole desktop, or
   a dedicated VM?
4. Anything in the ChatGPT thread that changes the above — still waiting
   on that export.
