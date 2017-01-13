const winston = require('winston');
// Add the logger
const logger = new (winston.Logger)({
  transports: [
    // colorize the output to the console
    new (winston.transports.Console)({ colorize: true }),
  ],
});
logger.level = process.env.LOG_LEVEL || 'info';

module.exports = {
  getGlobalConfig,
  getCascadedConfig,
};

let config = null;

function getGlobalConfig() {
  // This function reads in all configs and merges them
  /* eslint-disable global-require */
  const defaultConfig = require('./defaults');
  let customConfig = {};
  try {
    customConfig = require('../../config'); // eslint-disable-line import/no-unresolved
  } catch (err) {
    // Do nothing
    logger.verbose('No custom config found');
  }
  /* eslint-enable global-require */
  const cliConfig = {};
  if (process.env.LOG_LEVEL) {
    cliConfig.logLevel = process.env.LOG_LEVEL;
  }
  if (process.env.RENOVATE_TOKEN) {
    cliConfig.token = process.env.RENOVATE_TOKEN;
  }
  // Check if repository name and package file are provided via CLI
  if (process.argv[2]) {
    cliConfig.repositories = [
      {
        repository: process.argv[2],
        packageFiles: [process.argv[3] || 'package.json'],
      },
    ];
  }
  // Set global config
  config = Object.assign({}, defaultConfig, customConfig, cliConfig);
  // Set log level
  logger.level = config.logLevel;

  // token must be defined
  if (typeof config.token === 'undefined') {
    logger.error('Error: A GitHub token must be configured');
    process.exit(1);
  }
  // We need at least one repository defined
  if (!config.repositories || config.repositories.length === 0) {
    logger.error('Error: At least one repository must be configured');
    process.exit(1);
  }
  // Convert any repository strings to objects
  config.repositories.forEach((repo, index) => {
    if (typeof repo === 'string') {
      config.repositories[index] = { repository: repo };
    }
  });
  // Add 'package.json' if missing
  config.repositories.forEach((repo, index) => {
    if (!repo.packageFiles || !repo.packageFiles.length) {
      config.repositories[index].packageFiles = ['package.json'];
    }
  });
  // Expand packageFile format
  config.repositories.forEach((repo, index) => {
    config.repositories[index].packageFiles = repo.packageFiles.map((packageFile) => {
      if (typeof packageFile === 'string') {
        return { fileName: packageFile };
      }
      return packageFile;
    });
  });
  // Print config
  logger.verbose(`config=${JSON.stringify(config)}`);

  // Add logger to config
  config.logger = logger;

  // Save default templates
  config.defaultTemplates = defaultConfig.templates;

  return config;
}

function getCascadedConfig(repo, packageFile) {
  const cascadedConfig = Object.assign({}, config, repo, packageFile);
  // Fill in any missing templates with defaults
  cascadedConfig.templates = Object.assign({}, config.defaultTemplates, cascadedConfig.templates);
  // Remove unnecessary fields
  delete cascadedConfig.repositories;
  delete cascadedConfig.repository;
  delete cascadedConfig.fileName;
  return cascadedConfig;
}
