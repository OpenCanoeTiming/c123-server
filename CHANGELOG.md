# Changelog

## [0.13.0](https://github.com/OpenCanoeTiming/c123-server/compare/v0.12.2...v0.13.0) (2026-11-12)


### Features

* **admin-ui:** adopt timing-design-system 1.2 and drop the parallel stylesheet ([#221](https://github.com/OpenCanoeTiming/c123-server/issues/221)) ([#341](https://github.com/OpenCanoeTiming/c123-server/issues/341)) ([2bbe243](https://github.com/OpenCanoeTiming/c123-server/commit/2bbe243e4dc5c7509e76089de010eabc0da34da5))
* **contract:** add the @opencanoetiming/c123-contract package ([#226](https://github.com/OpenCanoeTiming/c123-server/issues/226)) ([95b15fa](https://github.com/OpenCanoeTiming/c123-server/commit/95b15fa244798a6c38f43c90c601bec38a93f0de))
* **core:** leave constant and round 20 rulings ([#264](https://github.com/OpenCanoeTiming/c123-server/issues/264)) ([5984795](https://github.com/OpenCanoeTiming/c123-server/commit/59847955740e5081389f7db5bcca3cb7eb757152))
* **core:** merge core ([#257](https://github.com/OpenCanoeTiming/c123-server/issues/257)) ([22e39fa](https://github.com/OpenCanoeTiming/c123-server/commit/22e39fa67865fdb57665f36e26bed7d384f42cb3))
* **core:** Standing assembly ([#269](https://github.com/OpenCanoeTiming/c123-server/issues/269)) ([dfbec28](https://github.com/OpenCanoeTiming/c123-server/commit/dfbec28ac166d3afaa2d275a8d52c2634565a28e))
* **dev-env:** one-command player + server environment ([#219](https://github.com/OpenCanoeTiming/c123-server/issues/219)) ([8f464f0](https://github.com/OpenCanoeTiming/c123-server/commit/8f464f0a2591beb846c8e00ee2fe60d0ba812a7f))
* **gates:** npm run gates, with data-gate tests, whole-recording gate 2 and gate 3, and no skips ([#313](https://github.com/OpenCanoeTiming/c123-server/issues/313)) ([#317](https://github.com/OpenCanoeTiming/c123-server/issues/317)) ([65e1e4f](https://github.com/OpenCanoeTiming/c123-server/commit/65e1e4fe89d60b78deed6c560471208fb5163337))
* **ingest:** content age, xml states, classification snapshot per round 18 ([#254](https://github.com/OpenCanoeTiming/c123-server/issues/254)) ([71c22b4](https://github.com/OpenCanoeTiming/c123-server/commit/71c22b4be9b7b120683e3e2b0b744e25a65d7ac0))
* **ingest:** TCP and XML parsers per DERIVATIONS ([#246](https://github.com/OpenCanoeTiming/c123-server/issues/246)) ([893ec70](https://github.com/OpenCanoeTiming/c123-server/commit/893ec70f08a34419855f20bec19d732e415e7a22))
* **ingest:** XML snapshot reader ([#250](https://github.com/OpenCanoeTiming/c123-server/issues/250)) ([b1897e5](https://github.com/OpenCanoeTiming/c123-server/commit/b1897e5e15e9d682ba96b9c80de036aa6c32f669))
* **onsite:** on-site REST/WS process, contract §7 ([#210](https://github.com/OpenCanoeTiming/c123-server/issues/210)) ([#285](https://github.com/OpenCanoeTiming/c123-server/issues/285)) ([af279f3](https://github.com/OpenCanoeTiming/c123-server/commit/af279f34c1d90d639936f8a6ae79721bc04066e3))
* **onsite:** write path, penalty writes and checks with durable keys and one echo rule in every lifetime ([#212](https://github.com/OpenCanoeTiming/c123-server/issues/212)) ([#299](https://github.com/OpenCanoeTiming/c123-server/issues/299)) ([2e31f92](https://github.com/OpenCanoeTiming/c123-server/commit/2e31f9201c05f63b7c84ff4536e1ba67d632b5b4))
* **store:** durable gate checks and flags ([#272](https://github.com/OpenCanoeTiming/c123-server/issues/272)) ([0cdd197](https://github.com/OpenCanoeTiming/c123-server/commit/0cdd19785b6a882a37a1a692bf1212f0ec9e1a39))
* **tools:** direct-injection replay and round 24 and 25 core ([#277](https://github.com/OpenCanoeTiming/c123-server/issues/277)) ([6afef9a](https://github.com/OpenCanoeTiming/c123-server/commit/6afef9ae53f8e04358ee0d36afb039e50bd095b6))


### Bug Fixes

* **core:** a contradiction leaves no tcp marker on an xml-only field ([#314](https://github.com/OpenCanoeTiming/c123-server/issues/314)) ([#316](https://github.com/OpenCanoeTiming/c123-server/issues/316)) ([ac67e78](https://github.com/OpenCanoeTiming/c123-server/commit/ac67e78295a300740cb54225a23310ba4490d225))
* **core:** a leave withdraws the stream's running outcome behind a table finish or mark ([#312](https://github.com/OpenCanoeTiming/c123-server/issues/312)) ([#315](https://github.com/OpenCanoeTiming/c123-server/issues/315)) ([86ed855](https://github.com/OpenCanoeTiming/c123-server/commit/86ed855d8a0b244d1fbdb908314ce80c86c0c72d))
* **core:** rounds 26 and 26b ([#281](https://github.com/OpenCanoeTiming/c123-server/issues/281)) ([23b7537](https://github.com/OpenCanoeTiming/c123-server/commit/23b7537127a17b4021775998ca16c24b1d1d4f26))

## [0.12.2](https://github.com/OpenCanoeTiming/c123-server/compare/v0.12.1...v0.12.2) (2026-10-17)


### Bug Fixes

* **admin:** report the package version instead of a stale constant ([#196](https://github.com/OpenCanoeTiming/c123-server/issues/196)) ([f545eb5](https://github.com/OpenCanoeTiming/c123-server/commit/f545eb586b5b1ed137e5e8a9c96cbde9ed612225)), closes [#78](https://github.com/OpenCanoeTiming/c123-server/issues/78)

## [0.12.1](https://github.com/OpenCanoeTiming/c123-server/compare/v0.12.0...v0.12.1) (2026-09-17)


### Bug Fixes

* add PATCH to CORS Access-Control-Allow-Methods ([#163](https://github.com/OpenCanoeTiming/c123-server/issues/163)) ([5953e39](https://github.com/OpenCanoeTiming/c123-server/commit/5953e398b2f8e8104c3f9e34109c2d2a0cf84dc5)), closes [#162](https://github.com/OpenCanoeTiming/c123-server/issues/162)

## [0.12.0](https://github.com/OpenCanoeTiming/c123-server/compare/v0.11.3...v0.12.0) (2026-08-03)


### Features

* penalty check persistence (REST API + WS broadcast) ([#24](https://github.com/OpenCanoeTiming/c123-server/issues/24)) ([41a0881](https://github.com/OpenCanoeTiming/c123-server/commit/41a08811406ca3df88ecbcecd0c404e83f6de048)), closes [#6](https://github.com/OpenCanoeTiming/c123-server/issues/6) [#23](https://github.com/OpenCanoeTiming/c123-server/issues/23)

## [0.11.3](https://github.com/OpenCanoeTiming/c123-server/compare/v0.11.2...v0.11.3) (2026-08-02)


### Bug Fixes

* remove deprecated baseUrl from tsconfig (TS 6.0 compat) ([ee0b0e2](https://github.com/OpenCanoeTiming/c123-server/commit/ee0b0e2bfb6945a250791cee9a75a986dd122d50))
* serve dashboard from dot-directory paths and enable CI test step ([#143](https://github.com/OpenCanoeTiming/c123-server/issues/143)) ([9c6167a](https://github.com/OpenCanoeTiming/c123-server/commit/9c6167adf53ea0f04534d35edd1eaf0016474ca4)), closes [#142](https://github.com/OpenCanoeTiming/c123-server/issues/142)

## [0.11.2](https://github.com/OpenCanoeTiming/c123-server/compare/v0.11.1...v0.11.2) (2026-04-29)


### Bug Fixes

* trim bib at XML extraction boundary ([#94](https://github.com/OpenCanoeTiming/c123-server/issues/94)) ([8a4a0d9](https://github.com/OpenCanoeTiming/c123-server/commit/8a4a0d9bbf90f9ec98b6d8e492efa809ee1f6723))

## [0.11.1](https://github.com/OpenCanoeTiming/c123-server/compare/v0.11.0...v0.11.1) (2026-04-22)


### Bug Fixes

* **live:** pulse circuit breaker + latest-wins guard on results ([#92](https://github.com/OpenCanoeTiming/c123-server/issues/92)) ([86f37ac](https://github.com/OpenCanoeTiming/c123-server/commit/86f37accc08a0bcd0bd4fbb940ae44e9e402c954))

## [0.11.0](https://github.com/OpenCanoeTiming/c123-server/compare/v0.10.0...v0.11.0) (2026-04-21)


### Features

* add browseAfterHighlight param to admin UI and client config ([#90](https://github.com/OpenCanoeTiming/c123-server/issues/90)) ([310635b](https://github.com/OpenCanoeTiming/c123-server/commit/310635bcf452ab4a9515eede9114821ed060d434))

## [0.10.0](https://github.com/OpenCanoeTiming/c123-server/compare/v0.9.3...v0.10.0) (2026-04-21)


### Features

* add gates and courseNr fields to REST API results and schedule ([#87](https://github.com/OpenCanoeTiming/c123-server/issues/87)) ([c3d6a90](https://github.com/OpenCanoeTiming/c123-server/commit/c3d6a90f44f9349430c5badcace5e566bf452a3d))

## [0.9.3](https://github.com/OpenCanoeTiming/c123-server/compare/v0.9.2...v0.9.3) (2026-04-21)


### Bug Fixes

* always send scrollToFinished value when saving client config ([1cc018a](https://github.com/OpenCanoeTiming/c123-server/commit/1cc018ae5942e8bab5234e6b6785cb6bfc9f6108)), closes [#83](https://github.com/OpenCanoeTiming/c123-server/issues/83)

## [0.9.2](https://github.com/OpenCanoeTiming/c123-server/compare/v0.9.1...v0.9.2) (2026-04-21)


### Bug Fixes

* fetch correct event status when reconnecting to existing live event ([#84](https://github.com/OpenCanoeTiming/c123-server/issues/84)) ([9ba0ba9](https://github.com/OpenCanoeTiming/c123-server/commit/9ba0ba9172b15f925900f13bb033e5261555a40d)), closes [#79](https://github.com/OpenCanoeTiming/c123-server/issues/79)
