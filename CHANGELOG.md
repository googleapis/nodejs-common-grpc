# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/nodejs-common-grpc?activeTab=versions

### [1.0.3](https://www.github.com/googleapis/nodejs-common-grpc/compare/v1.0.2...v1.0.3) (2019-06-26)


### Bug Fixes

* **docs:** link to reference docs section on googleapis.dev ([#254](https://www.github.com/googleapis/nodejs-common-grpc/issues/254)) ([aa04413](https://www.github.com/googleapis/nodejs-common-grpc/commit/aa04413))

### [1.0.2](https://www.github.com/googleapis/nodejs-common-grpc/compare/v1.0.1...v1.0.2) (2019-06-14)


### Bug Fixes

* **docs:** move to new client docs URL ([#251](https://www.github.com/googleapis/nodejs-common-grpc/issues/251)) ([d8f8b0c](https://www.github.com/googleapis/nodejs-common-grpc/commit/d8f8b0c))

### [1.0.1](https://www.github.com/googleapis/nodejs-common-grpc/compare/v1.0.0...v1.0.1) (2019-06-05)


### Bug Fixes

* **deps:** update dependency @google-cloud/common to v2 ([#246](https://www.github.com/googleapis/nodejs-common-grpc/issues/246)) ([e0cce58](https://www.github.com/googleapis/nodejs-common-grpc/commit/e0cce58))

## [1.0.0](https://www.github.com/googleapis/nodejs-common-grpc/compare/v0.10.1...v1.0.0) (2019-05-10)


### Bug Fixes

* upgrade to grpc-js ([#240](https://www.github.com/googleapis/nodejs-common-grpc/issues/240)) ([a2e03d3](https://www.github.com/googleapis/nodejs-common-grpc/commit/a2e03d3))
* **deps:** update dependency @google-cloud/common to ^0.32.0 ([4fd67f4](https://www.github.com/googleapis/nodejs-common-grpc/commit/4fd67f4)), closes [#8203](https://www.github.com/googleapis/nodejs-common-grpc/issues/8203)
* **deps:** update dependency @google-cloud/projectify to v1 ([#232](https://www.github.com/googleapis/nodejs-common-grpc/issues/232)) ([34fb9e7](https://www.github.com/googleapis/nodejs-common-grpc/commit/34fb9e7))
* **deps:** update dependency @google-cloud/promisify to v1 ([#233](https://www.github.com/googleapis/nodejs-common-grpc/issues/233)) ([8e6549b](https://www.github.com/googleapis/nodejs-common-grpc/commit/8e6549b))
* **deps:** update dependency @grpc/proto-loader to ^0.5.0 ([#224](https://www.github.com/googleapis/nodejs-common-grpc/issues/224)) ([06c736e](https://www.github.com/googleapis/nodejs-common-grpc/commit/06c736e))


### Build System

* upgrade engines field to >=8.10.0 ([#230](https://www.github.com/googleapis/nodejs-common-grpc/issues/230)) ([f3deec6](https://www.github.com/googleapis/nodejs-common-grpc/commit/f3deec6))


### Features

* allow passing grpc in service constructor ([#241](https://www.github.com/googleapis/nodejs-common-grpc/issues/241)) ([1815d40](https://www.github.com/googleapis/nodejs-common-grpc/commit/1815d40))


### BREAKING CHANGES

* switches from grpc to @grpc/grpc-js. @grpc/grpc-js is a functionally equivalent pure-JS implementation, but does have some differences in its API surface. Also, @grpc/grpc-js requires http2 support so only works in Node.js v8.9+.
* upgrade to grpc-js (#240)
* upgrade engines field to >=8.10.0 (#230)

## v0.10.1

03-13-2019 21:40 PDT

### Dependencies
- fix(deps): update dependency @google-cloud/promisify to ^0.4.0 ([#207](https://github.com/googleapis/nodejs-common-grpc/pull/207))
- fix(deps): update dependency @google-cloud/common to ^0.31.0 ([#200](https://github.com/googleapis/nodejs-common-grpc/pull/200))
- fix(deps): update dependency duplexify to v4 ([#198](https://github.com/googleapis/nodejs-common-grpc/pull/198))

### Documentation
- docs: update links in contrib guide ([#208](https://github.com/googleapis/nodejs-common-grpc/pull/208))
- docs: update contributing path in README ([#203](https://github.com/googleapis/nodejs-common-grpc/pull/203))
- docs: move CONTRIBUTING.md to root ([#202](https://github.com/googleapis/nodejs-common-grpc/pull/202))
- docs: add lint/fix example to contributing guide ([#199](https://github.com/googleapis/nodejs-common-grpc/pull/199))

### Internal / Testing Changes
- build: Add docuploader credentials to node publish jobs ([#212](https://github.com/googleapis/nodejs-common-grpc/pull/212))
- build: use node10 to run samples-test, system-test etc ([#211](https://github.com/googleapis/nodejs-common-grpc/pull/211))
- chore(deps): update dependency mocha to v6
- build: use linkinator for docs test ([#206](https://github.com/googleapis/nodejs-common-grpc/pull/206))
- build: create docs test npm scripts ([#205](https://github.com/googleapis/nodejs-common-grpc/pull/205))
- build: test using @grpc/grpc-js in CI ([#204](https://github.com/googleapis/nodejs-common-grpc/pull/204))

## v0.10.0

01-28-2019 13:51 PST

### Dependencies
- fix(deps): update dependency @google-cloud/common to ^0.30.0 ([#195](https://github.com/googleapis/nodejs-common-grpc/pull/195))
- fix(deps): update dependency @grpc/proto-loader to ^0.4.0 ([#193](https://github.com/googleapis/nodejs-common-grpc/pull/193))
- fix(deps): update dependency through2 to v3 ([#155](https://github.com/googleapis/nodejs-common-grpc/pull/155))

### Documentation
- docs: update readme badges ([#173](https://github.com/googleapis/nodejs-common-grpc/pull/173))

### Internal / Testing Changes
- refactor: use Object.assign where possible ([#158](https://github.com/googleapis/nodejs-common-grpc/pull/158))

## v0.9.2

### Bug fixes
- fix: add typing for ignored request methods ([#149](https://github.com/googleapis/nodejs-common-grpc/pull/149))

## v0.9.1

This patch release includes a variety of TypeScript type fixes.

### Fixes
- fix: make encodeValue_ and decodeValue_ public ([#142](https://github.com/googleapis/nodejs-common-grpc/pull/142))
- fix: enable noImplicitAny ([#145](https://github.com/googleapis/nodejs-common-grpc/pull/145))

### Dependencies
- fix(deps): update dependency @google-cloud/common to ^0.26.0 ([#135](https://github.com/googleapis/nodejs-common-grpc/pull/135))

### Internal / Testing Changes
- chore: include build in eslintignore ([#147](https://github.com/googleapis/nodejs-common-grpc/pull/147))
- chore(build): target es6 with TypeScript build ([#140](https://github.com/googleapis/nodejs-common-grpc/pull/140))
- chore: update issue templates ([#139](https://github.com/googleapis/nodejs-common-grpc/pull/139))
- chore: remove old issue template ([#137](https://github.com/googleapis/nodejs-common-grpc/pull/137))
- build: run tests on node11 ([#136](https://github.com/googleapis/nodejs-common-grpc/pull/136))
- chores(build): do not collect sponge.xml from windows builds ([#134](https://github.com/googleapis/nodejs-common-grpc/pull/134))
- chores(build): run codecov on continuous builds ([#133](https://github.com/googleapis/nodejs-common-grpc/pull/133))
- chore: update new issue template ([#132](https://github.com/googleapis/nodejs-common-grpc/pull/132))
- chore(deps): update dependency sinon to v7 ([#128](https://github.com/googleapis/nodejs-common-grpc/pull/128))
- build: fix codecov uploading on Kokoro ([#129](https://github.com/googleapis/nodejs-common-grpc/pull/129))
- Update CI config ([#126](https://github.com/googleapis/nodejs-common-grpc/pull/126))
- chore(deps): update dependency typescript to ~3.1.0 ([#124](https://github.com/googleapis/nodejs-common-grpc/pull/124))
- Update CI config ([#123](https://github.com/googleapis/nodejs-common-grpc/pull/123))
- Don't publish sourcemaps ([#121](https://github.com/googleapis/nodejs-common-grpc/pull/121))
- build: prevent system/sample-test from leaking credentials
- Update the kokoro config ([#119](https://github.com/googleapis/nodejs-common-grpc/pull/119))
- test: remove appveyor config ([#118](https://github.com/googleapis/nodejs-common-grpc/pull/118))
- Update CI config ([#117](https://github.com/googleapis/nodejs-common-grpc/pull/117))

## v0.9.0

### Implementation Changes
- fix(deps): upgrade to the latest @google-cloud/common and grpc ([#115](https://github.com/googleapis/nodejs-common-grpc/pull/115))
- fix(deps): update dependency @google-cloud/common to ^0.24.0 ([#109](https://github.com/googleapis/nodejs-common-grpc/pull/109))

### Internal / Testing Changes
- Enable prefer-const in the eslint config ([#114](https://github.com/googleapis/nodejs-common-grpc/pull/114))
- Enable no-var in eslint ([#112](https://github.com/googleapis/nodejs-common-grpc/pull/112))
- Update CI config ([#111](https://github.com/googleapis/nodejs-common-grpc/pull/111))
- Enable gts lint ([#110](https://github.com/googleapis/nodejs-common-grpc/pull/110))
- Add synth file and update CI ([#107](https://github.com/googleapis/nodejs-common-grpc/pull/107))
- Retry npm install in CI ([#106](https://github.com/googleapis/nodejs-common-grpc/pull/106))

## v0.8.0

**THIS RELEASE HAS BREAKING CHANGES**.  Some of the most notable changes include:
- Dropped support for node.js 4.x and 9.x
- The upgrade to the latest @google-cloud/common came with a variety of breaking changes in the `util` namespace

### Breaking Changes
- fix: drop support for node.js 4.x and 9.x (#86)
- chore: upgrade to the latest @google-cloud/common (#102)

### Bug Fixes
- fix: improve the types a bit (#100)
- ObjectToStructConverter: handle host objects (#94)
- fix: update linking for samples (#84)

### Internal / Testing Changes
- chore(deps): update dependency nyc to v13 (#103)
- chore: upgrade to the latest @google-cloud/common (#99)
- chore: ignore package-lock.json (#98)
- chore: update renovate config (#96)
- remove that whitespace (#95)
- chore(deps): update dependency typescript to v3 (#93)
- chore: assert.deelEqual => assert.deepStrictEqual (#92)
- chore: update dependencies (#89)
- chore: move mocha options to mocha.opts (#91)
- chore(deps): update dependency gts to ^0.8.0 (#88)
- Configure Renovate (#83)
- refactor: drop repo-tool as an exec wrapper (#85)
