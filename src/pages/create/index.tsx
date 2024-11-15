import TextField from "@mui/material/TextField";
import React, { useState } from "react";

export default function index() {
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState([""]);

  function addChoice() {
    if (choices.length >= 2) {
      alert("Only 2 choices max at the moment");
      return;
    }
    setChoices([...choices, ""]);
  }

  function confirmMarket() {
    const marketChoices =
      choices.length < 2 ? [`${question}Choice`] : [...choices];
    console.log([question, ...marketChoices]);
    return [question, ...marketChoices];
  }

  return (
    <div>
      <div className="text-white">create</div>
      <div className="flex flex-col justify-center items-center">
        <div className="text-teal-300 my-2">
          <TextField
            id="outlined-controlled"
            focused
            variant="filled"
            label="Title: "
            value={question}
            color="success"
            onChange={(e) => {
            setQuestion(e.target.value);
            }}
          />
        </div>
        {choices.length > 1 &&
          choices.map((choice, index) => {
            return (
              <div className="text-teal-300 my-2" key={index} >
                choice {index + 1} {""}
                <input
                  type="text"
                  value={choices[index]} // Set the current value
                  onChange={(e) => {
                    const updatedChoices = [...choices]; // Create a copy of the array
                    updatedChoices[index] = e.target.value; // Update the specific index
                    setChoices(updatedChoices); // Set the new state
                  }}
                />
              </div>
            );
          })}

        <button onClick={() => addChoice()} className="bg-blue-400 my-4">
          Use 2 Choice
        </button>

        <button className="bg-green-500" onClick={() => confirmMarket()}>
          Create Prediction Market
        </button>
      </div>
    </div>
  );
}
