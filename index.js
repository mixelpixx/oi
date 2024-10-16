#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');

const { initializeProject } = require('./commands/initialize');
const { depend } = require('./commands/depend');
const { addIgnoreFiles } = require('./commands/ignore');

const program = new Command();
const config = require('./service/config');

program
  .command('init')
  .description('Initialize a new project')
  .option('-o, --output <path>', 'Specify a custom configuration file path')
  .option('-i, --ignore <files...>', 'Specify files or directories to ignore')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-n, --project-name <name>', 'Specify a project name')
  .option('--service <service>', 'Specify the service to use for code generation (codex, other)')
  .option('--api-key <key>', 'API key for the specified service')
  .option('--dry-run', 'Simulate the initialization process without making changes')
  .action(async (options) => {
    if (!options.projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter your project name:',
          default: 'my-oi-project'
        },
        {
          type: 'list',
          name: 'aiBackend',
          message: 'Choose an AI backend:',
          choices: ['openai', 'huggingface', 'local']
        },
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your API key (if applicable):',
          when: (answers) => answers.aiBackend !== 'local'
        }
      ]);
      
      options.projectName = answers.projectName;
      options.service = answers.aiBackend;
      options.apiKey = answers.apiKey;
    }
    
    await initializeProject(options);
  });

program
  .command('start')
  .description('Start watching files and upload them to Ollama')
  .action(() => {
    const { startWatching } = require('./service/watchmen');
    console.log('Starting file watcher...');
    startWatching();
  });

program
  .command('depend')
  .description('Generate a dependency graph for the project')
  .option('-o, --output <path>', 'Specify a custom output file path')
  .option('-v, --verbose', 'Enable verbose output')
  .action((options) => {
    depend(options);
  });

program
  .command('ignore')
  .description('Add files or directories to the ignore list in oi-config.json')
  .option('-f, --files <files...>', 'Specify files or directories to ignore')
  .action((options) => {
    if (!options.files || options.files.length === 0) {
      console.error("Please provide at least one file to ignore.");
      process.exit(1);
    }
    addIgnoreFiles(options.files);  // Call the function to add files to ignore list
  });

program
  .command('config')
  .description('Update configuration settings')
  .action(async () => {
    const currentConfig = await config.getConfigJsonValue();
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'aiBackend',
        message: 'Choose an AI backend:',
        choices: ['openai', 'huggingface', 'local'],
        default: currentConfig.aiBackend || 'openai'
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your API key (if applicable):',
        when: (answers) => answers.aiBackend !== 'local',
        default: currentConfig.apiKey
      }
    ]);
    
    await config.updateConfig(answers);
    console.log('Configuration updated successfully.');
  });

program.parse(process.argv);
