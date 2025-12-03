import './App.css';
import { useState } from 'react';
import { Box, Stack} from "@mui/material";

function App(props) {
  // Tracks the state of the component between tutor and TA mode. 
  // Initialized with props.isTutorMode or defaults to false if not provided
  // TODO: When the user toggles the mode, prompt the llm for prefab response indicating the mode changed. 
  const[tutorMode, setMode] = useState(props.isTutorMode || false);
  const toggleMode = () => {
    setMode(mode => !mode);
  }
  
  const [messages,setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello, I am the COSC-442 AI support agent. I am currently operating in tutor mode. How can I help you today?`
    },
  ])

  const [message,setMessage] = useState('')

  const sendMessage = async () => {
    setMessage('')
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ])

    const response = fetch ('/api/chat', {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, {role: 'user', content: message}]),
    }).then(async (res) => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let result = ''
      return reader.read().then(function processText ({ done, value }) {
        if (done) {
          return result
        }
        const text = decoder.decode(value || new Int8Array(), { stream: true})
        setMessages((messages) => {
          let lastMessage = messages[messages.length -1]
          let otherMessages = messages.slice(0,messages.length - 1)
          return [
            ...otherMessages,
            {...lastMessage, content: lastMessage.content + text},
          ]
        })
        return reader.read().then(processText)
      })
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