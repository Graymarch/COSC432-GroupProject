var express = require('express');
var router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { Ollama } = await import('ollama');

    const ollamaIns = new Ollama({
      host: 'https://ollama.com',
      headers: { Authorization: 'Bearer ' + process.env.OLLAMA_API_KEY },
    })
    
    const userPrompt = req.query.prompt;

    const messages = [
        { 
            role: 'system', 
            // Instruction to guide the model's behavior (OCA Tutoring Mode)
            content: `You are an out of classroom learning and teaching aid. Students will interact with you to clarify 
            conceptual and applied questions they may have related to the course. You are expected to follow this
            course of action to tutor the student:

            1.1) Identify whether the question is academic and whether it is assignment or exam related. If a question has some ambiguity, ask for specific clarification.
            1.2) If the question is assignment or exam related, offer to help the student understand concepts but DO NOT give them the answer.
            1.3) If the input is non-academic, ignore it and redirect the conversation to offer to help the student with something academic.
            2) When clarifying concepts, reference the course material to ask leading questions to understand the student's comprehension level
            and converse with them.`
        },
        { 
            role: 'user', 
            // User's message
            content: userPrompt
        }
    ];

    const response = await ollamaIns.chat({
        model: 'gpt-oss:120b', 
        messages: messages, // Pass the new structured array
        stream: true,
    });

    //Streaming response
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