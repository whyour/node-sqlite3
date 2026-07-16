'use strict';

var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var publishPrebuild = require('../tools/publish-prebuild');

describe('prebuild release publishing', function() {
    it('publishes a draft and replaces an existing asset', async function() {
        var root = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite3-publish-'));
        var stageDir = path.join(root, 'v1.1.0');
        var calls = [];
        fs.mkdirSync(stageDir);
        fs.writeFileSync(path.join(stageDir, 'prebuild.tar.gz'), 'binary');

        var draft = {
            id: 123,
            tag_name: 'v1.1.0',
            draft: true,
            assets: [{ id: 456, name: 'prebuild.tar.gz' }]
        };
        var publisher = {
            init: function() {},
            owner: 'whyour',
            repo: 'node-sqlite3',
            stage_dir: root,
            package_json: {
                version: '1.1.0',
                binary: { remote_path: 'v{version}' }
            },
            octokit: {
                rest: {
                    repos: {
                        listReleases: async function() {
                            return { data: [draft] };
                        },
                        updateRelease: async function(options) {
                            calls.push(['update', options]);
                            return { data: Object.assign({}, draft, { draft: false }) };
                        },
                        deleteReleaseAsset: async function(options) {
                            calls.push(['delete', options]);
                        },
                        uploadReleaseAsset: async function(options) {
                            calls.push(['upload', options]);
                        }
                    }
                }
            }
        };

        await publishPrebuild.publish(publisher);

        assert.deepEqual(calls.map(function(call) { return call[0]; }), [
            'update',
            'delete',
            'upload'
        ]);
        assert.equal(calls[0][1].draft, false);
        assert.equal(calls[2][1].name, 'prebuild.tar.gz');
        fs.rmSync(root, { recursive: true, force: true });
    });
});
