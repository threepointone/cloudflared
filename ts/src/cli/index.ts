#!/usr/bin/env node
import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import pkg from '../../package.json' with { type: 'json' };
import { createLogger } from '../logger/index.js';
import { loadConfig, validateConfig } from '../config/index.js';
import { CloudflareClient } from '../cfapi/index.js';

const logger = createLogger();

async function main() {
  const argv = yargs(hideBin(process.argv))
    .scriptName('cloudflared-ts')
    .command(
      'hello',
      'print a friendly greeting',
      () => {},
      () => {
        logger.info('Hello from cloudflared-ts');
      }
    )
    .command(
      'version',
      'print version',
      () => {},
      () => {
        // eslint-disable-next-line no-console
        console.log(pkg.version);
      }
    )
    .command(
      'config validate <path>',
      'validate a YAML configuration file',
      (y: Argv) => y.positional('path', { type: 'string', demandOption: true }),
      async (args: { path: string }) => {
        const path = String(args.path);
        const result = await validateConfig(path);
        if (result.valid) {
          logger.info({ path }, 'Config is valid');
        } else {
          logger.error({ path, error: result.error }, 'Invalid config');
          process.exitCode = 1;
        }
      }
    )
    .command(
      'tunnel list',
      'list tunnels in an account',
      (y: Argv) =>
        y.option('account', {
          type: 'string',
          describe: 'Cloudflare account ID (defaults to CLOUDFLARE_ACCOUNT_ID)',
        }),
      async (args: { account?: string }) => {
        try {
          const cf = new CloudflareClient();
          const tunnels = await cf.listTunnels(args.account as string | undefined);
          if (tunnels.length === 0) {
            logger.info('No tunnels found');
            return;
          }
          for (const t of tunnels) {
            // eslint-disable-next-line no-console
            console.log(`${t.id}\t${t.name}${t.deleted_at ? '\t(deleted)' : ''}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(msg);
          process.exitCode = 1;
        }
      }
    )
    .demandCommand(1)
    .strict()
    .help().argv;

  return argv;
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

