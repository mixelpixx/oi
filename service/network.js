const { Configuration, OpenAIApi, default: OpenAI } = require('openai');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Initialize OpenAI API with your API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Make sure this is in your .env
    organisation: process.env.OPENAI_ORG_ID,
    project: "proj_KXJHh8FNqFn7EiKyvFjCJ32o" 
});

// Initialize other AI backends
const huggingFaceToken = process.env.HUGGINGFACE_API_TOKEN;
const localLLMUrl = process.env.LOCAL_LLM_URL || 'http://localhost:8080';

const generateCodeWithHuggingFace = async (prompt, model = 'gpt2') => {
    try {
        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${model}`,
            { inputs: prompt },
            { headers: { Authorization: `Bearer ${huggingFaceToken}` } }
        );
        return response.data[0].generated_text;
    } catch (error) {
        console.error(`Error generating code with Hugging Face: ${error.message}`);
        throw error;
    }
};

const generateCodeWithLocalLLM = async (prompt) => {
    try {
        const response = await axios.post(localLLMUrl, { prompt });
        return response.data.generated_text;
    } catch (error) {
        console.error(`Error generating code with local LLM: ${error.message}`);
        throw error;
    }
};

const processCodexResponse = (response) => {
  try {
      // Check if the response is an array and has elements
      if (!Array.isArray(response) || response.length === 0) {
          throw new Error("Response is not in expected format or is empty.");
      }

      // Extract the message
      const message = response[0].message;

      // Check if message is defined and contains content
      if (!message || !message.content) {
          throw new Error("Message content is missing in the response.");
      }

      // Clean the content to remove Markdown formatting (like backticks)
      let cleanContent = message.content
          .replace(/```json/g, '')  // Remove the opening code block for JSON
          .replace(/```/g, '')      // Remove the closing code block
          .trim();                  // Trim whitespace

      // Parse the cleaned content into JSON
      const dependencyGraph = JSON.parse(cleanContent);

      // Output or use the parsed dependency graph
      console.log("Parsed Dependency Graph:", dependencyGraph);
      return dependencyGraph;
  } catch (error) {
      console.error("Error parsing the response:", error.message);
      return null; // or handle the error as needed
  }
};

/**
 * Generate code using OpenAI Codex.
 * @param {string} prompt - The user prompt to generate code for.
 * @param {string} model - Optional. The model to use for code generation, defaults to 'gpt-3.5-turbo'.
 * @returns {string} - The generated code response.
 */
const generateCode = async (prompt, model = 'gpt-3.5-turbo') => {
    try {
        const response = await openai.chat.completions.create({
            model: model,  // You can use 'gpt-3.5-turbo' or 'gpt-4'
            messages: [{ role: "user", content: prompt }],  // Wrap the prompt in messages array
            max_tokens: 1000,  // Set a limit based on how much code you want
            temperature: 0.5,  // Adjust to control randomness
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        // Log the response for debugging
        console.log(response.choices);

        // Extract the generated text
        const generatedCode = processCodexResponse(response.choices);

        return generatedCode;
    } catch (error) {
        console.error(`Error generating code: ${error.message}`);
        throw error;
    }
};

const generateCodeWithSelectedBackend = async (prompt, backend = 'openai', model = 'gpt-3.5-turbo') => {
    switch (backend) {
        case 'openai':
            return generateCode(prompt, model);
        case 'huggingface':
            return generateCodeWithHuggingFace(prompt, model);
        case 'local':
            return generateCodeWithLocalLLM(prompt);
        default:
            throw new Error(`Unsupported backend: ${backend}`);
    }
};

module.exports = {
    generateCode,
    generateCodeWithSelectedBackend,
    generateCodeWithHuggingFace,
    generateCodeWithLocalLLM
};
