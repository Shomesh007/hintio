const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const fs = require('fs');
const path = require('path');

const { windowsSigningOptions } = require('./scripts/windows-signing');
const storeBuild = process.env.HINTIO_DISTRIBUTION === 'store';
const windowsSign = storeBuild ? undefined : windowsSigningOptions();
const store = storeBuild ? require('./scripts/store-manifest').prepareStore() : null;
const remoteReleases = process.env.SQUIRREL_REMOTE_RELEASES;

const baseDir = __dirname;
const extraResource = storeBuild ? [] : [path.join(baseDir, 'src/assets/SystemAudioDump')];
const optionalWindowsBundle = path.join(baseDir, 'build/windows');
if (fs.existsSync(optionalWindowsBundle)) {
    extraResource.push(optionalWindowsBundle);
}

const requiredVcRuntimeDlls = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'];

function resolveSystemDllPath(fileName) {
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const searchDirs = [path.join(systemRoot, 'System32'), path.join(systemRoot, 'SysWOW64')];

    for (const dir of searchDirs) {
        const candidate = path.join(dir, fileName);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function copyVcRuntimeDllsToApp(appPath) {
    const missingSources = [];

    for (const dllName of requiredVcRuntimeDlls) {
        const sourcePath = resolveSystemDllPath(dllName);
        if (!sourcePath) {
            missingSources.push(dllName);
            continue;
        }

        const targetPath = path.join(appPath, dllName);
        fs.copyFileSync(sourcePath, targetPath);
    }

    if (missingSources.length > 0) {
        throw new Error(`Missing VC++ runtime DLLs on build machine: ${missingSources.join(', ')}`);
    }
}

function resolvePackagedOutputPaths(options = {}) {
    if (Array.isArray(options.outputPaths)) return options.outputPaths;
    if (typeof options.outputPath === 'string' && options.outputPath) return [options.outputPath];
    return [];
}

module.exports = {
    packagerConfig: {
        ignore: [
            ...(storeBuild
                ? [
                      /^\/node_modules\/onnxruntime-node\/bin\/napi-v3\/(?:darwin|linux)(?:\/|$)/,
                      /^\/node_modules\/onnxruntime-node\/bin\/napi-v3\/win32\/(?:arm64|x86)(?:\/|$)/,
                  ]
                : []),
            /^\/forge\.config\.js$/,
            /^\/(?:packaging|hintio-website|design|supabase|test|scripts|out|logs|prep|\.git|\.codex|\.agents|\.cache|\.npm|\.specstory)(?:\/|$)/,
            /^\/src\/(?:data|profiles\/[^/]+\.local\.js)(?:\/|$)/,
            /(?:^|\/)\.env(?:[./]|$)/,
            /^\/[^/]+\.(?:md|pfx|p12|pem|key|log)$/i,
        ],
        ...(storeBuild
            ? {
                  afterCopy: [
                      (appPath, electronVersion, platform, arch, done) => {
                          fs.writeFile(path.join(appPath, 'distribution.json'), JSON.stringify({ channel: 'microsoft-store' }), done);
                      },
                  ],
              }
            : {}),
        asar: {
            unpack: '**/{onnxruntime-node,onnxruntime-common,@huggingface/transformers,sharp,@img}/**',
        },
        extraResource,
        name: 'Hintio',
        win32metadata: {
            CompanyName: 'Hintio',
            FileDescription: 'Hintio',
            OriginalFilename: 'Hintio.exe',
            ProductName: 'Hintio',
            InternalName: 'Hintio',
        },
        icon: 'src/assets/logo',
        ...(!storeBuild && windowsSign ? { windowsSign } : {}),
        // use `security find-identity -v -p codesigning` to find your identity
        // for macos signing
        // also fuck apple
        // osxSign: {
        //    identity: '<paste your identity here>',
        //   optionsForFile: (filePath) => {
        //       return {
        //           entitlements: 'entitlements.plist',
        //       };
        //   },
        // },
        // notarize if off cuz i ran this for 6 hours and it still didnt finish
        // osxNotarize: {
        //    appleId: 'your apple id',
        //    appleIdPassword: 'app specific password',
        //    teamId: 'your team id',
        // },
    },
    rebuildConfig: {},
    hooks: {
        postPackage: async (forgeConfig, options) => {
            const outputPaths = resolvePackagedOutputPaths(options);
            if (outputPaths.length === 0) {
                throw new Error('No packaged output paths found in postPackage hook');
            }

            for (const appPath of outputPaths) {
                if (process.platform === 'win32') {
                    copyVcRuntimeDllsToApp(appPath);
                }
            }
        },
    },
    makers: storeBuild
        ? [
              {
                  name: '@electron-forge/maker-msix',
                  config: {
                      appManifest: store.manifest,
                      packageAssets: path.join(baseDir, 'packaging', 'store', 'assets'),
                      windowsKitPath: process.env.HINTIO_WINDOWS_KIT_PATH || path.join(baseDir, '.cache', 'msix-sdk', 'bin', '10.0.28000.0', 'x64'),
                      sign: false,
                      createPri: true,
                      logLevel: 'warn',
                  },
              },
          ]
        : [
              {
                  name: '@electron-forge/maker-squirrel',
                  config: {
                      name: 'Hintio',
                      productName: 'Hintio',
                      shortcutName: 'Hintio',
                      ...(windowsSign ? { windowsSign } : {}),
                      createDesktopShortcut: true,
                      createStartMenuShortcut: true,
                      ...(remoteReleases ? { remoteReleases } : {}),
                  },
              },
              {
                  name: '@electron-forge/maker-zip',
                  platforms: ['win32'],
              },
              {
                  name: '@electron-forge/maker-dmg',
                  platforms: ['darwin'],
              },
              {
                  name: '@reforged/maker-appimage',
                  platforms: ['linux'],
                  config: {
                      options: {
                          name: 'Hintio',
                          productName: 'Hintio',
                          genericName: 'AI Assistant',
                          description: 'AI assistant for interviews and learning',
                          categories: ['Development', 'Education'],
                          icon: 'src/assets/logo.png',
                      },
                  },
              },
          ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};
