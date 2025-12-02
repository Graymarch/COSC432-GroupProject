import './App.css';
import { useState } from 'react';

function App(props) {
  // Tracks the state of the component between tutor and TA mode. 
  const[tutorMode, setMode] = useState(props.isTutorMode)
  const toggleMode = () => {
    setMode(mode => !mode)
  }

  const[userPrompt, setPrompt] = useState("")
  const handleChange = (event) => {
    setPrompt(val => event.target.value)
  }

  function handleSubmit(e){
    console.log(e);
    e.preventDefault();
  }

  return (
    <div className="App">
      <header><h1>{tutorMode? "Tutor Mode":"Teaching Assistant Mode"}</h1></header>
      {/* Toggles the operating mode. */}
      <button onClick={toggleMode}>Flip Mode</button>

      {/* Will contain the chat with the user.  */}
      <section className='chatField'></section>

      {/* Allows the user to type out a response. */}
      {/* Chatbox is present and keystrokes change state, but need to figure out how to size it properly. May need to use a different element. */}
      <section id='userPrompt'>
        <form onSubmit={handleSubmit}>
          <input type='text' placeholder='Type your prompt here...' value={userPrompt} onChange={handleChange}></input>
        </form>
      </section>
    </div>
  );
}

export default App;
