import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerDMG } from '@electron-forge/maker-dmg'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { PublisherGithub } from '@electron-forge/publisher-github'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './build/icon',
    extraResource: ['./resources'],
    appBundleId: 'app.yancey.exodus',
    appCategoryType: 'public.app-category.utilities',
    // macOS permission prompts' purpose strings (carried over from
    // universal-client's electron-builder `mac.extendInfo`). Signing with
    // build/entitlements.mac.plist isn't wired (`osxSign`) — this repo
    // doesn't sign builds yet; add it together with a signing identity.
    extendInfo: {
      NSCameraUsageDescription:
        "Application requests access to the device's camera.",
      NSMicrophoneUsageDescription:
        "Application requests access to the device's microphone.",
      NSDocumentsFolderUsageDescription:
        "Application requests access to the user's Documents folder.",
      NSDownloadsFolderUsageDescription:
        "Application requests access to the user's Downloads folder."
    },
    // @electron-forge/plugin-vite normally sets `ignore` itself, excluding
    // everything except `.vite/**` on the assumption the whole app is
    // bundled into it. That breaks `@electric-sql/pglite` (and its two
    // extension packages), which vite.main.config.mts deliberately keeps
    // external — PGlite resolves its own WASM/data assets relative to its
    // real package location (via `__filename`) at runtime, which only
    // works if those real, unbundled files are actually shipped. Providing
    // our own `ignore` here (matching the plugin's default, plus these
    // three packages) opts out of the plugin's auto-injection — verified
    // by reading VitePlugin.js's resolveForgeConfig, which only overrides
    // `ignore` when packagerConfig.ignore is unset.
    ignore: (file: string) => {
      if (!file) return false
      if (file.startsWith('/.vite')) return false
      // Ancestor directories (e.g. `/node_modules`) must also be kept, not
      // just the leaf files — the packager's walker prunes recursion at
      // the first ignored directory, so allowing only the deep path left
      // nothing on disk to recurse into. Verified by an empty asar listing
      // with only the leaf-path check in place.
      const target = '/node_modules/@electric-sql'
      if (
        file === target ||
        file.startsWith(`${target}/`) ||
        target.startsWith(file)
      ) {
        return false
      }
      return true
    }
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ setupIcon: './build/icon.ico' }),
    // ZIP feeds the auto-updater (update.electronjs.org needs
    // `*-darwin-*.zip`); the DMG is what people download.
    new MakerZIP({}, ['darwin']),
    new MakerDMG({}, ['darwin']),
    // The packager names the Linux executable after `productName` ("Exodus"),
    // but these two makers default `bin` to package.json's `name` ("exodus")
    // and fail with "could not find the Electron app binary" — Linux paths are
    // case-sensitive (macOS and Windows aren't, which is why only the Linux
    // release job caught it). The /usr/bin launcher they install stays `exodus`.
    new MakerRpm({ options: { bin: 'Exodus' } }),
    new MakerDeb({ options: { bin: 'Exodus' } })
  ],
  // Manual publishing to GitHub Releases — the prerequisite for the free
  // update.electronjs.org auto-update service (see lib/auto-updater.ts, which
  // derives the repo from package.json's `repository`, so keep the two in
  // sync). Auth: set GITHUB_TOKEN when running `electron-forge publish`.
  // CI does not use this: .github/workflows/release.yml builds with `make`
  // and lets semantic-release create the release, then attaches the assets.
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'exodus-ai-org',
        name: 'exodus'
      }
    })
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry`'s basename drives the output filename ([name].js) —
          // it must be `main`/`preload` to match `target`, not `index`.
          entry: 'src/main/main.ts',
          config: 'vite.main.config.mts',
          target: 'main'
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts'
        }
      ]
    }),
    // Unpacks native (.node) modules from the asar at package time — they
    // can't be dlopen'd from inside the archive. No-op until a dependency
    // actually ships one, but wiring it now means nobody has to remember to
    // add it later.
    new AutoUnpackNativesPlugin({}),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}

export default config
