'use strict';

var assert = require('assert');
var path = require('path');

var packageJson = require('../package.json');

describe('package lifecycle scripts', function() {
    it('resolve node-pre-gyp through the package manager PATH', function() {
        ['build', 'build:debug', 'install', 'pack'].forEach(function(script) {
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
    });
});
