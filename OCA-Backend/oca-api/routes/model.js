var express = require('express');
var router = express.Router();

// 1. Changed to POST to receive the body data
router.post('/', async (req, res, next) => {
  try {
    const { Ollama } = await import('ollama');

    const ollamaIns = new Ollama({
      host: 'https://ollama.com',
      headers: { Authorization: 'Bearer ' + process.env.OLLAMA_API_KEY },
    })
    
    // --- CRITICAL CORRECTION ---
    // Read the entire messages array directly from the request body.
    // The frontend sends the whole history + the new user message.
    const messages = req.body; 
    
    // Ensure the system message is prepended if it's missing (good for robustness)
    const systemPrompt = { 
        role: 'system', 
        content: `You are an out of classroom learning and teaching aid. Students will interact with you to clarify 
        conceptual and applied questions they may have related to the course. You are expected to follow this
        course of action to tutor the student:
        // ... (rest of your system prompt)
        `
    };

    // Prepend the system prompt if the messages array doesn't start with it
    const finalMessages = messages.length > 0 && messages[0].role === 'system' 
                         ? messages 
                         : [systemPrompt, ...messages];

    const response = await ollamaIns.chat({
        model: 'gpt-oss:120b-cloud', 
        messages: finalMessages, // Use the full conversation history
        stream: true,
    });

    // Streaming response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    for await (const part of response) {
      res.write(part.message?.content ?? '')
    }
    res.end()
  } catch (err) {
    next(err)
  }
})

module.exports = router;