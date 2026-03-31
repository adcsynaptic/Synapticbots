// Needed so Metro can resolve `@synaptic/shared` from the symlinked monorepo folder.
// Without this, Metro sometimes fails with "Unable to resolve @synaptic/shared".
const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../packages/shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([...(config.watchFolders || []), sharedRoot]));
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = Array.from(
  new Set([...(config.resolver.nodeModulesPaths || []), path.join(projectRoot, 'node_modules'), sharedRoot])
);

module.exports = config;

