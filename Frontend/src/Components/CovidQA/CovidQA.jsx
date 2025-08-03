// CovidQA.js
import React, { useState, useCallback } from "react";
import axios from "axios";
import "./CovidQA.css";

// Best practice: Use an environment variable for the API endpoint.
const API_URL =  "http://localhost:5000";

const CovidQA = () => {
    const [context, setContext] = useState("");
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAsk = useCallback(async () => {
        // Trim inputs to prevent submissions with only whitespace.
        if (!context.trim() || !question.trim()) {
            alert("Please enter both the context and question.");
            return;
        }

        setLoading(true);
        setAnswer("");

        try {
            const response = await axios.post(`${API_URL}/api/ask`, {
                context: context.trim(),
                question: question.trim(),
            });

            setAnswer(response.data.answer || "No clear answer was found in the text.");
        } catch (error) {
            console.error("Error calling backend:", error);
            const errorMessage =
                error.response?.data?.message || "An error occurred while fetching the answer.";
            setAnswer(`Error: ${errorMessage}`);
        }
        setLoading(false);
    }, [context, question]); // Dependencies for useCallback

    const handleSubmit = (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        handleAsk();
    };

    const handleReset = () => {
        setContext("");
        setQuestion("");
        setAnswer("");
    };

    return (
        <div className="qa-container">
            <h2>🧠 COVID-19 AI Question Answering</h2>
            <p>Powered by Google Cloud</p>

            <form onSubmit={handleSubmit}>
                <fieldset disabled={loading} className="qa-fieldset">
                    <label htmlFor="context-input" className="sr-only">
                        Context
                    </label>
                    <textarea
                        id="context-input"
                        placeholder="Paste a medical report or COVID-related paragraph here..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        aria-required="true"
                    ></textarea>

                    <label htmlFor="question-input" className="sr-only">
                        Question
                    </label>
                    <input
                        id="question-input"
                        type="text"
                        placeholder="Ask a question about the text above..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        aria-required="true"
                    />

                    <div className="button-group">
                        <button type="submit" disabled={loading}>
                            {loading ? "Analyzing..." : "Ask"}
                        </button>
                        <button type="button" onClick={handleReset} className="secondary-button" disabled={loading}>
                            Clear
                        </button>
                    </div>
                </fieldset>
            </form>

            {/* Conditionally render the answer box only when there is an answer or loading is finished */}
            {answer && (
                <div className="answer-box" aria-live="polite">
                    <strong>Answer:</strong>
                    {/* Using a <p> tag is better for text content */}
                    <p>{answer}</p>
                </div>
            )}
        </div>
    );
};

export default CovidQA;