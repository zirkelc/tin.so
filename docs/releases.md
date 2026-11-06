# Releases

[Release Please](https://github.com/googleapis/release-please-action) makes the releases from conventional commits (`feat:`, `fix:` and so on). `@tin.so/core` and `tin.so` always get the same version.

1. A push to `main` runs the `release` job in `.github/workflows/ci.yml`. It opens or updates a release PR with the new versions and the changelogs.
2. When you merge the release PR, Release Please makes the tags (`core-v…`, `cli-v…`) and the GitHub releases.
3. A published GitHub release runs `.github/workflows/release.yml`. It publishes each package whose version is not on npm yet, with npm Trusted Publishing and provenance. Do not rename this file, because npm checks its name.

The setup needs a `RELEASE_PLEASE_TOKEN` secret (a fine-grained PAT with read and write access to `Contents` and `Pull requests`), and a Trusted Publisher for `zirkelc/tin.so` and `release.yml` on the npm access page of each package.

The web editor is not part of a release. Deploy it with `pnpm run deploy`.
