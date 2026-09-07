# [1.14.0](https://github.com/exodus-ai-org/exodus/compare/v1.13.0...v1.14.0) (2026-09-07)


### Bug Fixes

* **a11y:** resolve react-doctor accessibility findings ([e35c445](https://github.com/exodus-ai-org/exodus/commit/e35c44531e3b9e1ea092c25d798e1730c6a09adc))
* **agent-x:** address final-review findings (context dup, orphan bubble, ask_user clear) ([c6d1440](https://github.com/exodus-ai-org/exodus/commit/c6d144003fd7a29cf0894c0bcc66d50932d03f13))
* **agent-x:** Costs aggregates agent-x executions only, not global chat usage ([04d1917](https://github.com/exodus-ai-org/exodus/commit/04d1917cd928864b3011d8727b7153fd225b8733))
* **agent-x:** delete cascades, hierarchical Workforce nav, auto-collapse on Groups ([25e8757](https://github.com/exodus-ai-org/exodus/commit/25e87577ecda16d256156f70bc022cf9bba1938a)), closes [#1](https://github.com/exodus-ai-org/exodus/issues/1) [#2](https://github.com/exodus-ai-org/exodus/issues/2) [#3](https://github.com/exodus-ai-org/exodus/issues/3)
* **agent-x:** don't lock the sidebar shut on Groups ([670ad93](https://github.com/exodus-ai-org/exodus/commit/670ad93c3a297f852e6da4e936207249f570a530))
* **agent-x:** make avatar picker visibly responsive to clicks ([e07c0c5](https://github.com/exodus-ai-org/exodus/commit/e07c0c582766c171719d16ac55d8cda5aa12891a))
* **agent-x:** replace dynamic import with static in execution-engine ([44bdb41](https://github.com/exodus-ai-org/exodus/commit/44bdb4118d1677c095cd4f979847979a4eea02cc))
* **agent-x:** right-click Delete is onClick, not onSelect (Base UI) ([b3a7271](https://github.com/exodus-ai-org/exodus/commit/b3a7271aa6ba691aab811210108d5425594cc617))
* **backup:** checkpoint PGlite before dumps and on clean quit ([0d4fee8](https://github.com/exodus-ai-org/exodus/commit/0d4fee85d420bfc827ca6f6b77b188d3910a86c1))
* **build:** packaged app was missing most of its production dependency tree ([c5ea050](https://github.com/exodus-ai-org/exodus/commit/c5ea050d5376d3572f438b8af880a4c42c9db8c8))
* **build:** STRIP_TEST_IDS transform mangles a dynamic data-testid ([3cbc13b](https://github.com/exodus-ai-org/exodus/commit/3cbc13bbe47c76fcf8731721e0328ef88205ee3b))
* **calling-tools:** honor AbortSignal in all built-in tools ([dbd9342](https://github.com/exodus-ai-org/exodus/commit/dbd934280fe8356e74b19b515bc02f4b8c98d6a5))
* **chat:** resolve web-search citations across turns and in tables ([153245e](https://github.com/exodus-ai-org/exodus/commit/153245ef8ac49e8c667ba2d2620ede2ef159163a))
* **chat:** surface empty assistant turns instead of failing silently ([fe47ffe](https://github.com/exodus-ai-org/exodus/commit/fe47ffe765c96c0eb766d4deadba28530c9dc525))
* **computer:** address whole-branch review — coordinate backing-scale, kill-switch, chord sandbox, allowlist ([8aa59e0](https://github.com/exodus-ai-org/exodus/commit/8aa59e08fc8182cae37894bd8deb5f6dc12b126a))
* **computer:** session clamps in screenshot space; Guard owns abort ([72b936a](https://github.com/exodus-ai-org/exodus/commit/72b936a745a2459aef4fbabdfce708ff3a90b4ff))
* **csp:** allow blob web workers (worker-src 'self' blob:) ([206c5cf](https://github.com/exodus-ai-org/exodus/commit/206c5cfe73c82e41702503e03f4bbbafa683fb22))
* **discover:** gate home landing-screen layout on discover.enabled ([67b3e99](https://github.com/exodus-ai-org/exodus/commit/67b3e99d28343e32b4da200b8e59016e022b1220))
* **discover:** lenient per-item query parse + reset stuck refresh on startup ([bafefc9](https://github.com/exodus-ai-org/exodus/commit/bafefc999617b65cae6e6efff57bac0d7fe34db1))
* **jobs:** correct pgmq archive SQL, stop payload leaks, harden queue setup ([c83bcd2](https://github.com/exodus-ai-org/exodus/commit/c83bcd2b453cca086464fb81be3c211bdc3c9c56))
* **lock:** mask PIN inputs, inline remove flow, no launch flash ([553e860](https://github.com/exodus-ai-org/exodus/commit/553e860c4d6609c8cc2bfa8ec2430a9c6044afd7))
* **lock:** pin-store dir safety + degraded-mode test ([42b2f43](https://github.com/exodus-ai-org/exodus/commit/42b2f43580157ff72a6222eefd55b9a9bb74258d))
* **lock:** rate-limit disable/changePin; idempotent IPC setup ([3cd05c8](https://github.com/exodus-ai-org/exodus/commit/3cd05c8b812d6a0ed88731ea3306932fc7bb0faf))
* **lock:** setPin is enrollment-only (close PIN-overwrite bypass) ([d8f1a82](https://github.com/exodus-ai-org/exodus/commit/d8f1a823e68877609c477f48ed5757a477d05453))
* **lock:** show idle-timeout label (not value) in Select ([b71625f](https://github.com/exodus-ai-org/exodus/commit/b71625f65695aa6b6e7c256fa972c34a6c7f8e9e))
* **philharmonic:** compare-and-swap claim for due one-off tasks ([adc27f2](https://github.com/exodus-ai-org/exodus/commit/adc27f2406a4cca75c8e1af0f821adebf7081605))
* **philharmonic:** drawer header keeps close X; Cancel/Save move to footer ([f10b2c4](https://github.com/exodus-ai-org/exodus/commit/f10b2c406a4e0f99ff822cfb8ab5d0dc13dd873d))
* **philharmonic:** drawer's built-in X overlapped the header Cancel/Save ([7a5b4d4](https://github.com/exodus-ai-org/exodus/commit/7a5b4d44243cb9f613498efc888e6e6b3c971400))
* **philharmonic:** pin test timezone to UTC for deterministic local-time grouping ([5d91c18](https://github.com/exodus-ai-org/exodus/commit/5d91c18ed8ff1be27693f868e9f57fa7dcc8224b))
* **philharmonic:** reconcile orphaned running tasks on startup ([1d9a317](https://github.com/exodus-ai-org/exodus/commit/1d9a317c6765878274270ca1bf12bb9bfdf38b76))
* **philharmonic:** reject empty cronExpression, hide cancelled recurring tasks ([2b44b95](https://github.com/exodus-ai-org/exodus/commit/2b44b958e02944662c728569c25e947f277040c2))
* **philharmonic:** show last-run time, surface load errors, fix insert order ([d0c1104](https://github.com/exodus-ai-org/exodus/commit/d0c110481a02f71914c2f1fdbf8c8d65e4ea932c))
* **philharmonic:** stop scheduler sweep from double-firing one-off tasks ([beef927](https://github.com/exodus-ai-org/exodus/commit/beef9278980e5201dafdb8655db96799d81edcb3))
* **philharmonic:** use render prop for PopoverTrigger to avoid nested button elements ([50f8d6d](https://github.com/exodus-ai-org/exodus/commit/50f8d6de750ad72247ebb62dea5c74ede9d4fdb5))
* **plan:** guard POST /api/discover/refresh against a stuck 'refreshing' status ([13957a8](https://github.com/exodus-ai-org/exodus/commit/13957a81580f63226dbfff016738df7a9bda2a70))
* **react-doctor:** button types, unknown props, stable list keys ([5451fe7](https://github.com/exodus-ai-org/exodus/commit/5451fe79b7b778b6d94f5a3878fe69d93846ce2b))
* **react-doctor:** migrate effects to useEffectEvent + React 19 APIs ([848dc3a](https://github.com/exodus-ai-org/exodus/commit/848dc3af91333f684bcfab9a33367f5d5393dff9))
* **react-doctor:** resolve error-severity findings + exclude build output ([b68f80f](https://github.com/exodus-ai-org/exodus/commit/b68f80f5e093ebbe05cf42fa1249c4a630605f9f))
* **react-doctor:** small state-pattern and circular-dependency fixes ([dd62b1e](https://github.com/exodus-ai-org/exodus/commit/dd62b1ecbd25d08327d59b41ca8bfd37aa889e56))
* **routes:** wire RouteErrorBoundary onto settings and philharmonic routes ([f3cd3fa](https://github.com/exodus-ai-org/exodus/commit/f3cd3fa1908c75c99903386a3a8a7e4654d6b3e3))
* **search:** never let a bad Elasticsearch URL break chat (C1) ([012f67d](https://github.com/exodus-ai-org/exodus/commit/012f67d8d10419f8803a7b65ed2759c600b6a658))
* **search:** preserve ES relevance order, cache ES client, doc known invariants ([1846131](https://github.com/exodus-ai-org/exodus/commit/18461312ac3e96da52118392fe542ee6574e5974))
* **search:** repair Elasticsearch delete paths and add transport limits (C2, I1, I3) ([3b9273e](https://github.com/exodus-ai-org/exodus/commit/3b9273efe6acb9083dd9c660f75630da60face65))
* **search:** switch Elasticsearch settings toasts from sonner to sileo ([75cab96](https://github.com/exodus-ai-org/exodus/commit/75cab9658e4c4cde4f3c9cec8a92c72ca8d82152))
* **search:** test-connection reports fresh clusters as reachable ([402dc4b](https://github.com/exodus-ai-org/exodus/commit/402dc4b91e42285291f5623002fa407d3848887e))
* **settings:** surface backend errors from settings auto-save as toasts ([b3a419d](https://github.com/exodus-ai-org/exodus/commit/b3a419deee2f513960c0882729c3648b479cd0da))
* **ui:** rename calendar table classNames key to month_grid ([ddd4f5b](https://github.com/exodus-ai-org/exodus/commit/ddd4f5baf385a62a63a612220fd2d91a55d37aa1))


### Features

* **agent-x:** add ask-user pending registry for PM pause/resume ([11b5ba9](https://github.com/exodus-ai-org/exodus/commit/11b5ba9829df9822ac14d80fbe7070d2ee46876a))
* **agent-x:** add avatar style constants and seed helper ([1e15f88](https://github.com/exodus-ai-org/exodus/commit/1e15f88830a7ba5ecd7e32a9a86cdfc63cab930e))
* **agent-x:** add conversation and message queries ([2954ad9](https://github.com/exodus-ai-org/exodus/commit/2954ad9ca77b93c5d707288ef1e16e655cc427ef))
* **agent-x:** add conversation-scoped SSE channel ([f4bc19a](https://github.com/exodus-ai-org/exodus/commit/f4bc19a8249d876966188d0f0c3ec248adbe1984))
* **agent-x:** add employee recruit helper with auto-name and avatar ([1fc96d5](https://github.com/exodus-ai-org/exodus/commit/1fc96d55cdae2ae8b4f9149f69f861663bb5a2ef))
* **agent-x:** add knowledge base queries with stub search ([efed1ea](https://github.com/exodus-ai-org/exodus/commit/efed1eab8fd03c9e9fb225632943e8c7a422b4ea))
* **agent-x:** add neutral name pool for auto-recruited employees ([f75946d](https://github.com/exodus-ai-org/exodus/commit/f75946d704c5dfb78fbe96bd5fecad91d09f1773))
* **agent-x:** add PM coordinator loop with delegate/recruit/kb/askUser ([0b5fe08](https://github.com/exodus-ai-org/exodus/commit/0b5fe080c25029155d178e023588f53502f61e4e))
* **agent-x:** add PM delegate and recruit tools ([ae9e870](https://github.com/exodus-ai-org/exodus/commit/ae9e87000143282b094ac48cdcf6bd624585395e))
* **agent-x:** add searchKnowledgeBase tool (stub) ([aac705a](https://github.com/exodus-ai-org/exodus/commit/aac705ada1f5d9880f1ca01b5717c796fc714b82))
* **agent-x:** conversation SSE hook assembling live bubbles ([8da1fd5](https://github.com/exodus-ai-org/exodus/commit/8da1fd529ddc218645c2a28476818b60151dcbd2))
* **agent-x:** conversation/message/knowledge/costs routes + PM trigger ([bd4d7d8](https://github.com/exodus-ai-org/exodus/commit/bd4d7d83ca7cc4888d0a2099dba774b63a7f2fae))
* **agent-x:** deterministic employee avatars via dicebear ([89085d9](https://github.com/exodus-ai-org/exodus/commit/89085d9e98632ea26c33ea75d8f1a7554fb43ad7))
* **agent-x:** drop department, add conversation/message/knowledge schema ([f856408](https://github.com/exodus-ai-org/exodus/commit/f8564084b1ce7d4a7b7a2d5c946aad995071ca3c))
* **agent-x:** employee loop sources skills from agent, captures usage ([9d74a6a](https://github.com/exodus-ai-org/exodus/commit/9d74a6a22c4fd1ba4f113ccb0599bfcbfdaf87ad))
* **agent-x:** employees accumulate and reuse task memory ([8b38fc6](https://github.com/exodus-ai-org/exodus/commit/8b38fc6cfec550f9ec1af17109dd61a73e762cd3))
* **agent-x:** employees page and editor ([c14363c](https://github.com/exodus-ai-org/exodus/commit/c14363c1bd000c12d8312474411e238bdc2d602d))
* **agent-x:** extend SSE events for conversation streaming ([7eeafc1](https://github.com/exodus-ai-org/exodus/commit/7eeafc12e8610b5f096095366a56eaab04ba5f87))
* **agent-x:** group chat components (list, bubble, members, composer) ([2f146d5](https://github.com/exodus-ai-org/exodus/commit/2f146d598524b9fe301f29dd04d8d3eac127db37))
* **agent-x:** knowledge base page (stub CRUD) ([c79f818](https://github.com/exodus-ai-org/exodus/commit/c79f818abdf1f8079326430809d48270258dd3c2))
* **agent-x:** regenerate fresh migration baseline for chat redesign schema ([4f1e293](https://github.com/exodus-ai-org/exodus/commit/4f1e293352330ec6ff9acedd4268844b6280a8eb))
* **agent-x:** renderer services for chat, employees, knowledge, costs ([aa8a2e2](https://github.com/exodus-ai-org/exodus/commit/aa8a2e21b2a3e31fd71cad52786cfded6a9ff42d))
* **agent-x:** renderer stores for employees, conversations, chat ([0791d12](https://github.com/exodus-ai-org/exodus/commit/0791d12cb42d3f2bc89fc53eda6179ffda0a574f))
* **agent-x:** right-click delete on Groups and Employees ([7559025](https://github.com/exodus-ai-org/exodus/commit/75590254a500c6869d6f22ef07f74abcbbe45102))
* **agent-x:** scheduled tasks fire a new chat round via the PM loop ([86a822a](https://github.com/exodus-ai-org/exodus/commit/86a822a37b7f58e36cbea44e202b5b26983f6b3b))
* **agent-x:** smart row timestamps + click-to-rename group title ([f0c2871](https://github.com/exodus-ai-org/exodus/commit/f0c2871ca37253f0908f78b7fafa9533466fb71d))
* **agent-x:** Team as a first-class entity + MCP multi-select on employees ([189fc85](https://github.com/exodus-ai-org/exodus/commit/189fc85299d8fca6ee911349a7703d117c46ce1a)), closes [#3](https://github.com/exodus-ai-org/exodus/issues/3) [#4](https://github.com/exodus-ai-org/exodus/issues/4)
* **agent-x:** three-column chat layout, employees/knowledge pages, retire org UI ([b724eec](https://github.com/exodus-ai-org/exodus/commit/b724eecf59e1fb793bdc067aa7e8b1ee23311812))
* **agent-x:** unified Workforce page grouping employees by team ([55896b9](https://github.com/exodus-ai-org/exodus/commit/55896b9e11e5e99bafecd3cfd5a3856cc2883e56))
* **chat:** user-message TOC rail on the right of the conversation ([fef72d8](https://github.com/exodus-ai-org/exodus/commit/fef72d8c479a4131bce199c3601afc91ada3fd77))
* **computer:** /api/computer-use routes + global abort hotkey ([0c15779](https://github.com/exodus-ai-org/exodus/commit/0c157799183c0e89807b0fe29ba9ac9df66cb6bd))
* **computer:** agent opens the target app; Settings allowlist is an app picker ([274836f](https://github.com/exodus-ai-org/exodus/commit/274836f4af3c02015c7ad58684827639c584beeb))
* **computer:** chat panel for computerUse sessions + docs ([eda90d6](https://github.com/exodus-ai-org/exodus/commit/eda90d69f6a5a7e921267c95581ae8e59f99b5e6))
* **computer:** computerUse calling-tool + binding gate ([c9faffd](https://github.com/exodus-ai-org/exodus/commit/c9faffdf12115c3ac213f6020f13a55965279184))
* **computer:** exodus-input Swift helper (list-windows, screenshot, input) ([ded0baf](https://github.com/exodus-ai-org/exodus/commit/ded0baf9c185d0c66b8599624bb0926d22551681))
* **computer:** guard — coordinate clamp, abort, stuck detection ([f17aed1](https://github.com/exodus-ai-org/exodus/commit/f17aed190f81ef6c4cdbda012e6f7693b6584593))
* **computer:** hands — atom→primitive decomposition + coord mapping ([440e462](https://github.com/exodus-ai-org/exodus/commit/440e4627b5fb75d4213961a8e0736d8018502b1a))
* **computer:** inner-loop agent — action tools, Claude agent, screenshot trim ([9aa49f9](https://github.com/exodus-ai-org/exodus/commit/9aa49f95cc67ae9d8d37bc61db2a801c272263a5))
* **computer:** model-facing action space — 11 human verbs ([5e270bd](https://github.com/exodus-ai-org/exodus/commit/5e270bd29257591cee2c9785a50b7877a969122a))
* **computer:** Runtime types + exodus-input client (+ mock) ([21374c0](https://github.com/exodus-ai-org/exodus/commit/21374c08ac4b172615a4e3dee6f58c7b7119fea0))
* **computer:** Settings → Computer Use page ([d502ed7](https://github.com/exodus-ai-org/exodus/commit/d502ed73753717da4c766efff345f077280bdf63))
* **computer:** settings schema + computerUse column + logger surface ([7b29eee](https://github.com/exodus-ai-org/exodus/commit/7b29eee45897ba0fb6c634e461f109ebb72074b1))
* **computer:** target-window resolution + bounds refresh ([f01062b](https://github.com/exodus-ai-org/exodus/commit/f01062b862b00201e7a254b0951710942f0d091b))
* **computer:** the perceive→act session loop ([78127fb](https://github.com/exodus-ai-org/exodus/commit/78127fbf66f64d0fe7fdd05568ef4eda984d3b4f))
* **computer:** window capture + downscale to ≤1400px ([351a5d6](https://github.com/exodus-ai-org/exodus/commit/351a5d6b9456f1a9d11cf4f26ba5d5f57d0a422e))
* **discover:** /api/discover router ([b296be8](https://github.com/exodus-ai-org/exodus/commit/b296be8bd65fba79eec80d9e9106d501d7f60720))
* **discover:** Brave News Search client ([5288a0d](https://github.com/exodus-ai-org/exodus/commit/5288a0dccc7bfe314b18691e01f0fcfa62d3293d))
* **discover:** discover-queries singleton cache row ([d44d3ac](https://github.com/exodus-ai-org/exodus/commit/d44d3ac3d1e49ede38d11a8cfe28f5a7d22bc903))
* **discover:** discover-refresh queue + periodic check ([7c74ce2](https://github.com/exodus-ai-org/exodus/commit/7c74ce25a4589c044ada5af5f56acbb903c2438a))
* **discover:** keep the welcome page pristine when the feed is empty ([ab737f3](https://github.com/exodus-ai-org/exodus/commit/ab737f3993fe5c294b8d3a4307bc80a95b2f3d5e))
* **discover:** link the no-Brave-key hint to the Built-in Tools page ([c3826bf](https://github.com/exodus-ai-org/exodus/commit/c3826bfb2cd28cf30d8ec61a3810c0f308116f71))
* **discover:** memory-driven query generation + runDiscoverRefresh ([5cec687](https://github.com/exodus-ai-org/exodus/commit/5cec687a1a554649a934dc39752b4a4f9175608b))
* **discover:** renderer service ([ecb075a](https://github.com/exodus-ai-org/exodus/commit/ecb075ab542361ad5cd4ec63593a1f117be9fea8))
* **discover:** Settings -> Discover page ([01b40bb](https://github.com/exodus-ai-org/exodus/commit/01b40bb7f97a6ba9fc0ee39d19157f1b60440855))
* **discover:** settings + discover_feed schema ([2b7c36a](https://github.com/exodus-ai-org/exodus/commit/2b7c36af28193c499c2906e2180c77e8e86f59fb))
* **discover:** show the Discover feed on the true home route only ([3eeb41a](https://github.com/exodus-ai-org/exodus/commit/3eeb41a782cf087be0b777120bdfc5293ae571e8))
* **discover:** surface feed status + move manual refresh to the home feed ([53b4e70](https://github.com/exodus-ai-org/exodus/commit/53b4e7021b00ef3fc2abb5a356470f91a05fd1c4))
* **discover:** use CompassIcon for the Settings -> Discover entry ([94df221](https://github.com/exodus-ai-org/exodus/commit/94df221083f64e86f4ef5dc23005743565211cd3))
* **jobs:** add per-queue job handlers wrapping existing logic ([9c7cd2b](https://github.com/exodus-ai-org/exodus/commit/9c7cd2b58ca599b8fa26ab3a76eab56fa93dccae))
* **jobs:** add worker loop with retry/give-up and wire into app startup ([7a3b894](https://github.com/exodus-ai-org/exodus/commit/7a3b8947bc29a96bab4640451b5260e13e5ac2a4))
* **jobs:** register pgmq extension and add queue primitives ([86b5c67](https://github.com/exodus-ai-org/exodus/commit/86b5c67c4c6be68a02481c226c9412d1124596a3))
* **jobs:** rewire chat.ts post-turn side effects onto the job queue ([a43b36c](https://github.com/exodus-ai-org/exodus/commit/a43b36c941a45cc92be18f6b130c9c8aff40d079))
* **kb:** /api/knowledge-base router, drop philharmonic /knowledge routes ([ffd3c49](https://github.com/exodus-ai-org/exodus/commit/ffd3c4966248a956aa66155138ccf905e5a266cd))
* **kb:** add an explanatory Alert to Settings -> Knowledge Base ([8df68fb](https://github.com/exodus-ai-org/exodus/commit/8df68fb4664df94b7c8f01646b61e910b4dce176))
* **kb:** bind searchKnowledgeBase in chat + philharmonic, drop team-scope ([1b07508](https://github.com/exodus-ai-org/exodus/commit/1b07508ef3173112a06249830d6b811fc91886fa))
* **kb:** kb-sync queue + handler + index-status reconciler ([726e892](https://github.com/exodus-ai-org/exodus/commit/726e892dcf8011a76db5c75eb98972a44bb0b639))
* **kb:** knowledge-queries sync helpers, drop substring stub ([4414ddb](https://github.com/exodus-ai-org/exodus/commit/4414ddb503993014304eab951a35ce8032eebb03))
* **kb:** LightRAG HTTP client ([9a49c18](https://github.com/exodus-ai-org/exodus/commit/9a49c184679dc7e44894167cc7e399a8987312f3))
* **kb:** resolveKnowledgeBase (cached, never-throws) ([4fde117](https://github.com/exodus-ai-org/exodus/commit/4fde117ddbc12c98f87a423859515b8a2d9bba04))
* **kb:** searchKnowledgeBase retrieval tool ([360a3fd](https://github.com/exodus-ai-org/exodus/commit/360a3fd150164c3cdc80f7f578942cb9c6df13ff))
* **kb:** Settings -> Knowledge Base page + drop Philharmonic KB nav ([febc0fe](https://github.com/exodus-ai-org/exodus/commit/febc0fe31177c0eaf65d1897649e90480b9589ca))
* **kb:** settings + knowledge_doc schema for LightRAG sync ([4422ea2](https://github.com/exodus-ai-org/exodus/commit/4422ea26d14fd1eca5945f9132ee11bb8053ed64))
* **kb:** shared KnowledgeDocData type + renderer service ([3e384b6](https://github.com/exodus-ai-org/exodus/commit/3e384b659c3f9156c80c6005aa5ff114ef4f05a0))
* **lock:** 423 lock-gate middleware on all API routes ([8734166](https://github.com/exodus-ai-org/exodus/commit/87341660d0974959110c48c8ca50fbe301428721))
* **lock:** idle watcher with activity-reset timeout ([ea13e27](https://github.com/exodus-ai-org/exodus/commit/ea13e27e216246337fc3c576fe46b42f2ef862f9))
* **lock:** Lock & Privacy settings section ([4796583](https://github.com/exodus-ai-org/exodus/commit/4796583dcaa178ed432c40f18bd0551b5cf4caf8))
* **lock:** lock file path helpers ([510f52f](https://github.com/exodus-ai-org/exodus/commit/510f52f586c09b536297098200ba8b0a31214f91))
* **lock:** Lock Now menu item (CmdOrCtrl+L) ([c26cc0c](https://github.com/exodus-ai-org/exodus/commit/c26cc0c864cc27c5dc28266deb858a8f754b4484))
* **lock:** lock screen UI with PIN pad, Touch ID, and feed ([18d868d](https://github.com/exodus-ai-org/exodus/commit/18d868dc8a180c12c7ae9b6c3f1dfee689064b40))
* **lock:** lock-screen notification ring buffer ([75508aa](https://github.com/exodus-ai-org/exodus/commit/75508aa7314dff0a18a8379658cb016d4d8601fd))
* **lock:** LockManager state machine with attempt backoff ([cc8ee95](https://github.com/exodus-ai-org/exodus/commit/cc8ee95793c6dc266579baa86a1456624e8976e5))
* **lock:** main-process lock IPC handlers ([3cce628](https://github.com/exodus-ai-org/exodus/commit/3cce6286f9209e3a36ad9915810b399c8a26ab0a))
* **lock:** mask PIN digits with dots (iPhone-style) ([124c1d9](https://github.com/exodus-ai-org/exodus/commit/124c1d9dc53b3acd0c3a4e38fa68dc672f261a40))
* **lock:** non-secret lock config store ([c59631c](https://github.com/exodus-ai-org/exodus/commit/c59631c65dba07d8a66da5e0b3e721115753da53))
* **lock:** PIN store with scrypt hashing and safeStorage ([47f1249](https://github.com/exodus-ai-org/exodus/commit/47f1249ffef6062f88074c0dd0ddf20699edbddf))
* **lock:** renderer lock IPC, store, and hook ([dbc33fd](https://github.com/exodus-ai-org/exodus/commit/dbc33fd8c352850f591f901a40704a2e12d5a0ff))
* **lock:** shared lock types and IPC channel constants ([9967c5e](https://github.com/exodus-ai-org/exodus/commit/9967c5ece9da8657d4236e37c288fed11ea8ff68))
* **lock:** two-step PIN enrollment (auto-advance to confirm) ([2fb8074](https://github.com/exodus-ai-org/exodus/commit/2fb80740c1621364aac4c952a46fb19a9e10fd09))
* **lock:** wire launch/idle/sleep lock triggers at startup ([d6ecdf4](https://github.com/exodus-ai-org/exodus/commit/d6ecdf4162dd4e1bb0effef4f2e58ac0169a91dd))
* **logger:** /api/logs severity+scope+traceId filters and /scopes ([f0eddcb](https://github.com/exodus-ai-org/exodus/commit/f0eddcb05f039d2d96981255c331052fc80fec2e))
* **logger:** AsyncLocalStorage trace context ([db74259](https://github.com/exodus-ai-org/exodus/commit/db7425994d4d29804951025b8c048bb21d0df44c))
* **logger:** bind chatId/researchId/queueName to their traces; docs ([0b96763](https://github.com/exodus-ai-org/exodus/commit/0b96763792e5110f588da7a2672025f80b4919a0))
* **logger:** LogRecord shape + severity/exception/legacy mapping ([c9bb21f](https://github.com/exodus-ai-org/exodus/commit/c9bb21f0c2f59e9d20da9acd3654690763e6a63c))
* **logger:** OTel Resource module ([67f3154](https://github.com/exodus-ai-org/exodus/commit/67f31545e32645cf3f40740eeebd95ed2e44aee2))
* **logger:** OTel-shaped records + trace ids; logger.ts -> logger/ ([258f342](https://github.com/exodus-ai-org/exodus/commit/258f342aa09d83ef5eb6598eb0860eba96b1a1b6))
* **logger:** standardized log table + scope filter + trace pivot ([057a55d](https://github.com/exodus-ai-org/exodus/commit/057a55d1e35571bb00e212ea15111e7d6684c92b))
* **logger:** trace every /api request ([c7bb6c3](https://github.com/exodus-ai-org/exodus/commit/c7bb6c3e872c98d124dc8aadbbab094ed759102d))
* **logger:** trace jobs + scheduler; thread origin trace id through the queue ([2772080](https://github.com/exodus-ai-org/exodus/commit/2772080a77ecf32ad219a109df2380039e7097b7))
* **mcp:** support multiple ordered args per MCP server ([8047ffa](https://github.com/exodus-ai-org/exodus/commit/8047ffa2de682f48ecc1957cc8853d7a4db2efb4))
* Philharmonic layout parity, Memory v2, settings IA cleanup ([f184d85](https://github.com/exodus-ai-org/exodus/commit/f184d85639393d57d410b9293923f84699a924f0))
* **philharmonic:** add day-grouping helper for the schedule agenda ([ece15e8](https://github.com/exodus-ai-org/exodus/commit/ece15e8af7ed47dc0a81ddec5dc5bd59eb61a6c7))
* **philharmonic:** add RecurringList to the schedule agenda ([1598b3f](https://github.com/exodus-ai-org/exodus/commit/1598b3f686cad5c99cc862259107556c5019c0cf))
* **philharmonic:** add ScheduleTab composing the agenda + create form ([2773ed9](https://github.com/exodus-ai-org/exodus/commit/2773ed9bc76abeb27c6af52761a776b04f49249b))
* **philharmonic:** add ScheduleTaskForm (one-off + recurring create) ([455aba6](https://github.com/exodus-ai-org/exodus/commit/455aba6b19ee3a866191b13d1be104a628939223))
* **philharmonic:** add task.runAt for one-off scheduling ([66f3bb1](https://github.com/exodus-ai-org/exodus/commit/66f3bb1edf8939b213ed456a10a6c598e6a9c3bb))
* **philharmonic:** add TaskCard for the schedule agenda ([eca351e](https://github.com/exodus-ai-org/exodus/commit/eca351ef1747f23bce354c61cd62d7d3b893679d))
* **philharmonic:** add TaskData type and task scheduling service ([8d95afa](https://github.com/exodus-ai-org/exodus/commit/8d95afa533f28fcffff2914afcbc3b33e96b0505))
* **philharmonic:** add upcoming/due one-off task queries ([b980058](https://github.com/exodus-ai-org/exodus/commit/b9800583e1ebe7eccb3a54c3df89e655e4f2fb32))
* **philharmonic:** add UpcomingList to the schedule agenda ([d9b73d4](https://github.com/exodus-ai-org/exodus/commit/d9b73d441337be46377079fbfe874c676ac1af55))
* **philharmonic:** chat header, asymmetric bubbles, sticker tool cards ([ac5f050](https://github.com/exodus-ai-org/exodus/commit/ac5f0507b6d0a8964a72051b032a9157688c82f1))
* **philharmonic:** composer with sunken band and primary send ([8c06236](https://github.com/exodus-ai-org/exodus/commit/8c06236d0dce3fcb6245155637a87ed3bc4a4103))
* **philharmonic:** conversation list redesign + shared empty state ([5aa6887](https://github.com/exodus-ai-org/exodus/commit/5aa688778e083ccf3264172ed39842f540293061))
* **philharmonic:** dashboard redesign ([7960665](https://github.com/exodus-ai-org/exodus/commit/7960665f11a1f7cab3bac05e06e8f44665d3740c))
* **philharmonic:** design tokens, hue helper, motion constants ([fb1a5d7](https://github.com/exodus-ai-org/exodus/commit/fb1a5d79cd9bedf08e14545890552f39219432ba))
* **philharmonic:** editor drawer with sticky CTAs and labeled fields ([30f3d32](https://github.com/exodus-ai-org/exodus/commit/30f3d32f2ff31988b6995182f71f225aef98a773))
* **philharmonic:** knowledge base page redesign ([edac002](https://github.com/exodus-ai-org/exodus/commit/edac0022d4c05d29190d8d40968f65aea94098c4))
* **philharmonic:** members panel grouped by team with status summary ([cf0d252](https://github.com/exodus-ai-org/exodus/commit/cf0d2526247f2b7726377e756c6f96699675aa33))
* **philharmonic:** P0-1 scope Knowledge Base to Team ([cb01bbe](https://github.com/exodus-ai-org/exodus/commit/cb01bbe740343ac520aa413620c573a5979e92df))
* **philharmonic:** P0-2 execution plan as first-class artifact ([078f9e3](https://github.com/exodus-ai-org/exodus/commit/078f9e3daec344599073f2ed790404e6dc042ab5))
* **philharmonic:** P0-2.5 background-safe rejoin, notifications, retry, toasts ([1d0f3da](https://github.com/exodus-ai-org/exodus/commit/1d0f3da048a9db2098dd4772eeef4da57c1dc2cd))
* **philharmonic:** P0-2.6 composer image upload with S3 + base64 dual engine ([1da5ec9](https://github.com/exodus-ai-org/exodus/commit/1da5ec975e2616cec54b19c4f77dab14da7d83d7))
* **philharmonic:** P0-3 lossless context management ([7c6d534](https://github.com/exodus-ai-org/exodus/commit/7c6d534ac8bf1c324b365d8d3b39e2da80f672e4))
* **philharmonic:** P1-4 isolate agent memory per Group ([d1ca8a0](https://github.com/exodus-ai-org/exodus/commit/d1ca8a0daabb70034ff8d45c8d96d42800e57951))
* **philharmonic:** P1-5 live busy state in the members panel ([54809ee](https://github.com/exodus-ai-org/exodus/commit/54809eec3b8956f94ae3acccadd81789b4b17c95))
* **philharmonic:** P1-6 interrupt a running Group ([1a7a2ee](https://github.com/exodus-ai-org/exodus/commit/1a7a2ee984eb0373bad6d5a2274b8e7f1e87f8c6))
* **philharmonic:** P1-7 artifact-rendered final report ([c1cfeb0](https://github.com/exodus-ai-org/exodus/commit/c1cfeb0f60514306d34634beeb8ed51e24fc4c35))
* **philharmonic:** sweep and fire due one-off scheduled tasks ([1d4f8ea](https://github.com/exodus-ai-org/exodus/commit/1d4f8ea165bed6db4b85ddd5c513cbd71ea7cc28))
* **philharmonic:** task scheduling API (upcoming/recurring/create/cancel) ([e840e75](https://github.com/exodus-ai-org/exodus/commit/e840e757891146beaedebdb60746a581ab6b02a3))
* **philharmonic:** three floating column cards on warm canvas ([03bdffc](https://github.com/exodus-ai-org/exodus/commit/03bdffc626bd7ee25042b13f07066d5881b88d3c))
* **philharmonic:** wire Schedule tab into Dashboard + test ids + docs ([4852f22](https://github.com/exodus-ai-org/exodus/commit/4852f22b51b488a04420d2e4a73d2a89751602c4))
* **philharmonic:** workforce page redesign ([ade9b2d](https://github.com/exodus-ai-org/exodus/commit/ade9b2daa93bb04160699a45d11c01f2ff002a8c))
* **philharmonic:** wrap EmployeeAvatar in a stable hue ring ([99dab6e](https://github.com/exodus-ai-org/exodus/commit/99dab6e12769ec57481c21c38a8d503f7279cb5f))
* **providers:** refresh model catalog to latest provider lineups ([6bc2ae0](https://github.com/exodus-ai-org/exodus/commit/6bc2ae0222a17ccad6cb1c64f91901dbaa862723))
* **search:** add Elasticsearch provider ([1ba0e7e](https://github.com/exodus-ai-org/exodus/commit/1ba0e7ed9461b55e4f8f1490f0f1a157a3a1e1c5))
* **search:** add Elasticsearch settings schema and column ([5007fc5](https://github.com/exodus-ai-org/exodus/commit/5007fc534f5ecd36fd856c05cdaa481758d44518))
* **search:** add Elasticsearch test-connection and reindex routes ([93ff678](https://github.com/exodus-ai-org/exodus/commit/93ff67817cd726451beb17ead4528c8355808f55))
* **search:** add Search settings tab with test-connection and reindex actions ([54e44ea](https://github.com/exodus-ai-org/exodus/commit/54e44ead6c2c91e59847270d3b558223e11009fa))
* **search:** add SearchProvider interface and PGlite provider ([48025ef](https://github.com/exodus-ai-org/exodus/commit/48025ef02f9db44fec2e34d8892bd85505f7a775))
* **search:** add searchText column, backfill migration, extractSearchableText ([78ed15a](https://github.com/exodus-ai-org/exodus/commit/78ed15a86f25ecacb862422711f78864306529f8))
* **search:** switch PGlite full-text search to pg_trgm substring matching ([ff8bf0b](https://github.com/exodus-ai-org/exodus/commit/ff8bf0bad6110a44d95876ad4f33c00daae5e36e))
* **search:** wire resolveSearchProvider into chat routes with fallback ([6806049](https://github.com/exodus-ai-org/exodus/commit/6806049f8cf45cd983ec126153cf903169b8a319))
* **settings:** rename Search tab to Elasticsearch, add explanatory alert ([9cffe3f](https://github.com/exodus-ai-org/exodus/commit/9cffe3f8169a855f670a8e953f8f4a207a910a55))
* **testids:** apply lock checkpoints to lock UI ([19615ad](https://github.com/exodus-ai-org/exodus/commit/19615adb30e102e0b64d35ad0933bfec97559dac))
* **testids:** typed TEST_IDS registry + flatten helper ([1336f41](https://github.com/exodus-ai-org/exodus/commit/1336f415b56328bc2f97f12e288ec49d61abf554))
* **websearch:** collectGalleryImages helper ([9d2e543](https://github.com/exodus-ai-org/exodus/commit/9d2e5430db9bd9357226b8861691ae1116d0395a))
* **websearch:** collectGalleryVideos helper ([9b743be](https://github.com/exodus-ai-org/exodus/commit/9b743be7b16db25fa29d06f49bf9f519357983bd))
* **websearch:** favicon + site-name citation badge with thumbnail card ([1370e8e](https://github.com/exodus-ai-org/exodus/commit/1370e8e3101af90c1e5448b8eae40a14b565b384))
* **websearch:** inline image gallery + lightbox ([7d6ba39](https://github.com/exodus-ai-org/exodus/commit/7d6ba39bb48ecec7608ca74d8f21ab46fe779517))
* **websearch:** inline video cards ([7c0cd27](https://github.com/exodus-ai-org/exodus/commit/7c0cd276ac35c4bd28d23192d95f3ba0530cd9a7))
* **websearch:** optional source-metadata fields on WebSearchResult ([c78d053](https://github.com/exodus-ai-org/exodus/commit/c78d05337e8888d7d9f55edf18340d597ca57c76))
* **websearch:** request + map Brave source metadata ([12894ec](https://github.com/exodus-ai-org/exodus/commit/12894ecd157b8ae0e8c314353ac133d63977e505))
* **websearch:** SourceFavicon with Brave→Google fallback ([abb0c18](https://github.com/exodus-ai-org/exodus/commit/abb0c18b81aefe6142be2e50497c333120f02462))
* **websearch:** Sources panel favicon/site-name/thumbnail parity ([019952a](https://github.com/exodus-ai-org/exodus/commit/019952a8754263cba23ff84f5c7a1a558eab759d))
* **window:** increase default/min window size to 1280x820 ([f5f7edd](https://github.com/exodus-ai-org/exodus/commit/f5f7edd5923bfdcf75e582f45eaf96137ee6ebce))
* **workforce:** teams first, employees must belong to one, save before commit ([1b1812c](https://github.com/exodus-ai-org/exodus/commit/1b1812cac5f5b8807b177fa142d86c7e4f7e293e))


### Performance Improvements

* **react-doctor:** lazy imports + rerender fixes ([eeb9d35](https://github.com/exodus-ai-org/exodus/commit/eeb9d35d3712a7f2e709d9f7d33cdee4e7cb7aaf))
* **react-doctor:** mechanical performance fixes (js-*, barrel imports, context values) ([e1a50d6](https://github.com/exodus-ai-org/exodus/commit/e1a50d6aa81b6d6ed91ff300b7c75aa884945a83))
* **search:** bulk-index during reindex instead of one document at a time ([d416e1b](https://github.com/exodus-ai-org/exodus/commit/d416e1be4c5dc6b0765c3ae388b2082f83c36edf))

# [1.13.0](https://github.com/exodus-ai-org/exodus/compare/v1.12.1...v1.13.0) (2026-05-27)


### Bug Fixes

* **artifacts:** use automatic JSX runtime in sandbox ([957532c](https://github.com/exodus-ai-org/exodus/commit/957532c525253bc3871fd92b436c7f2b59974af4))
* **chat:** surface provider errors instead of saving empty assistant message ([36c80f1](https://github.com/exodus-ai-org/exodus/commit/36c80f1fc9a7e073284df34ca6febf2a685c5bc0))
* **ci:** bring up electron under xvfb on ubuntu and healthcheck the server ([a567da6](https://github.com/exodus-ai-org/exodus/commit/a567da6738327d07703884e8354d2df5d0588903))
* **e2e:** drop dev-only goto, fix sidebar locator, skip when no API key ([9b81d94](https://github.com/exodus-ai-org/exodus/commit/9b81d941ccee7a48fafa0c04e6dc1fb5b885050b))
* **lcm:** align LcmStatusCard width with chat column ([0a10133](https://github.com/exodus-ai-org/exodus/commit/0a10133a5a6fc015a833cbeec9a53a9c341cf392))


### Features

* **lcm:** add /api/lcm/:chatId/status SSE endpoint ([5538fd0](https://github.com/exodus-ai-org/exodus/commit/5538fd024d22b5f986af0686dc3f29a4e3be9bb5))
* **lcm:** add LcmStatusBus for compaction visibility events ([300a6ba](https://github.com/exodus-ai-org/exodus/commit/300a6badb19c34b189a9699f4bfe2b8928b453f0))
* **lcm:** add LcmStatusCard component ([689aef1](https://github.com/exodus-ai-org/exodus/commit/689aef19840ffe5bdea446a9bee3316bba98922d))
* **lcm:** add useLcmStatus hook for SSE subscription ([ce6d04e](https://github.com/exodus-ai-org/exodus/commit/ce6d04e677f0a60b7049269a627a97b33d78fcd0))
* **lcm:** emit start/complete/error events from runCompactionIfNeeded ([9c31899](https://github.com/exodus-ai-org/exodus/commit/9c318995cbb38a3f48fd4754caffd4c10182d221))
* **lcm:** mount LcmStatusCard between messages and composer ([72ed778](https://github.com/exodus-ai-org/exodus/commit/72ed77817903104959a991e94a71eac2e6529eac))
* map bounds dynamic padding, MCP tool markdown, MCP extra config ([760be8d](https://github.com/exodus-ai-org/exodus/commit/760be8d3edf1593a6bc60b15cd008d0761d1b056))
* skill injection, drawio inline render, toast/logger fixes ([961e8ee](https://github.com/exodus-ai-org/exodus/commit/961e8ee63e5bac13e20f74fb5850f496f182bf87))
* SVG tray icon pipeline, tray context menu, speech rate placeholder ([6a3a702](https://github.com/exodus-ai-org/exodus/commit/6a3a7023780fa9d3f955696917de0bede08bbf54))
* unified mapItinerary tool, refreshed markdown styling, sidebar history fix ([193e8b0](https://github.com/exodus-ai-org/exodus/commit/193e8b0515eab22bba35016a15dde30e2e244ef3))
* webSearch images/videos, Places-enriched mapItinerary ([2e9310a](https://github.com/exodus-ai-org/exodus/commit/2e9310adcc926184104943d3b95780da0fe50cfc))

## [1.12.1](https://github.com/exodus-ai-org/exodus/compare/v1.12.0...v1.12.1) (2026-04-28)


### Bug Fixes

* **e2e:** unblock playwright suite on macos CI ([6c104cb](https://github.com/exodus-ai-org/exodus/commit/6c104cbf9a6e87f11e00bfaa981c99cd630f5a9b))

# [1.12.0](https://github.com/exodus-ai-org/exodus/compare/v1.11.0...v1.12.0) (2026-04-28)


### Bug Fixes

* artifact sandbox crash — remove ThemeProvider IPC dependency ([15d102f](https://github.com/exodus-ai-org/exodus/commit/15d102ff40829459e025a4650fc33f391960bccf))
* **artifact:** handshake so fullscreen stops stranding on "Waiting for artifact…" ([5a47f00](https://github.com/exodus-ai-org/exodus/commit/5a47f00601fedeaae226a980f2e024a9f86d4d43))
* **artifact:** plumb chatId from chat route to the card via props, stop relying on details.chatId ([c47aac7](https://github.com/exodus-ai-org/exodus/commit/c47aac740e4b005f5a5e861697e404ddfc864e32))
* **artifact:** post-review hardening — path traversal guard, remove double padding, disable URL pill for pre-chatId artifacts ([188d098](https://github.com/exodus-ai-org/exodus/commit/188d098fc6799ce172c59e05d08b547ca6640457))
* **artifact:** reveal handler returns result, fall back to legacy shared/ path, toast on failure ([5db0d38](https://github.com/exodus-ai-org/exodus/commit/5db0d38f249315cc6e308da780f359285ad28f63))
* **artifact:** thread real chatId into createArtifact tool ([c15f4d0](https://github.com/exodus-ai-org/exodus/commit/c15f4d0c9f3b5f6661fb48faf8a4ca7bcc1ac5ba))
* **build:** unblock pnpm build by fixing long-masked type errors ([a440f4c](https://github.com/exodus-ai-org/exodus/commit/a440f4c3973cb8ef63f81be53c52f68d076b047a))
* remove WebSearch from AdvancedTools toggle and fix settings save 500 ([360912a](https://github.com/exodus-ai-org/exodus/commit/360912a4ddb4e5dda8fc98d81c719dfbbddbb96d))
* replace removed ChromeIcon with GlobeIcon for browser use setting ([e127784](https://github.com/exodus-ai-org/exodus/commit/e127784b6202e83a21e2a770e84f898f36e82a25))
* **tools:** make chatId optional in bindCallingTools; skip createArtifact for Agent X ([31f321b](https://github.com/exodus-ai-org/exodus/commit/31f321be8de04c151be02a746685659eb896de7c))
* UI improvements — markdown spacing, chat routing, spinner, timeline ([915230d](https://github.com/exodus-ai-org/exodus/commit/915230dfe769019e3e3b801859861ca39cdbd231))
* use undici ProxyAgent for main-process proxy support ([5ea1e16](https://github.com/exodus-ai-org/exodus/commit/5ea1e1692c3cb32db25cd91a79d861e859771920))


### Features

* add Artifacts — live React component rendering in chat ([97f4522](https://github.com/exodus-ai-org/exodus/commit/97f4522af45d573d37933f68b1568331d03130c4))
* add centralized paths module for ~/.exodus directory ([159e086](https://github.com/exodus-ai-org/exodus/commit/159e0863d40ee61e846625f5a26b4cd0d8b793cb))
* add network proxy configuration in Settings → General ([26d667d](https://github.com/exodus-ai-org/exodus/commit/26d667d450ba1285c4dd12fbb5f0414d4c327f65))
* add placeholder to settings ([100d358](https://github.com/exodus-ai-org/exodus/commit/100d358ba4ae3157be0f13a2057a3b64e9af7458))
* **artifact:** add reveal-artifact-file IPC handler ([ec4340f](https://github.com/exodus-ai-org/exodus/commit/ec4340f10f009e9c164c9a0f44573468392dbcb1))
* **artifact:** add revealArtifactFile renderer wrapper ([3a050be](https://github.com/exodus-ai-org/exodus/commit/3a050be7f74d7b80d3899fdfdd62ee512a17be99))
* **artifact:** add slug and short-id helpers ([b13af32](https://github.com/exodus-ai-org/exodus/commit/b13af32de731cf96f03168c095cb28a618d789df))
* **artifact:** decorative traffic lights, right-side fullscreen button, native-fullscreen padding ([eb29c2d](https://github.com/exodus-ai-org/exodus/commit/eb29c2d58a8ed278db6779f0eb47fc714a02f1d2))
* **artifact:** expose framer-motion and steer prompt toward distinctive aesthetics ([1d0ae4f](https://github.com/exodus-ai-org/exodus/commit/1d0ae4f012b84a182efe867400990dfd5c5518b8))
* **artifact:** migrate legacy shared/ layout on startup; drop the reveal fallback ([8fb1a27](https://github.com/exodus-ai-org/exodus/commit/8fb1a2736fd74afbc1f623aa9e9d836708ec19d4))
* **artifact:** replace card header with browser-chrome traffic lights ([285f10e](https://github.com/exodus-ai-org/exodus/commit/285f10e7cfcc46046de5a78e264e274414735c5b))
* background chat streaming with completion toast ([64a35c4](https://github.com/exodus-ai-org/exodus/commit/64a35c41236e00387f7b06e495ba162b59750ea0))
* implement data controls with ~/.exodus migration, backup engine, and full UI ([518c7c1](https://github.com/exodus-ai-org/exodus/commit/518c7c1dc23fdd6db8763bf6610054c2ec6373a4))
* implement Run on startup and Menu bar settings ([d9341f5](https://github.com/exodus-ai-org/exodus/commit/d9341f5db0089c5c886fbc5a53d010d14e751ef8))
* optimize chat flow with overflow detection, parallelization, and cross-provider normalization ([430bdff](https://github.com/exodus-ai-org/exodus/commit/430bdffbe03141391833866ddb2d506bb6f19108))
* **terminal:** steer toward Node + npx, halt on missing deps instead of auto-installing ([09af4b4](https://github.com/exodus-ai-org/exodus/commit/09af4b49038fa73569b8a6c7afa31a1dd260d833))
* **timeline:** render terminal commands in a monospace code block ([f89e668](https://github.com/exodus-ai-org/exodus/commit/f89e66888e856e8e1826919d1b232b2303dcbb69))
* **timeline:** show the key argument next to tool calls (url for webFetch, command for terminal, path for file ops, etc.) ([3520f0b](https://github.com/exodus-ai-org/exodus/commit/3520f0b05f75ff6496eda1df86dbba76e69622e5))

# [1.11.0](https://github.com/exodus-ai-org/exodus/compare/v1.10.0...v1.11.0) (2026-03-27)


### Bug Fixes

* add @electron-toolkit/utils mock to tests for logger compatibility ([762b515](https://github.com/exodus-ai-org/exodus/commit/762b515abd28f5b73f3de8140a3143a03b0c50de))
* add statement-breakpoint markers to migration 0007 ([dc449ce](https://github.com/exodus-ai-org/exodus/commit/dc449ce8753e3b93e0e34cc58dd1fd1f6afc8ede))
* Agent X graph — dept→agent connection and delete crash ([c0e5830](https://github.com/exodus-ai-org/exodus/commit/c0e5830f5ec356395fbb654b11809b202b854f3d))
* align DB schema with pi-ai types, fix persistence and cleanup ([55accc0](https://github.com/exodus-ai-org/exodus/commit/55accc06b331b64a5a71ac3cdf08e16f3958a645))
* correct usage/cost tracking and event handling in chat stream ([48e94dc](https://github.com/exodus-ai-org/exodus/commit/48e94dcabc7725b5dcb3a9b4b68894c66a390e30))
* exclude pi-mono ESM packages from externalization in electron-vite ([a3b4832](https://github.com/exodus-ai-org/exodus/commit/a3b4832c0c4746a66822cecb8da34c1ba3d5df31))
* extract error message from response body in useChat ([7e34982](https://github.com/exodus-ai-org/exodus/commit/7e34982feb0b729b621f8a7a4510c304dcd84303))
* improve error handling with user-friendly messages ([c3ae262](https://github.com/exodus-ai-org/exodus/commit/c3ae262cc4312980d9e18bf7d519b6470bf9dad7))
* optimize React renderer perf and fix quick-chat/searchbar sub-apps ([ab3022a](https://github.com/exodus-ai-org/exodus/commit/ab3022af5947e94ccb792444fb96c8c40e15a063)), closes [hi#frequency](https://github.com/hi/issues/frequency)
* remove debug fs.writeFileSync from chat streaming ([a60bfb5](https://github.com/exodus-ai-org/exodus/commit/a60bfb5eae26d98643e68688b120235c74e3d93d))
* simplify scroll-to-bottom logic, stop auto-scroll during streaming ([85abdcf](https://github.com/exodus-ai-org/exodus/commit/85abdcfe637e33e93c32a24c1275711b24227451))
* three LCM correctness bugs ([f3fdd6e](https://github.com/exodus-ai-org/exodus/commit/f3fdd6e908e971fa238961385fc721a5d44503d1))
* use base-ui data-panel-open for collapsible chevron rotation ([c561664](https://github.com/exodus-ai-org/exodus/commit/c561664ac3c399e93421900ba85e9d728c90841d))


### Features

* add Agent X dashboard with sidebar navigation and metrics ([b3eda39](https://github.com/exodus-ai-org/exodus/commit/b3eda394dde3c7dc286d832aaa6addccc4205fae))
* add color tone picker with persistence and flash-prevention ([4d1e88c](https://github.com/exodus-ai-org/exodus/commit/4d1e88ceaea3ad2ebf997753a0c5e4e247012707))
* add colorTone field to settings schema and DB ([8372166](https://github.com/exodus-ai-org/exodus/commit/83721667aca040fe242bcf98158a138ae6c0486e))
* add core logger module with JSONL file output and daily rotation ([27d07e8](https://github.com/exodus-ai-org/exodus/commit/27d07e896e9ed689c843369b55e6dc5463833494))
* add CSS color tone rulesets for all 6 tones (light + dark) ([db06690](https://github.com/exodus-ai-org/exodus/commit/db06690fd3335bedc5d00d332fa20de29579ab43))
* add keyboard shortcuts system and remove @tailwindcss/typography ([dab47d3](https://github.com/exodus-ai-org/exodus/commit/dab47d33849f275abb92513dcff4e66800d57cfd))
* add log query API routes (list, filter, export, clear) ([af2562d](https://github.com/exodus-ai-org/exodus/commit/af2562ddf3f6b9b5f8693ff3dd5af382b3e2a3a3))
* add Logger page to Settings with filtering and log viewer ([a595018](https://github.com/exodus-ai-org/exodus/commit/a5950185a826a55cfe6f19c34694c18def071324))
* add remote MCP transport support (SSE & Streamable HTTP) ([d7268bf](https://github.com/exodus-ai-org/exodus/commit/d7268bf1e72932516e0699935c0a03a0acbcd498))
* add shared SseManager to replace duplicated SSE patterns ([e067217](https://github.com/exodus-ai-org/exodus/commit/e06721729e7dcd82a42cd3ba483df62efafe6771))
* Agent X — free-floating agents, link-to-assign dept membership ([37fb023](https://github.com/exodus-ai-org/exodus/commit/37fb0236f79ff515ecd94e53a1e9e46a5bbcd8a7))
* Agent X — smart fill, task kanban, cost analysis, feedback ([db1d593](https://github.com/exodus-ai-org/exodus/commit/db1d5934393917cba16beb69bc86cb335fb00361))
* Agent X graph multi-select and group drag ([82aafab](https://github.com/exodus-ai-org/exodus/commit/82aafab3986c26206b14b0191a4c83587d150b79))
* Agent X graph UI — add agent button, collaboration edges ([343e4c7](https://github.com/exodus-ai-org/exodus/commit/343e4c71431f4529f48237744abddee998291931))
* Agent X smart dispatch, cron scheduling, shadow agents, and graph UX improvements ([fe59963](https://github.com/exodus-ai-org/exodus/commit/fe5996365ac42d43866ab5a9f5e9bc1b855b213c)), closes [hi#priority](https://github.com/hi/issues/priority)
* cron tasks as persistent templates with run history ([b34daaf](https://github.com/exodus-ai-org/exodus/commit/b34daaf527158ed3fa2d3f935b6988b7be0bab00))
* **db:** add migration to rename snake_case columns to camelCase ([3fb379e](https://github.com/exodus-ai-org/exodus/commit/3fb379eebd75997b14c7fbc14716a8b372b63f86))
* **db:** update schema.ts column definitions to camelCase ([9588efe](https://github.com/exodus-ai-org/exodus/commit/9588efecf31307d9d34a74ef892711fd7ee14116))
* enforce web search citations and fix tool content routing ([db32a06](https://github.com/exodus-ai-org/exodus/commit/db32a0663327751f39a764d10708212932f8db7c))
* implement Agent X multi-agent management system (Phase 1 MVP) ([a02ae45](https://github.com/exodus-ai-org/exodus/commit/a02ae455b0e2643ab89813285f337fa3828a3a63))
* implement memory system, context management, and LCM tools ([02cc19c](https://github.com/exodus-ai-org/exodus/commit/02cc19cbd2af535dbeadf4c909bfb7848db966e5))
* improve error handling, integrate thinking timeline, and add sources panel ([63ec605](https://github.com/exodus-ai-org/exodus/commit/63ec605e7f940287b787e2689fcb712ef5c4ba9c))
* improve thinking timeline with duration, streaming preview, and conditional Done ([f4c9a6b](https://github.com/exodus-ai-org/exodus/commit/f4c9a6b0367a0049ca423fa6320161ab014be24f))
* MCP tools integration with chat and settings-based server selection ([ddefb17](https://github.com/exodus-ai-org/exodus/commit/ddefb17a6c42f0b7fd357bc1f998dcb557102534))
* migrate from Vercel AI SDK to pi-mono (pi-ai + pi-agent-core) ([a63d20e](https://github.com/exodus-ai-org/exodus/commit/a63d20e82fa8d59a4cc3f3d4af93b1ef4d2608e8))
* migrate from Vercel AI SDK to pi-mono (pi-ai + pi-agent-core) ([555d044](https://github.com/exodus-ai-org/exodus/commit/555d04470143e2222e3ea3dec124d155540b228b))
* misc UI improvements across Agent X, chat, and settings ([ff5dbde](https://github.com/exodus-ai-org/exodus/commit/ff5dbdef71a5d36eacda4f10899a1baf91a1d6b0))
* **personality:** add personality schema, DB column, and system prompt injection ([079de6b](https://github.com/exodus-ai-org/exodus/commit/079de6b9e7c2dc913f353cdfd3c03b6b76740c85))
* **personality:** add Personality settings page with style/tone/user info ([d655901](https://github.com/exodus-ai-org/exodus/commit/d655901253dcf2729ea7d3f06fd18d716b1449ed))
* **projects:** add /api/project CRUD route ([7dda126](https://github.com/exodus-ai-org/exodus/commit/7dda1260793630a3b415d51f6171bdfcbaea5768))
* **projects:** add frontend project service and Jotai store ([8e2500f](https://github.com/exodus-ai-org/exodus/commit/8e2500f20b870c6595ce7bef66c3dba301084006))
* **projects:** add project breadcrumb in chat view ([2d17fe9](https://github.com/exodus-ai-org/exodus/commit/2d17fe9e5db53067f0ed9fe562da0c4679ef9b97))
* **projects:** add project CRUD queries and modify chat queries ([15959c5](https://github.com/exodus-ai-org/exodus/commit/15959c514148e2b5ee18abb8736bbcea8b446099))
* **projects:** add project table and chat.projectId column ([74b58d7](https://github.com/exodus-ai-org/exodus/commit/74b58d7f7bdf0e42f5e55b4cce5b64e0356d8643))
* **projects:** add ProjectDetail page with instructions editor ([fb6f061](https://github.com/exodus-ai-org/exodus/commit/fb6f06106f40781adc5231afd10dc04c951bc2a0))
* **projects:** add projectId filtering to history route ([43ef218](https://github.com/exodus-ai-org/exodus/commit/43ef218313646659e1733bcb01a4dc0cda6c77e1))
* **projects:** add shared Zod schemas for project validation ([6cbd0e1](https://github.com/exodus-ai-org/exodus/commit/6cbd0e1d6bcdb92cc38bb080d96a3ecddbbd218b))
* **projects:** add sidebar tab switching between Chats and Projects ([2e7482b](https://github.com/exodus-ai-org/exodus/commit/2e7482b7085131bcddd20058e5aa8c4503ee7aa9))
* **projects:** forward projectId in chat API requests ([ce619ed](https://github.com/exodus-ai-org/exodus/commit/ce619ed89d59b92334b30b4c0ca1fa26688332ca))
* **projects:** implement NavProjects sidebar component with CRUD ([7a6b00e](https://github.com/exodus-ai-org/exodus/commit/7a6b00e942f4825cf26af06d2b5b15fb5f2ceb85))
* **projects:** inject project instructions into chat system prompt ([c1ab1ea](https://github.com/exodus-ai-org/exodus/commit/c1ab1eaaba596b2513fa6560c98410eb5ca9b977))
* **projects:** support projectId in new chats and show project badge ([4a0cc3e](https://github.com/exodus-ai-org/exodus/commit/4a0cc3e97a77607330659dc4bf05a9b25b75091e))
* redesign citations system and improve skills search ([251cb0b](https://github.com/exodus-ai-org/exodus/commit/251cb0bafc4400a60f26184b2dec816c65d61969))
* redesign web search citations and sources UI ([cd17432](https://github.com/exodus-ai-org/exodus/commit/cd1743244970ebf8a232daeed5775fcdd6f1cb8d))
* resolve conflict ([f15a750](https://github.com/exodus-ai-org/exodus/commit/f15a750afb09acaa619316f1d2fa27f304960f79))
* some file style updating ([efeff09](https://github.com/exodus-ai-org/exodus/commit/efeff09f26c11cd68b58dcb85c88531cafce828e))
* update skills ([8d7560c](https://github.com/exodus-ai-org/exodus/commit/8d7560c43df21a5e48e2654b1e1ace39f591b450))
* upgrade image generation and audio models to latest ([c7560a8](https://github.com/exodus-ai-org/exodus/commit/c7560a8375861f6fd4c99371e379111e77223a2c))


### Performance Improvements

* lazy load Monaco Editor in MCP Servers settings ([dbfddfe](https://github.com/exodus-ai-org/exodus/commit/dbfddfe53d956aa156c2fcea82b15c05ccfe4e3f))

# [1.10.0](https://github.com/exodus-ai-org/exodus/compare/v1.9.0...v1.10.0) (2026-03-15)


### Bug Fixes

* fix transparent sidebar text color and fullscreen padding ([7ee2181](https://github.com/exodus-ai-org/exodus/commit/7ee2181e38a466d94af497de9668f78959e06d64))
* improve and fix all calling tools ([f89cb0b](https://github.com/exodus-ai-org/exodus/commit/f89cb0bcc23a15e3b43f2da5186d94f16b5b85c8))


### Features

* add EllipsisTooltip component ([c712bcd](https://github.com/exodus-ai-org/exodus/commit/c712bcd18d8f1e59a92c2de6890e532744f341dd))
* add foundation tools (terminal, readFile, writeFile, listDirectory, findFiles) ([185d894](https://github.com/exodus-ai-org/exodus/commit/185d8945ecb5e3d7aaf2e93e881ac202a56d1b03))
* consolidate drizzle migrations and improve UI components ([bcf8bed](https://github.com/exodus-ai-org/exodus/commit/bcf8bed5f63d0e78c580e5c73d98ccf22dcf7790))
* integrate Cloudflare Crawl ([b8019fa](https://github.com/exodus-ai-org/exodus/commit/b8019fa9c34aeb25c36627f48176e138947af376))
* major feature batch — auto-updater, chat fixes, weather UI, vibrancy ([47c7121](https://github.com/exodus-ai-org/exodus/commit/47c7121d14875cef018a5e33fbed1d4f8f0d94dc))
* memo layer ([dca915c](https://github.com/exodus-ai-org/exodus/commit/dca915c6e20cc90611fb8280bd79c0dc911f4026))
* memo layer ([d154586](https://github.com/exodus-ai-org/exodus/commit/d15458692aeee4cd1ba970c032d6e7561f981ef9))
* migrate AI SDK v4→v6, replace Serper with Brave Search, fix settings UX ([50eb578](https://github.com/exodus-ai-org/exodus/commit/50eb5786e2b677a9d35269ebc2fe8c2a4bb1be23))
* migrate deepResearch service to orpc  by unaudited AI generation ([ad49195](https://github.com/exodus-ai-org/exodus/commit/ad49195867d39b2d622b5c687fa12f26e3cd2876))
* migrate deepResearch service to orpc by unaudited AI generation ([49421e4](https://github.com/exodus-ai-org/exodus/commit/49421e48d6f7e3e0d9c1c6926597f38133ecc97e))
* migrate Settings dialog to a new route ([b75f17f](https://github.com/exodus-ai-org/exodus/commit/b75f17fbc5359a2a3582fc92ccef0026ec69455f))
* redesign UI, add Skills Market with ClawHub integration ([b444751](https://github.com/exodus-ai-org/exodus/commit/b444751d03f8ce515aa4b16e5467fa3222ffafe6))
* settings S3 improvements and breadcrumb hierarchy ([fcd326e](https://github.com/exodus-ai-org/exodus/commit/fcd326e1096bef079e7d771fbc6c720095d8e55f))
* style adjustment ([293499b](https://github.com/exodus-ai-org/exodus/commit/293499b4b125cb907720c629948ec151360c4150))
* update the styles of advanced tools ([ecdd774](https://github.com/exodus-ai-org/exodus/commit/ecdd774f38c8aa74c46e46a7dea8afafc0014ab5))
* using orpc by unaudited AI generation ([e6669fd](https://github.com/exodus-ai-org/exodus/commit/e6669fd792260cefd667bc4db3b79fb6a9340c3e))
* vibrancy theme sync, sidebar light-mode colors, settings restructure ([a4e7132](https://github.com/exodus-ai-org/exodus/commit/a4e7132cf715d2f37690a45687f6c12b8b3f89ff))
* **wip:** add Icon suffix to lucide-react import ([4656983](https://github.com/exodus-ai-org/exodus/commit/4656983cde2795f255c834a09189aa45d1f9a036))
* **wip:** orpc ([a711476](https://github.com/exodus-ai-org/exodus/commit/a7114766b6ba023cc80ab86a72d56d8bfabb883a))
* **wip:** rag ([43efac4](https://github.com/exodus-ai-org/exodus/commit/43efac45957c3f161022838c59a8f1c73a3398db))
* **wip:** RAG ([7561890](https://github.com/exodus-ai-org/exodus/commit/75618906490f18dde4a5ea285057cbe9d19c8dc0))
* **wip:** update rich text editor ([1065ba0](https://github.com/exodus-ai-org/exodus/commit/1065ba0ae3fa4c093b422921774d31ead4131908))
* **wip:** workflow ([120878c](https://github.com/exodus-ai-org/exodus/commit/120878cfe47f243176d1ee07f2e4b6a25b5d8406))
* **wip:** workflow ([baa61ae](https://github.com/exodus-ai-org/exodus/commit/baa61aecb0dead6b7d332a82220c9d81bc9e1e78))
* **wip:** workflow ([2da728b](https://github.com/exodus-ai-org/exodus/commit/2da728b53b271b69635f279e1d6cd3b64fd396b9))

# [1.9.0](https://github.com/exodus-ai-org/exodus/compare/v1.8.0...v1.9.0) (2025-07-31)


### Bug Fixes

* parse all source from deep-research final report ([04f13f1](https://github.com/exodus-ai-org/exodus/commit/04f13f1da37c17bba78c6b217fdd221f92143fa9))


### Features

* collect all ipcs to a single file ([21766ae](https://github.com/exodus-ai-org/exodus/commit/21766ae4c70fae9f4f62c6f71814a5d9534a0caa))
* delete useless code ([7bbdf17](https://github.com/exodus-ai-org/exodus/commit/7bbdf1756f2654c1d154737d45a90dafcee9691b))
* migrate assistant module to generals ([19023e2](https://github.com/exodus-ai-org/exodus/commit/19023e2d3cfcd2b608a6b1f4bd2b4f2a4fe0bb5b))
* optimize settings ([be03305](https://github.com/exodus-ai-org/exodus/commit/be0330505adfd3c1732180087fb384ca2f70d14d))
* refactor the layout ([03717de](https://github.com/exodus-ai-org/exodus/commit/03717de0dc48141edaa7d962b086fde0a55f628e))
* rename shortcutChat as quickChat ([ddac7ab](https://github.com/exodus-ai-org/exodus/commit/ddac7ab6a5ececa80936114c94cec841494086b0))
* set minWidth and minHeight to main window ([4169506](https://github.com/exodus-ai-org/exodus/commit/416950638aa99015186dffdc4749271b56044f2c))
* style adjustment ([8a9c710](https://github.com/exodus-ai-org/exodus/commit/8a9c710d654935032bd9f6b0066c316db8f6ffde))
* update MonacoEditor ([fd3c73a](https://github.com/exodus-ai-org/exodus/commit/fd3c73a56a4ee89f189c9af8bebc00a807f97c89))
* **wip:** integrate tiptap editior preparing for immersion ([392b3c2](https://github.com/exodus-ai-org/exodus/commit/392b3c287ead8fa1c5ad4f9853c59a2c478375a4))

# [1.8.0](https://github.com/exodus-ai-org/exodus/compare/v1.7.0...v1.8.0) (2025-07-15)


### Bug Fixes

* if baseUrl is an empty string, need to return undefined ([7cc949f](https://github.com/exodus-ai-org/exodus/commit/7cc949fbf2c477505927514915e0fb5f85f7d337))
* server should be set with reference ([5dd5e01](https://github.com/exodus-ai-org/exodus/commit/5dd5e0103e5774a1136adae7a777cb7ec5ad4f1f))
* several style bugs ([d7978da](https://github.com/exodus-ai-org/exodus/commit/d7978da5355e912f6efc3007900ad1ce3b8fb48f))
* typo ([37ac9c7](https://github.com/exodus-ai-org/exodus/commit/37ac9c7c8ab0d810b567b8e60d5b91da766c08c5))
* update settings when assistantAvatar updated ([9091f61](https://github.com/exodus-ai-org/exodus/commit/9091f615ed1cf8d69f31388ab8e3dec2da467ff3))


### Features

* add a mask in SettingsSidebar for better performance ([acd9b68](https://github.com/exodus-ai-org/exodus/commit/acd9b681578cc79123458a19b8969e6e6733f7d9))
* adjust css of markdown ([e373d1b](https://github.com/exodus-ai-org/exodus/commit/e373d1bfa88e9895828a6cb7e1dfabffca6d2883))
* delete fs module ([9e5ad74](https://github.com/exodus-ai-org/exodus/commit/9e5ad74f848cfd6e51c210b79407bf479cc4e56e))
* display images to the final report of deep research ([f16dcfe](https://github.com/exodus-ai-org/exodus/commit/f16dcfe96b9528ddc9809a357a95226cecbc796a))
* display mcp tool's source ([42fa9f7](https://github.com/exodus-ai-org/exodus/commit/42fa9f7823b12c00df75564853d01fdc8908f0f3))
* hide the title bar to make Exodus likes a real native app ([2b7ca77](https://github.com/exodus-ai-org/exodus/commit/2b7ca77a070b8ce5afac2c3743c92e34448b3fbe))
* supports a shortcut likes Spotlight on macOS ([3deabb2](https://github.com/exodus-ai-org/exodus/commit/3deabb2b9e815141f6c925c72866a0e919c7a0ea))
* update globals.css ([e54015a](https://github.com/exodus-ai-org/exodus/commit/e54015acaf00dbf5f15333915b4f9eb9784b451f))
* zoom images uploaded in chat messages ([66fdb7b](https://github.com/exodus-ai-org/exodus/commit/66fdb7b8674b1d727093987944e6d70d51ee0aa1))

# [1.7.0](https://github.com/exodus-ai-org/exodus/compare/v1.6.0...v1.7.0) (2025-06-05)


### Bug Fixes

* close deep research sheet if component unloaded ([9b89d49](https://github.com/exodus-ai-org/exodus/commit/9b89d49604b24a2a4dc242ce40e7ee4d28837def))
* extract ctations from mixed content ([f99158f](https://github.com/exodus-ai-org/exodus/commit/f99158f614287141c02d2946b4cc2ae665d0fd61))
* Gemini calling tools don't support enumeration type ([f2f754d](https://github.com/exodus-ai-org/exodus/commit/f2f754d0f0c5faeefe3895f7ad6dd47c76e33cbb))
* multiple entry point paths ([5ef1a26](https://github.com/exodus-ai-org/exodus/commit/5ef1a263a29b32a0dcbb64c72df7b3b2a8b44568))
* use window.location.hash instead of window.location.href ([aadd4ce](https://github.com/exodus-ai-org/exodus/commit/aadd4ceee5dd886e7d31b766901b7bfef098fb33))


### Features

* add zod schemas for http request ([861b5aa](https://github.com/exodus-ai-org/exodus/commit/861b5aada05d6b5b92af8f9d5df08b497ffc4a0d))
* enhance the performance of deep research ([e3db65f](https://github.com/exodus-ai-org/exodus/commit/e3db65fd86e6a5130661750424d5c746665e7a7c))
* just use electron to render pdf rather than md-to-pdf ([b23f622](https://github.com/exodus-ai-org/exodus/commit/b23f622d814b53d63bc5f4911e5ac78dd68c2433))
* lazy load MonacoEditor for better performance ([3ec8e28](https://github.com/exodus-ai-org/exodus/commit/3ec8e2897d78b7ca1b75b436993763dcfcfd25aa))
* move Find-in-Page to menu ([9a9cc05](https://github.com/exodus-ai-org/exodus/commit/9a9cc05401e85337beab01e7ca819c92fa63b8e4))
* optimitize the prompts of deep research ([9f671a5](https://github.com/exodus-ai-org/exodus/commit/9f671a5edfc284887a221fbb259bbec44fc3cee7))
* parse citations if AI outputs them in li tag ([d0a90ca](https://github.com/exodus-ai-org/exodus/commit/d0a90ca98348d24aa99a8a33f12a4fee34100054))
* parse citations if AI outputs them in li tag ([da179ef](https://github.com/exodus-ai-org/exodus/commit/da179efcc5bfcaa40df3165070fed990bac575ed))
* pop a confirmation dialog when delete a chat ([61b92c5](https://github.com/exodus-ai-org/exodus/commit/61b92c5089406e7c64b39cfee35b481b78d8b963))
* remove electron-devtools-installer ([52c936a](https://github.com/exodus-ai-org/exodus/commit/52c936a0a0b322a5f35cd0373aa79ef721cc4314))
* several optimizations ([5567f39](https://github.com/exodus-ai-org/exodus/commit/5567f3914099141059ddd977081419ea892804d9))
* show deleted chat title in toast rather than id ([e62861a](https://github.com/exodus-ai-org/exodus/commit/e62861a71b4c3dbcd11aca96baf52008683eb6f8))
* sort the results by rating of Google Maps Places ([c776546](https://github.com/exodus-ai-org/exodus/commit/c7765461ff527e7b6471911e1ce033131dd89071))
* support auto updater ([066afb2](https://github.com/exodus-ai-org/exodus/commit/066afb266e576ed74f461daaa9fe6a00bdc8a4fa))
* support Find-in-Page ([782de7d](https://github.com/exodus-ai-org/exodus/commit/782de7df7d87b57b64cd10da6f88fae971b1f56c))
* support smoothStream ([4aee9c2](https://github.com/exodus-ai-org/exodus/commit/4aee9c2bdcefd679e75527435b42ac71dfd62195))
* update app logo ([70c1501](https://github.com/exodus-ai-org/exodus/commit/70c15013479d39866aaaa45b4d05a5ec1f2a520d))
* update models for google ai ([8b8a670](https://github.com/exodus-ai-org/exodus/commit/8b8a6702b6be3f78e8a99385c7323fc954ac1690))
* use Google api to retrieve favicon ([3fecdb3](https://github.com/exodus-ai-org/exodus/commit/3fecdb378ba5f39d5a04497c87579ee89f127b60))


### Performance Improvements

* move front-end relevant dependencies to devDependencies for shrinking bundle size ([fd1d078](https://github.com/exodus-ai-org/exodus/commit/fd1d0788f007372a6d73117986579ec624bf6e25))

# [1.6.0](https://github.com/exodus-ai-org/exodus/compare/v1.5.1...v1.6.0) (2025-05-19)

### Bug Fixes

- should throw error messages if third parts failed in calling tools ([4c21e39](https://github.com/exodus-ai-org/exodus/commit/4c21e394e7473cc7ee9ca546a96de74452e311b2))

### Features

- add deep research parameters to db ([908ac77](https://github.com/exodus-ai-org/exodus/commit/908ac775930539d5ca9b3c47daec9e4a74987dff))
- add shimer animation if loading text ([59e81bd](https://github.com/exodus-ai-org/exodus/commit/59e81bdc46c7aece6e7955a02bed69a4eef41996))
- basic deep research ([6ec8d49](https://github.com/exodus-ai-org/exodus/commit/6ec8d49d61d558828eb2e8aa9890972203ccb500))
- do not wrap JSON.stringify on calling tools results ([df1e7cb](https://github.com/exodus-ai-org/exodus/commit/df1e7cb81a1ec59747d2a2b12cdc906512bd163b))
- enhance the communication stream in deep research ([fbb3919](https://github.com/exodus-ai-org/exodus/commit/fbb3919cf7345ee439261e70bb2b4cb7e7917dc5))
- enhance the ui performance to deep research ([025431a](https://github.com/exodus-ai-org/exodus/commit/025431ada4219e30bc2b49233aab1f7043e1c85b))
- enhance web search ([2023aba](https://github.com/exodus-ai-org/exodus/commit/2023aba929f5dc5e360162a3985bb04607496c73))
- stream deep research messages via SSE ([d42b2b5](https://github.com/exodus-ai-org/exodus/commit/d42b2b5521198109e775c43524c242747942bd92))
- support download the final report of deep research as pdf ([4a0b5ce](https://github.com/exodus-ai-org/exodus/commit/4a0b5ce256049f658c670be2062e5166bf12a9c3))
- supports image generation ([53bf7a8](https://github.com/exodus-ai-org/exodus/commit/53bf7a804924094bc9bdef8ce9830b830a1085e8))
- **wip:** deep research ([678b95a](https://github.com/exodus-ai-org/exodus/commit/678b95a74a055274dcd7b6b841dc72cac3f206f1))
- **wip:** define deep research db ([c2b0d3b](https://github.com/exodus-ai-org/exodus/commit/c2b0d3bed8a527e521898acc596e80a870edcf13))
- **wip:** finish deep research api ([6ae9ec9](https://github.com/exodus-ai-org/exodus/commit/6ae9ec97cbf8e11ea9e5a15a82b71f3bcb8e431d))
- **wip:** try call deep research ([1080f94](https://github.com/exodus-ai-org/exodus/commit/1080f94ba2d83ce77bbc0c4588b7682e1ae8de5e))
- **wip:** try jsonrpc-formatted sse message ([5f66fb6](https://github.com/exodus-ai-org/exodus/commit/5f66fb6e5103890297e481fa763eeeb73cb2f599))

## [1.5.1](https://github.com/HyperChatBot/exodus/compare/v1.5.0...v1.5.1) (2025-05-02)

### Bug Fixes

- do not show AvailableMcpTools if no tools ([d2abaa4](https://github.com/HyperChatBot/exodus/commit/d2abaa40e4bec3214110ed8cdf0fc4d220aee595))

# [1.5.0](https://github.com/HyperChatBot/exodus/compare/v1.4.2...v1.5.0) (2025-04-30)

### Features

- extract RenameChatDialog ([7a81bb9](https://github.com/HyperChatBot/exodus/commit/7a81bb95c76ef1e6c660aeced38adcc490788069))
- move all http requests to services directory ([97caed2](https://github.com/HyperChatBot/exodus/commit/97caed2c1b8ee34fb80b25417008c3cb6cb68814))
- optimize the UI of CodePreview ([3178d43](https://github.com/HyperChatBot/exodus/commit/3178d43e909cd96e8257973df168167422593f7d))
- remove useless console.log ([1e5a511](https://github.com/HyperChatBot/exodus/commit/1e5a5114f02b904f7991a28a586a1e7f6a79d14d))
- rename nav-actions to theme-switcher ([63bdd0d](https://github.com/HyperChatBot/exodus/commit/63bdd0dcfd74d6f8722276e595419b831f3a42b7))
- support full-text search ([20d49b5](https://github.com/HyperChatBot/exodus/commit/20d49b5802a854b1583113679a8d9f0e30c71ded))
- support rename chat ([a366add](https://github.com/HyperChatBot/exodus/commit/a366add36b8018e565bb1c3a4de7c12c6b2688d9))
- support to add chats to favorite ([92eb84f](https://github.com/HyperChatBot/exodus/commit/92eb84f9e2d244ee1e30334ce0e9cff7f21ab379))
- supports useClipboard ([1837e13](https://github.com/HyperChatBot/exodus/commit/1837e13a682e5369070637bbd505c5b282bce0f3))
- **wip:** auto refresh preview when switch to Preview Tab ([ac02863](https://github.com/HyperChatBot/exodus/commit/ac02863d561b11c879f302d4ace41669c7002c68))
- **wip:** complete convertShadcnUiFilesToString ([4bda232](https://github.com/HyperChatBot/exodus/commit/4bda2320863caf27a3a2b609841d5dcf21771e65))

## [1.4.2](https://github.com/HyperChatBot/exodus/compare/v1.4.1...v1.4.2) (2025-04-26)

### Bug Fixes

- several bug fix ([d6080cf](https://github.com/HyperChatBot/exodus/commit/d6080cf3118536085cd0e06f763f3e2f0c8f8177))
- several bug fix ([ac032bb](https://github.com/HyperChatBot/exodus/commit/ac032bbb19c1984126a69a3433a2265780ba1cae))

## [1.4.1](https://github.com/HyperChatBot/exodus/compare/v1.4.0...v1.4.1) (2025-04-25)

### Bug Fixes

- adapt new structure of settings ([adbf199](https://github.com/HyperChatBot/exodus/commit/adbf199451995e6e0c8b741c5c2e8215a8e7beef))
- adapt new structure of settings ([d06e812](https://github.com/HyperChatBot/exodus/commit/d06e812f0a8552115129212b5def0ccb01415951))

# [1.4.0](https://github.com/HyperChatBot/exodus/compare/v1.3.0...v1.4.0) (2025-04-25)

### Features

- try display system info ([dae1a1b](https://github.com/HyperChatBot/exodus/commit/dae1a1b8eb132559b1ea951ecd71f799c0381ad6))
- try display system info ([abaab74](https://github.com/HyperChatBot/exodus/commit/abaab74ff2261e3e37c62f10126b0e6e3405b1fc))

# [1.3.0](https://github.com/HyperChatBot/exodus/compare/v1.2.0...v1.3.0) (2025-04-25)

### Features

- enhance web search ([0eca463](https://github.com/HyperChatBot/exodus/commit/0eca4636f8a46c27671f8c34d318be79bfc7ad26))
- optimize styles ([f63967a](https://github.com/HyperChatBot/exodus/commit/f63967acc23ed302d8afd8d1feafa6c62078f7b0))
- rename NavSecondary to NavFooter ([bdfa46e](https://github.com/HyperChatBot/exodus/commit/bdfa46ea490902e691a6850819cd3a5b9a5484fc))

# [1.2.0](https://github.com/HyperChatBot/exodus/compare/v1.1.0...v1.2.0) (2025-04-24)

### Features

- complete web search ([3b437a6](https://github.com/HyperChatBot/exodus/commit/3b437a6b613f2707308876f5e6e9bab45f98bdb2))
- complete web search ([6ef7f56](https://github.com/HyperChatBot/exodus/commit/6ef7f564674fc8613b86e6e6af54e68fa37ad4a7))
- **wip:** append cications to web search summaries ([35fa81d](https://github.com/HyperChatBot/exodus/commit/35fa81dc7818128dd64508b96c868998adafd088))
- **wip:** append cications to web search summaries ([a2c04a9](https://github.com/HyperChatBot/exodus/commit/a2c04a92ded834cf32dc40a94e796c0ceb84beba))
- **wip:** web search summary with citations ([79df47d](https://github.com/HyperChatBot/exodus/commit/79df47d17b7a1dc7aa8a202b0ffe4f137083884e))
- **wip:** web search summary with citations ([3edd6d9](https://github.com/HyperChatBot/exodus/commit/3edd6d932cbbec89b425c6e5c8188a8ddda86da7))

# [1.1.0](https://github.com/HyperChatBot/exodus/compare/v1.0.1...v1.1.0) (2025-04-23)

### Bug Fixes

- should force redrecting root page ([ec0922e](https://github.com/HyperChatBot/exodus/commit/ec0922e0a1d24115ef81b409f4d45f627043f6a9))
- typo ([3349849](https://github.com/HyperChatBot/exodus/commit/33498497d9da281d5786ff8a4aa72738b6519b7d))

### Features

- add several tools ([c1f5f17](https://github.com/HyperChatBot/exodus/commit/c1f5f1711cd37defa6c9e882c034437b4eb4b803))
- add several tools ([8f3acaf](https://github.com/HyperChatBot/exodus/commit/8f3acaf86ee1800597953c5342c8f6c6f7b9f1b0))
- add welcome slogen ([fc9d335](https://github.com/HyperChatBot/exodus/commit/fc9d33540a4c5375691becaded4315754e5b14ce))
- adjust css ([7f66e77](https://github.com/HyperChatBot/exodus/commit/7f66e776127e8e248ec3e1a6077a97f0b6a4d81c))
- click event should be occurred on parent level ([b0df1a3](https://github.com/HyperChatBot/exodus/commit/b0df1a3c1b49ecb6bdabc6556e2b729105f2a7f7))
- extract common code to src/shared ([362e84b](https://github.com/HyperChatBot/exodus/commit/362e84bbc21cf5697a0b688d84059aff2fd0f50a))
- extract form items to sigle files ([b444d50](https://github.com/HyperChatBot/exodus/commit/b444d500cd15cbbcaa23b828cfb13828fa2cb1f6))
- get newest directory list when create a new directory ([f1a7ea5](https://github.com/HyperChatBot/exodus/commit/f1a7ea5db5f72ec0880da2a45ee02398daf93d88))
- integrate Google Maps Places ([a30b692](https://github.com/HyperChatBot/exodus/commit/a30b692e5d75a1c02738ee54622e392196042e5d))
- limit width of markdown code ([787e14d](https://github.com/HyperChatBot/exodus/commit/787e14dcd11035fce63492579ea1891f1efa0ee2))
- make form zone of settings dialog scrollable ([669a271](https://github.com/HyperChatBot/exodus/commit/669a271adb25d940432b0f325e9235aefc76235f))
- modify port ([765ceef](https://github.com/HyperChatBot/exodus/commit/765ceef78da65896e5d745595ae80f2934d9c6c3))
- package use-artifact ([63e0c15](https://github.com/HyperChatBot/exodus/commit/63e0c159c51e3c23c91016cc44cbb4a42d28384b))
- remove the soppurt to DeepSeek ([d86f511](https://github.com/HyperChatBot/exodus/commit/d86f511ebb1b9771c56a741f2ac7589e8ab062ab))
- remove the soppurt to DeepSeek ([23d085f](https://github.com/HyperChatBot/exodus/commit/23d085f926e8a4ed5a16d8acda5cf2ac885806f2))
- rename Import / Export Data to Data Controls ([bcbcd30](https://github.com/HyperChatBot/exodus/commit/bcbcd3091b749ee5f683c49a6ed5348eabc3ec9e))
- support multi provider's model ([f46f7d7](https://github.com/HyperChatBot/exodus/commit/f46f7d70cb49b08f4736242d7b8496663c813ca5))
- supports add attatchments along with a prompt ([91391b7](https://github.com/HyperChatBot/exodus/commit/91391b7f0e76793a0c0d3ec7ba686b5d75be18cc))
- supports available mcp tools dialog ([82f0fdd](https://github.com/HyperChatBot/exodus/commit/82f0fdd19cc9384cf4617cb293e23761b00e2ee4))
- supports copy code from markdown ([87534f5](https://github.com/HyperChatBot/exodus/commit/87534f5053754c03a1cadef03b7748f5cdbb2a22))
- supports database exporting ([17f68ed](https://github.com/HyperChatBot/exodus/commit/17f68ed05fb396306de798914845d9ae88f96ce9))
- supports multi models ([a8ee3bd](https://github.com/HyperChatBot/exodus/commit/a8ee3bdcece66fd95d20257dda2dcdf6c809396f))
- supports multi models ([9016020](https://github.com/HyperChatBot/exodus/commit/9016020194bb249458a6e28499f74aeb90ff9970))
- supports paste images from clipboard ([ef08c41](https://github.com/HyperChatBot/exodus/commit/ef08c41c5a3dee86a85322c80642eae89b630245))
- supports reasoning model ([792e0a2](https://github.com/HyperChatBot/exodus/commit/792e0a2ca638ae83943bb37e966f74cf32721c39))
- supports speech-to-text ([ec0ba99](https://github.com/HyperChatBot/exodus/commit/ec0ba998fd479ee3409ca925966e221b5f5b0e41))
- supports to zoom images ([b4b16a5](https://github.com/HyperChatBot/exodus/commit/b4b16a5239bcf9cf71721f9f5650abc458f83891))
- supports to zoom images ([c945411](https://github.com/HyperChatBot/exodus/commit/c9454114c0309bbffda128ce686933dbd92a00f4))
- update code editor ([85a974a](https://github.com/HyperChatBot/exodus/commit/85a974a454a62c5f943f8a1de3c4fe9c92206059))
- update google-maps-routing and weather tools ([5c8cd58](https://github.com/HyperChatBot/exodus/commit/5c8cd58fb07d83eb77d4f0edaafca850fea550e9))
- update google-maps-routing and weather tools ([a63b8de](https://github.com/HyperChatBot/exodus/commit/a63b8de9cc60101931628d7165df20d771b83cfd))
- update googleApiKey to googleGeminiApiKey ([dc97f6e](https://github.com/HyperChatBot/exodus/commit/dc97f6e3994eed0b532de64366d3a95b2b646fb9))
- update mcp servers without cold start ([a1a3e1c](https://github.com/HyperChatBot/exodus/commit/a1a3e1cd78449ffa2039f3bc531cb673a35e7bb5))
- update server ([dd1939a](https://github.com/HyperChatBot/exodus/commit/dd1939a59e300bc618dfd734e97236f476eb8f80))
- update several calling tools ([8989236](https://github.com/HyperChatBot/exodus/commit/8989236434a880b61d532e045327377070dc915d))
- update several calling tools ([3a02800](https://github.com/HyperChatBot/exodus/commit/3a02800fe9e50d1c382d945f6f6516bde0feacfc))
- upload file to LocalFiles directory via ipc ([2034c1d](https://github.com/HyperChatBot/exodus/commit/2034c1d2167f96d3515b40b73156fd06aa52acff))
- use blur mode for form ([5cf00ac](https://github.com/HyperChatBot/exodus/commit/5cf00ac46eeb133af4056bf029313082823da380))
- use global fetcher ([0e5a9a0](https://github.com/HyperChatBot/exodus/commit/0e5a9a0a8f75c8fb942b23e8efd12dd8a9f79680))
- use parts to store multimedia messages ([c738ec2](https://github.com/HyperChatBot/exodus/commit/c738ec28878c4f17197ed1eea7c460c5084df139))
- **wip:** support code preview ([98715bb](https://github.com/HyperChatBot/exodus/commit/98715bb630340e6dd834affa41121e2208a1a1f1))
- **wip:** support code preview ([1897208](https://github.com/HyperChatBot/exodus/commit/1897208b67e277f6044a901a2b130b8050afd1a7))
- **wip:** support code preview ([08b10c1](https://github.com/HyperChatBot/exodus/commit/08b10c17b80335a883fe8e036a20ad6f71b71860))
- **wip:** support code preview ([1df992a](https://github.com/HyperChatBot/exodus/commit/1df992a51335d9bd72d322f6d5ca920f3770cbec))
- **wip:** supports basic google map routing ([f9f2a54](https://github.com/HyperChatBot/exodus/commit/f9f2a54b4e452b4515b5c67a3200141027f0f48b))
- **wip:** supports scrollToBottom when insert a new message ([0a38816](https://github.com/HyperChatBot/exodus/commit/0a388167aaa737acf8573e2ee4e2707c0ac81f1f))
- **wip:** update styles for code preview ([d8f9933](https://github.com/HyperChatBot/exodus/commit/d8f9933b11f33d295c4d9b504e4612f10d366776))
- **wip:** update styles for code preview ([ee434dc](https://github.com/HyperChatBot/exodus/commit/ee434dc5da15608e72bf1832bffd284de39c2ec0))
- **wip:** use parts to store multimedia messages ([f8d0944](https://github.com/HyperChatBot/exodus/commit/f8d0944e4a9f27bd1c62029d898785730a4089e9))
- **wip:** use parts to store multimedia messages ([142ce47](https://github.com/HyperChatBot/exodus/commit/142ce475edd0a5fd1b54fb78d3ca9638d7cb77b2))
- **wip:** use react-markdown instead of marked ([89709b8](https://github.com/HyperChatBot/exodus/commit/89709b816fbf1e5a6b0a8627cc119332e29d928f))
- **wip:** use react-markdown instead of marked ([aeb6ed4](https://github.com/HyperChatBot/exodus/commit/aeb6ed46500bb4f57810f7c6b4361391b54f75cd))
- **wip:** uses actualTheme to obtain precise and instant theme ([f041d49](https://github.com/HyperChatBot/exodus/commit/f041d499f0a409958d535e9ebc3e2e7a660990db))

## [1.0.1](https://github.com/HyperChatBot/exodus/compare/v1.0.0...v1.0.1) (2025-04-02)

### Bug Fixes

- resolve path in production ([5b7a198](https://github.com/HyperChatBot/exodus/commit/5b7a198e9e8237432b336a440001cba34e893c30))

# 1.0.0 (2025-04-02)

### Features

- add audio params to db ([4012e16](https://github.com/HyperChatBot/exodus/commit/4012e162f5cfcf6a1ffad438a580eb0aa6609ed2))
- add message actions ([f329b15](https://github.com/HyperChatBot/exodus/commit/f329b154ffe51d9787b728688e91eabd3e0af5ad))
- add restart-web-server ipc to refresh MCP servers conveniently ([d50ed19](https://github.com/HyperChatBot/exodus/commit/d50ed19b2058fdaaf4a75904fb846033b3b49d68))
- initialize repo ([26be00f](https://github.com/HyperChatBot/exodus/commit/26be00f894965685552e82d9089b58bebb23a6a7))
- link monaco-editor to react-form-hook ([dab87e3](https://github.com/HyperChatBot/exodus/commit/dab87e3b59cb20265054af2312430f9dcc71d6ba))
- make grid layout occupies all of height ([35c3083](https://github.com/HyperChatBot/exodus/commit/35c3083c2c8a765d00d000cc0aa95dceb071e14b))
- read settings from db ([fc3f01c](https://github.com/HyperChatBot/exodus/commit/fc3f01ce2fa2275253b9c72a1e7200bc0f7e8c80))
- resolve serveral lint problems ([7dd9a32](https://github.com/HyperChatBot/exodus/commit/7dd9a32fb90adf5be4062dad85b10ee8f509dce3))
- supports text to speech ([7d146fb](https://github.com/HyperChatBot/exodus/commit/7d146fb9f890249f6e21225485c1f9d5a58d4f02))
- switch theme on monaco editor by classList ([3b3a2dc](https://github.com/HyperChatBot/exodus/commit/3b3a2dc3b7a7cc65d6509ac253508d2b145dd34d))
- update code editor ([e6d8506](https://github.com/HyperChatBot/exodus/commit/e6d85064aae28ecba054a92f44e4b44a6043ed4a))
- update vite-env.d.ts ([eb35686](https://github.com/HyperChatBot/exodus/commit/eb35686a867c12daf0981640ce9a6616079b3338))
- use hono instead of express.js ([a61d2b6](https://github.com/HyperChatBot/exodus/commit/a61d2b6f7dcaad5c9e4842901182ebdd5ba7e39d))
- use monaco-editor to render and edit MCP servers JSON ([08b29f9](https://github.com/HyperChatBot/exodus/commit/08b29f9aadb101469448ce450a3a6eb3fb7126f0))
- **wip:** virtual file system ([42c6f7e](https://github.com/HyperChatBot/exodus/commit/42c6f7e68de417aa4bf00ce5ea3399c6d0ff1487))
