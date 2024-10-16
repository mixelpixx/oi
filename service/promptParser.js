const fs = require('fs');

const multiLinePromptRegex = /\/\*>\s*([\s\S]*?)\s*<\/\*\//g;
const singleLinePromptRegex = /\/\/>\s*(.*?)\s*<\//g;

const parsePrompts = (filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const prompts = [];

    // Parse multi-line prompts
    let match;
    while ((match = multiLinePromptRegex.exec(fileContent)) !== null) {
        prompts.push({
            type: 'multi-line',
            content: match[1].trim(),
            start: match.index,
            end: match.index + match[0].length
        });
    }

    // Parse single-line prompts
    while ((match = singleLinePromptRegex.exec(fileContent)) !== null) {
        prompts.push({
            type: 'single-line',
            content: match[1].trim(),
            start: match.index,
            end: match.index + match[0].length
        });
    }

    return prompts;
};

const insertGeneratedCode = (filePath, generatedCode, promptStart, promptEnd) => {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    const beforePrompt = fileContent.substring(0, promptStart);
    const afterPrompt = fileContent.substring(promptEnd);
    const newContent = `${beforePrompt}\n${generatedCode}\n${afterPrompt}`;
    fs.writeFileSync(filePath, newContent);
};

module.exports = { parsePrompts, insertGeneratedCode };
