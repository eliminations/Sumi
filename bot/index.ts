import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports or code execution
dotenv.config();

import { Telegraf } from 'telegraf';
import axios from 'axios';
import { handleStart } from './commands/start';
import { createCheckGitRepoHandler } from './commands/checkgitrepo';
import { createCheckReusageHandler } from './commands/checkreusage';
import { GitHubScanner } from './services/githubScanner';
import { SecurityAnalyzer } from './services/securityAnalyzer';
import { ReuseDetector } from './services/reuseDetector';

// Startup diagnostics
console.log('[DIAG] Current working directory:', process.cwd());
console.log('[DIAG] TELEGRAM_BOT_TOKEN present:', !!process.env.TELEGRAM_BOT_TOKEN);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required. Please set it in your .env file or environment variables.');
}

const bot = new Telegraf(BOT_TOKEN);

const scanner = new GitHubScanner(GITHUB_TOKEN);
const securityAnalyzer = new SecurityAnalyzer(scanner);
const reuseDetector = new ReuseDetector(scanner);

bot.command('start', handleStart);
bot.command('checkgitrepo', createCheckGitRepoHandler(scanner, securityAnalyzer));
bot.command('checkreusage', createCheckReusageHandler(scanner, reuseDetector));

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  if (text.startsWith('/')) {
    return;
  }

  await ctx.reply('I only respond to commands, darling.\n\nTry /start to begin.');
});

bot.launch().then(async () => {
  // Verify bot connection
  try {
    const botInfo = await bot.telegram.getMe();
    
    const commands = [
      { command: 'start', description: 'Initialize Sumi' },
      { command: 'checkgitrepo', description: 'Repository security scan' },
      { command: 'checkreusage', description: 'Code reuse analysis' }
    ];
    
    await bot.telegram.setMyCommands(commands);
    
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      commands: commands,
      scope: { type: 'all_group_chats' }
    });
    
    console.log('[Sumi] Bot online and listening.');
  } catch (error) {
    console.error('[DIAG] getMe failed:', error);
  }
}).catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
