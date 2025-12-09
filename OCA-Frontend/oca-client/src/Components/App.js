import './App.css';
import { useState } from 'react';
import { Box, Stack} from "@mui/material";

function App(props) {
  // Tracks the state of the component between tutor and TA mode. 
  // Initialized with props.isTutorMode or defaults to false if not provided
  // TODO: When the user toggles the mode, prompt the llm for prefab response indicating the mode changed. 
  const[tutorMode, setMode] = useState(props.isTutorMode || false);
  const toggleMode = () => {
    const newMode = !tutorMode;
    setMode(newMode);
    // Update initial greeting based on mode
    const greeting = newMode 
      ? `Hello, I am the COSC-432 AI support agent. I am now operating in tutor mode. How can I help you today?`
      : `Hello, I am the COSC-432 AI support agent. I am now operating in teaching assistant mode. I can help you find and summarize course materials. What would you like to learn about?`;
    setMessages([{ id: 1, role: 'assistant', content: greeting }]);
    setMessageIdCounter(2);
  }
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `Hello, I am the COSC-432 AI support agent. I am currently operating in tutor mode. How can I help you today?`
    },
  ])

  const [message, setMessage] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [messageIdCounter, setMessageIdCounter] = useState(2)

  const sendMessage = async () => {
    const userMessage = message
    setMessage('')

    // Add user message to chat with unique ID
    const userMsgId = messageIdCounter
    const assistantMsgId = messageIdCounter + 1
    setMessageIdCounter(messageIdCounter + 2)

    setMessages((messages) => [
      ...messages,
      { id: userMsgId, role: 'user', content: userMessage },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ])

    try {
      if (tutorMode) {
        // TUTORING MODE - Uses /api/chat with streaming responses
        await handleTutoringMode(userMessage, assistantMsgId)
      } else {
        // TEACHING ASSISTANT MODE - Uses /api/search with JSON response
        await handleTeachingAssistantMode(userMessage, assistantMsgId)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1]
        let otherMessages = messages.slice(0, messages.length - 1)
        return [
          ...otherMessages,
          { ...lastMessage, content: 'Error: ' + error.message },
        ]
      })
    }
  }

  const handleTutoringMode = async (userMessage, assistantMsgId) => {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        sessionId: sessionId,
        studentId: 'student'
      }),
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let result = ''
    const processText = async ({ done, value }) => {
      if (done) {
        return result
      }
      const text = decoder.decode(value || new Int8Array(), { stream: true })
      result += text
      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1]
        let otherMessages = messages.slice(0, messages.length - 1)
        return [
          ...otherMessages,
          { ...lastMessage, content: lastMessage.content + text },
        ]
      })
      return reader.read().then(processText)
    }

    await reader.read().then(processText)
  }

  const handleTeachingAssistantMode = async (userMessage, assistantMsgId) => {
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: userMessage,
        sessionId: sessionId,
        studentId: 'student',
        maxResults: 5
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Format the response with summary and sources
    let responseContent = data.summary || 'No information found.'
    
    if (data.sources && data.sources.length > 0) {
      responseContent += '\n\n**Sources:**\n'
      data.sources.forEach((source, index) => {
        responseContent += `${index + 1}. ${source.document} - ${source.section || 'Section not specified'}\n`
      })
    }

    setMessages((messages) => {
      let lastMessage = messages[messages.length - 1]
      let otherMessages = messages.slice(0, messages.length - 1)
      return [
        ...otherMessages,
        { ...lastMessage, content: responseContent },
      ]
    })
  }


  return (
    <div className="app-container">
      {/* Header and Mode Toggle */}
      <header className="app-header">
        <h1>{tutorMode ? "Tutor Mode" : "Teaching Assistant Mode"}</h1>
        <button 
          onClick={toggleMode} 
          className="mode-toggle-button"
        >
          {tutorMode ? "Switch to TA Mode" : "Switch to Tutor Mode"}
        </button>
      </header>

      <main className="chat-layout">
        {/* contains the chat log  */}
        <Stack
          direction={'column'}
          p={2}
          spacing={3}
          className='chat-window'
        >
          <Stack
            direction={'column'}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message) => (
              <Box
                key={message.id}
                display="flex"
                justifyContent={
                  message.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
              >
                <Box
                  bgcolor={
                    message.role === 'assistant' ? 'primary.main' : 'secondary.main'
                  }
                  color="white"
                  borderRadius={16}
                  p={3}
                >
                  {message.content}
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>


        {/* Prompt Input */}
        <section className='prompt-area'>
          <div className='prompt-form'>
            <textarea
              rows={4}
              placeholder='Type your message here...'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className='prompt-input'
            />
            <button 
              type="submit" 
              className="submit-button" 
              disabled={message === ""}
              onClick={sendMessage}
            >
              Send ➡️
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;