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

function muslArmVersion(exists = fs.existsSync) {
    for (const [version, name] of [[6, 'armhf'], [7, 'armv7']]) {
        if (exists('/lib/ld-musl-' + name + '.so.1') ||
            exists('/lib/libc.musl-' + name + '.so.1')) return version;
    }
    return Number(process.config.variables.arm_version);
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
