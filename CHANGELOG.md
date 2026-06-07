# Changelog

## [0.11.3](https://github.com/OpenCanoeTiming/c123-server/compare/v0.11.2...v0.11.3) (2026-06-07)


### Bug Fixes

* remove deprecated baseUrl from tsconfig (TS 6.0 compat) ([ee0b0e2](https://github.com/OpenCanoeTiming/c123-server/commit/ee0b0e2bfb6945a250791cee9a75a986dd122d50))

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
