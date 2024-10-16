const fs = require('fs');
const chokidar = require('chokidar');
const config = require('./config');
const { generateCodeWithSelectedBackend } = require('./network');
const { parsePrompts, insertGeneratedCode } = require('./promptParser');

// This regex is now handled in promptParser.js
const commentRegex = /\/\/>\s*(.*?)\s*<\//g;

// Check for prompt message.
const checkForPromptAndGenerate = async (filePath) => {
    try {
        // Read the content of the changed file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const prompts = parsePrompts(filePath);

        for (const prompt of prompts) {
            console.log(`Prompt found in ${filePath}: ${prompt.content}`);
            
            // Get the AI backend and model from config
            const aiBackend = await config.getConfigJsonValue('aiBackend') || 'openai';
            const aiModel = await config.getConfigJsonValue('aiModel') || 'gpt-3.5-turbo';

            // Generate code using the selected backend
            const generatedCode = await generateCodeWithSelectedBackend(prompt.content, aiBackend, aiModel);

            // Insert the generated code
            insertGeneratedCode(filePath, generatedCode, prompt.start, prompt.end);
        }
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
    }
};

const startWatching = async () => {
    // Ensure 'oi-config.json' exists
    if (!config.configExists()) {
        console.error('Error: oi-config.json file not found in the current directory.');
        process.exit(1);
    }

    // Read ignored files from 'oi-config.json'
    const ignoredFiles = await (config.getConfigJsonValue('ignore')) || [];

    // Add additional patterns to ignore temporary and backup files (like VS Code's autosave)
    ignoredFiles.push('/(^|[\/\\])\../'); // Ignore dotfiles and hidden files
    ignoredFiles.push('node_modules'); // Ignore node_modules folder
    ignoredFiles.push('*.swp'); // Ignore temporary swap files

    // Get the current directory
    const currentDir = config.getCurrentDirectory();

    // Watch all files recursively with polling
    const watcher = chokidar.watch(`${currentDir}`, {
        persistent: true,
        usePolling: true,      // Enable polling to catch all file changes in editors
        interval: 100,         // Polling interval (100ms works well in most cases)
        ignored: ignoredFiles, // Files or directories to ignore
        ignoreInitial: true,   // Watch initial files
    });

    // Event listeners for file changes
    watcher
        .on('add', async (filePath) => {
            console.log(`File ${filePath} has been added`);
            // await uploadToOllama(filePath); // Upload newly added files to Ollama
        })
        .on('change', async (filePath) => {
            console.log(`File ${filePath} has been changed`);
            await checkForPromptAndGenerate(filePath); // Handle file change
        })
        .on('unlink', filePath => {
            console.log(`File ${filePath} has been removed`);
        })
        .on('error', error => console.error('Watcher error:', error))
        .on('ready', () => console.log('Watcher is ready and scanning for changes'));
};

module.exports = { startWatching };
