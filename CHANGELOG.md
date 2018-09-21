# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/nodejs-common-grpc?activeTab=versions

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

