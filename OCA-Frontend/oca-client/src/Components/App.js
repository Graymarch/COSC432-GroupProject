import './App.css';
import { useState } from 'react';

function App(props) {
  // Tracks the state of the component between tutor and TA mode. 
  // Initialized with props.isTutorMode or defaults to false if not provided
  const[tutorMode, setMode] = useState(props.isTutorMode || false);
  const toggleMode = () => {
    setMode(mode => !mode);
  }

  const[userPrompt, setPrompt] = useState("");
  const handleChange = (event) => {
    // Only update state if the value has changed
    setPrompt(event.target.value);
  }

  function handleSubmit(e){
    e.preventDefault();
    // Logic for sending the prompt would go here
    console.log("Submitting prompt:", userPrompt);
    // Optionally clear the prompt after submission
    setPrompt("");
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
        <section className='chat-window'></section>

        {/* Prompt Input */}
        <section className='prompt-area'>
          <form onSubmit={handleSubmit} className='prompt-form'>
            <textarea
              rows={4}
              placeholder='Type your message here...'
              value={userPrompt}
              onChange={handleChange}
              className='prompt-input'
            />
            <button type="submit" className="submit-button" disabled={!userPrompt.trim()}>
              Send ➡️
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;