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
