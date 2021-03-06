# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] 2022-02-15

### Fixed
- lock dependencies fixed -> npm audit fix (follow-redirects, pathval)

### Added
- Add @types/adm-zip as prod dependency

## [0.0.2] 2022-02-13

### Fixed
- Fix example/README.md in order to make it more understandable
- Fix Snyk vulnerabilty ([Security upgrade adm-zip from 0.4.16 to 0.5.2](https://github.com/Zepoze/manladag-core/pull/1))

### Changed
- Logic about example folder : lib/example -> example/ and ts-node to run it
- Reword README and CHANGELOG
- Change cover script approach
- Change test script approach

### Removed
- Surge use on Travis

## 0.0.1 2022-02-06

### Added
- Creation of the Manladag Core worthy successor of [@manladag/source](https://github.com/Zepoze/manladag-source)
- All Unit tests 
- typedoc's documentation generator
- Travis integration

[0.1.0]: https://github.com/Zepoze/manladag-core/compare/v0.0.2...v0.1.0
[0.0.2]: https://github.com/Zepoze/manladag-core/compare/v0.0.1...v0.0.2