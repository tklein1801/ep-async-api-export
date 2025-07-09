import path from 'path';
import fs from 'fs';
import {logger} from '../cli';

/**
 * Write content to a file
 * @param content The content to write to the output file
 * @param outputPath The path to the output file
 */
export function writeOutput(content: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }

  fs.writeFileSync(outputPath, content, {encoding: 'utf8'});
  logger.info('Output written to: ' + outputPath);
}
