/* eslint-disable import/no-extraneous-dependencies */
import minimist from 'minimist';
import path from 'path';
import { glob } from 'glob';
import { consola } from 'consola';
import fs from 'fs';

import { converter } from './converter';

function findFoldersWithTsxFiles(directory: string) {
  const foldersWithTsxFiles: string[] = [];
  const filesAndFolders = fs.readdirSync(directory);

  for (const item of filesAndFolders) {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      const subfolderContainsTsxFiles = findFoldersWithTsxFiles(itemPath);

      if (subfolderContainsTsxFiles.length > 0) {
        foldersWithTsxFiles.push(...subfolderContainsTsxFiles);
      }
    } else if (stats.isFile() && itemPath.endsWith('.tsx')) {
      foldersWithTsxFiles.push(directory);
      break;
    }
  }

  return foldersWithTsxFiles;
}

const getPatterns = () => {
  const CONSTEL = process.env.CONSTEL;
  const userArgs = process.argv.slice(2);

  if (userArgs.length > 0) {
    return userArgs;
  }

  if (CONSTEL == null) {
    return ['JSDemos/Demos/**/React'];
  }

  const [current, total] = CONSTEL.split('/').map(Number);

  // When all React TS demos merged, change to just folders
  const convertedDemos = findFoldersWithTsxFiles('JSDemos/Demos');
  const filteredDemos = convertedDemos.filter((_, index) => index % total === current - 1);

  return filteredDemos.map((demoName) => demoName.split(path.sep).join(path.posix.sep));
};

const performConversion = async () => {
  const logger = {
    warning: consola.warn,
    error: consola.error,
    debug: consola.debug,
    info: consola.info,
    start: consola.start,
    success: consola.success,
  };

  const args = minimist(getPatterns());

  const sourceDirs = args._ || [process.cwd()];
  const outDirPostfix = 'Js';

  const entries = (await Promise.all(
    sourceDirs.map(async (sourceDir) => {
      const sources = await glob(sourceDir);
      return sources.map((source) => ({
        source: path.resolve(process.cwd(), source),
        out: path.resolve(
          process.cwd(),
          path.resolve(process.cwd(), source),
          `../${path.basename(source)}${outDirPostfix}`,
        ),
      }));
    }),
  )).flat(1);

  await Promise.all(
    entries.map(async ({ source, out }) => {
      logger.start(`converting ${source}`);
      await converter(source, out, logger);
      logger.success(`${source} complete`);
    }),
  )
    // eslint-disable-next-line no-void
    .then(void 0)
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
};

performConversion();
