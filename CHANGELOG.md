# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/nodejs-common-grpc?activeTab=versions

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

