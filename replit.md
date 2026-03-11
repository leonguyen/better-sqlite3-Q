# better-sqlite3

## Overview
A Node.js native addon library providing a fast, synchronous SQLite interface. This is a **library project**, not a web application — it has no frontend or web server.

## Stack
- **Language**: JavaScript + C++ (native Node.js addon)
- **Build Tool**: node-gyp (via `prebuild-install || node-gyp rebuild --release`)
- **Package Manager**: npm
- **Test Framework**: Mocha + Chai
- **Node.js Version**: 20.x

## Project Structure
- `src/` - C++ source files for the native addon
- `lib/` - JavaScript public API wrapper
- `deps/` - Bundled SQLite source and build configs
- `docs/` - API documentation
- `test/` - Mocha test suite (303 passing tests)
- `benchmark/` - Performance benchmarks
- `binding.gyp` - node-gyp build configuration

## Scripts
- `npm install` - Install deps and build the native addon
- `npm test` - Run the Mocha test suite
- `npm run build-release` - Rebuild native addon (release)
- `npm run build-debug` - Rebuild native addon (debug)
- `npm run benchmark` - Run performance benchmarks

## Workflow
The "Start application" workflow runs `npm test` in console mode. There is no web server.

## Notes
- 2 test failures are expected (require debug build of test_extension.node)
- The library loads and works correctly: `require('.')` returns the Database constructor
