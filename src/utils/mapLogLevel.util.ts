import {EEpSdkLogLevel} from '@solace-labs/ep-sdk';
import {type LogLevel} from '../logger';

export function maptoEPSdkLogLevel(level: LogLevel): EEpSdkLogLevel {
  switch (level) {
    case 'debug':
      return EEpSdkLogLevel.Debug;
    case 'info':
      return EEpSdkLogLevel.Info;
    case 'warn':
      return EEpSdkLogLevel.Warn;
    case 'error':
      return EEpSdkLogLevel.Error;
    default:
      return EEpSdkLogLevel.Silent;
  }
}
