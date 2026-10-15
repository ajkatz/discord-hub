#!/usr/bin/env node
// Entry point: `npm run build` first (dist/ is the compiled src/).
import { main } from '../dist/cli.js';

process.exit(await main(process.argv.slice(2)));
