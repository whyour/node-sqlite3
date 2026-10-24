'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { family } = require('detect-libc');

function installArgs(platform, arch, libc, armVersion) {
    const args = ['install', '--fallback-to-build'];
    if (platform === 'linux' && arch === 'arm' && libc === 'musl') {
        if (armVersion === 6 || armVersion === 7) {
            args.push('--target_libc=musl-armv' + armVersion);
        } else {
            // An unknown ARM variant must not load a binary for another CPU.
            args.push('--build-from-source');
        }
    }
    return args;
}

function muslArmVersion(nodeArmVersion = process.config.variables.arm_version,
    readFile = fs.readFileSync) {
    const version = Number(nodeArmVersion);
    if (version === 6 || version === 7) return version;

    // Alpine armhf and armv7 both use ld-musl-armhf.so.1. Its name cannot
    // distinguish the CPU variants when Node's build configuration is absent.
    try {
        const alpineArch = String(readFile('/etc/apk/arch', 'utf8')).trim();
        if (alpineArch === 'armhf') return 6;
        if (alpineArch === 'armv7') return 7;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    return NaN;
}

function install() {
    const armVersion = muslArmVersion();
    const cli = require.resolve('@mapbox/node-pre-gyp/bin/node-pre-gyp');
    const result = spawnSync(process.execPath,
        [cli].concat(installArgs(process.platform, process.arch, family, armVersion)),
        { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status === null ? 1 : result.status;
}

if (require.main === module) install();

module.exports = { installArgs, muslArmVersion };
