import {EEpSdkLogLevel} from '@solace-labs/ep-sdk';
import {LogLevel} from '@tklein1801/logger.js';

export function maptoEPSdkLogLevel(level: LogLevel): EEpSdkLogLevel {
  switch (level) {
    case LogLevel.DEBUG:
      return EEpSdkLogLevel.Debug;
    case LogLevel.INFO:
      return EEpSdkLogLevel.Info;
    case LogLevel.WARN:
      return EEpSdkLogLevel.Warn;
    case LogLevel.ERROR:
      return EEpSdkLogLevel.Error;
    case LogLevel.FATAL:
      return EEpSdkLogLevel.FatalError;
    case LogLevel.SILENT:
      return EEpSdkLogLevel.Silent;
  }
}
