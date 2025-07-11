#!/usr/bin/env node

import {boolean, string, run} from '@drizzle-team/brocli';
import {createLogger, LogLevel} from '@tklein1801/logger.js';
import {EpSdkClient, EpSdkConsoleLogger} from '@solace-labs/ep-sdk';
import {maptoEPSdkLogLevel} from './utils/mapLogLevel.util';
import {exportCmd} from './commands/export.cmd';
import fs from 'fs';
import {OpenAPI as EpOpenApi} from '@solace-labs/ep-openapi-node';
import {OpenAPI as EpRtOpenApi} from '@solace-labs/ep-rt-openapi-node';
import path from 'path';
import {name as CLI_NAME, description as CLI_DESCRIPTION, version as CLI_VERSION} from '../package.json';

const DEFAULT_LOG_LEVEL: LogLevel = LogLevel.INFO;
export const logger = createLogger({scope: 'cli', level: DEFAULT_LOG_LEVEL});
const epSdkConsoleLogger = new EpSdkConsoleLogger(CLI_NAME, maptoEPSdkLogLevel(DEFAULT_LOG_LEVEL));

run([exportCmd], {
  name: CLI_NAME,
  description: CLI_DESCRIPTION,
  version: () => {
    const envVersion = CLI_VERSION;
    console.log(envVersion);
  },
  globals: {
    verbose: boolean().desc('Enable verbose output').default(false),
    silent: boolean().desc('Enable silent mode. This will overrule verbose').default(false),
    solaceCloudToken: string().desc('Solace Cloud Token'),
    secretFile: string().desc('Path to an optional secret file which contains the Solace Cloud Token'),
  },
  hook(event, _command, options) {
    switch (event) {
      case 'before':
        // Keep this code as far up as possible in order to log as much as possible when executing with the verbose flag
        if (options.verbose && !options.silent) {
          const logLevel: LogLevel = LogLevel.DEBUG;
          // Set log level to debug if verbose is enabled
          logger.setLogLevel(logLevel);
          epSdkConsoleLogger.setLogLevel(maptoEPSdkLogLevel(logLevel));
        } else if (options.silent) {
          logger.setLogLevel(LogLevel.SILENT);
          epSdkConsoleLogger.setLogLevel(maptoEPSdkLogLevel(LogLevel.SILENT));
        }

        try {
          let cliToken = process.env.SOLACE_CLOUD_TOKEN || process.env.CLI_SOLACE_CLOUD_TOKEN;
          if (options.solaceCloudToken) {
            cliToken = options.solaceCloudToken;
            logger.debug('Using Solace Cloud Token from command line option');
          }
          if (options.secretFile) {
            const filePath = path.resolve(options.secretFile);
            if (!fs.existsSync(filePath)) {
              logger.error('Secret file not found: ' + options.secretFile);
            }

            const file = fs.readFileSync(filePath, {encoding: 'utf-8'});
            cliToken = file.trim();
            console.log(file);
            logger.debug('Using Solace Cloud Token from secret file: ' + options.secretFile);
          }

          if (!cliToken) {
            logger.error('No Solace Cloud Token found');
            process.exit(1);
          } else logger.debug('Using ' + cliToken + ' as Solace Cloud Token');

          EpSdkClient.initialize({
            globalEpOpenAPI: EpOpenApi,
            globalEpRtOpenAPI: EpRtOpenApi,
            token: cliToken,
          });
          logger.debug(`EP Client initialized`);
        } catch (e) {
          throw new Error(`initializing ep client: ${e}`);
        }
        break;

      case 'after':
        const logLevel: LogLevel = LogLevel.INFO;
        // Set log level to default log level after command execution
        logger.setLogLevel(logLevel);
        epSdkConsoleLogger.setLogLevel(maptoEPSdkLogLevel(logLevel));
        break;
    }
  },
});
