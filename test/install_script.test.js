'use strict';

var assert = require('assert');
var path = require('path');

var packageJson = require('../package.json');
var installer = require('../tools/install-prebuild');
var installArgs = installer.installArgs;
var versioning = require('@mapbox/node-pre-gyp/lib/util/versioning');

describe('package lifecycle scripts', function() {
    it('resolves node-pre-gyp through the package manager PATH', function() {
        ['build', 'build:debug', 'pack'].forEach(function(script) {
            assert.match(packageJson.scripts[script], /^node-pre-gyp(?:\s|$)/);
            assert.equal(
                packageJson.scripts[script].includes('node_modules/'),
                false,
                script + ' must not assume a hoisted node_modules layout'
            );
        });

        assert.ok(packageJson.dependencies['@mapbox/node-pre-gyp']);

        var nodePreGypPackage = require.resolve('@mapbox/node-pre-gyp/package.json');
        var nodePreGyp = require(nodePreGypPackage);
        assert.equal(nodePreGyp.bin, './bin/node-pre-gyp');
        assert.ok(path.isAbsolute(nodePreGypPackage));
        assert.equal(packageJson.scripts.install, 'node tools/install-prebuild.js');
        assert.ok(packageJson.files.includes('tools/install-prebuild.js'));
    });

    it('selects distinct musl ARM prebuilds and keeps other platforms unchanged', function() {
        assert.equal(installer.muslArmVersion(function(file) {
            return file === '/lib/ld-musl-armhf.so.1';
        }), 6);
        assert.equal(installer.muslArmVersion(function(file) {
            return file === '/lib/libc.musl-armv7.so.1';
        }), 7);
        assert.deepEqual(installArgs('linux', 'arm', 'musl', 6), [
            'install', '--fallback-to-build', '--target_libc=musl-armv6'
        ]);
        assert.deepEqual(installArgs('linux', 'arm', 'musl', 7), [
            'install', '--fallback-to-build', '--target_libc=musl-armv7'
        ]);
        assert.deepEqual(installArgs('linux', 'arm', 'musl', NaN), [
            'install', '--fallback-to-build', '--build-from-source'
        ]);
        assert.deepEqual(installArgs('linux', 'arm', 'glibc', 6), [
            'install', '--fallback-to-build'
        ]);

        var armv6 = versioning.evaluate(packageJson, {
            target_platform: 'linux', target_arch: 'arm', target_libc: 'musl-armv6'
        }, 6);
        var armv7 = versioning.evaluate(packageJson, {
            target_platform: 'linux', target_arch: 'arm', target_libc: 'musl-armv7'
        }, 6);
        assert.equal(armv6.package_name, 'napi-v6-linux-arm-musl-armv6.tar.gz');
        assert.equal(armv7.package_name, 'napi-v6-linux-arm-musl-armv7.tar.gz');
        assert.equal(armv6.module_path, armv7.module_path);
    });
});
