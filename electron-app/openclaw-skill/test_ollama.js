const fs = require('fs');
const path = require('path');

async function testLocalModel() {
  const skillPath = path.join(__dirname, 'SKILL.md');
  const skillContent = fs.readFileSync(skillPath, 'utf8');

  // Strip YAML frontmatter to get clean system prompt
  const systemPrompt = skillContent.replace(/^---[\s\S]*?---\n/, '').trim();

  // The model name. Update this if you are using a different local model
  const MODEL_NAME = 'qwen3:4b'; 

  const userPrompt = 'TASK: Classify the sentiment of the following news headline into exactly one of three words (POSITIVE, NEGATIVE, NEUTRAL).\n\nHEADLINE: "Hedera Hashgraph processing 50 billion transactions triggers unprecedented network demand."';

  console.log(`\n⏳ Sending request to Ollama (http://localhost:11434)...`);
  console.log(`🧠 Local Model: ${MODEL_NAME}`);
  
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.1 // Low temperature for deterministic consensus
        }
      })
    });

    if (!response.ok) {
      console.error(`\n❌ Ollama Connection Error: ${response.status} ${response.statusText}`);
      console.log('Ensure Ollama is running, and the model is pulled (e.g., `ollama pull llama3`)');
      return;
    }

    const data = await response.json();
    console.log(`\n✅ System Prompt Loaded:`);
    console.log(`"${systemPrompt.substring(0, 120)}..."\n`);
    
    console.log(`💬 User Prompt:\n${userPrompt}\n`);
    
    console.log(`🔥 Ollama Response (${data.model}):\n`);
    console.log(`\x1b[32m${data.message.content}\x1b[0m\n`);
    
  } catch (error) {
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      console.error('\n❌ Could not connect to Ollama. Make sure the Ollama app is running on port 11434.');
    } else {
      console.error(`\n❌ Error:`, error.message);
    }
  }
}

testLocalModel();
