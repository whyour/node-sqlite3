'use strict';

const fs = require('fs');
const path = require('path');
const NodePreGypGithub = require('node-pre-gyp-github');

function releaseTag(packageJson) {
    if (packageJson.binary && packageJson.binary.remote_path) {
        return packageJson.binary.remote_path.replace(
            /\{version\}/g,
            packageJson.version
        );
    }
    return packageJson.version;
}

async function listRelease(publisher, tag) {
    const response = await publisher.octokit.rest.repos.listReleases({
        owner: publisher.owner,
        repo: publisher.repo,
        per_page: 100
    });
    return response.data.find(function(release) {
        return release.tag_name === tag;
    });
}

async function createOrFindRelease(publisher, tag, targetCommitish) {
    var release = await listRelease(publisher, tag);
    if (release) return release;

    try {
        const response = await publisher.createRelease({
            tag_name: tag,
            target_commitish: targetCommitish,
            name: tag,
            draft: false,
            prerelease: false
        });
        return response.data;
    } catch (err) {
        // Parallel matrix jobs may race to create the same release.
        if (err.status !== 422) throw err;
        release = await listRelease(publisher, tag);
        if (!release) throw err;
        return release;
    }
}

async function publish(publisher) {
    publisher = publisher || new NodePreGypGithub();
    publisher.init();

    const tag = releaseTag(publisher.package_json);
    const targetCommitish = process.env.GITHUB_SHA ||
        process.env.GITHUB_REF_NAME || 'release';
    var release = await createOrFindRelease(
        publisher,
        tag,
        targetCommitish
    );

    if (release.draft) {
        const response = await publisher.octokit.rest.repos.updateRelease({
            owner: publisher.owner,
            repo: publisher.repo,
            release_id: release.id,
            tag_name: tag,
            target_commitish: targetCommitish,
            name: tag,
            draft: false,
            prerelease: false
        });
        release = response.data;
        console.log('Published existing draft release ' + tag);
    }

    const stageDir = path.join(publisher.stage_dir, tag);
    const files = fs.readdirSync(stageDir);
    if (!files.length) {
        throw new Error('No prebuilds found in ' + stageDir);
    }

    for (const file of files) {
        const existing = release.assets.find(function(asset) {
            return asset.name === file;
        });
        if (existing) {
            await publisher.octokit.rest.repos.deleteReleaseAsset({
                owner: publisher.owner,
                repo: publisher.repo,
                asset_id: existing.id
            });
            console.log('Replacing existing release asset ' + file);
        }

        await publisher.octokit.rest.repos.uploadReleaseAsset({
            owner: publisher.owner,
            repo: publisher.repo,
            release_id: release.id,
            name: file,
            data: fs.readFileSync(path.join(stageDir, file))
        });
        console.log('Uploaded ' + file + ' to release ' + tag);
    }
}

if (require.main === module) {
    publish().catch(function(err) {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    createOrFindRelease: createOrFindRelease,
    publish: publish,
    releaseTag: releaseTag
};
