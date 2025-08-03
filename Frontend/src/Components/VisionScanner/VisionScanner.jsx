import React, { useState } from "react";
import "./VisionScanner.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- IMPORTANT ---
// It is NOT secure to hardcode API keys in your front-end code.
// Use environment variables or a backend server to protect your keys.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const VISION_API_KEY = import.meta.env.VITE_VISION_API_KEY;

const VisionScanner = () => {
  const [imageFile, setImageFile] = useState(null);
  const [simplifiedExplanation, setSimplifiedExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError("Image is too large. Please select a file under 4MB.");
        return;
      }
      setImageFile(file);
      setSimplifiedExplanation(""); // Reset previous results
      setError(""); // Reset previous errors
    }
  };

  const simplifyTextWithGemini = async (rawText) => {
    // If no text is found in the image, inform the user.
    if (rawText.trim() === "No text found.") {
      return "We couldn't find any text in the image. Please try a clearer picture.";
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // A more detailed prompt for a structured, user-friendly response.
    const prompt = `You are a helpful medical assistant. Explain the following medical report in simple, clear, and reassuring terms for a patient who has no medical background. Structure your explanation with a title, a brief summary, and then use bullet points for key findings. Use bold text to highlight important terms.

    Medical Report Text:
    ${rawText}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.error("Gemini Error:", err);
      setError("The AI failed to generate an explanation. Please try again.");
      return "";
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) return;

    setLoading(true);
    setError("");
    setSimplifiedExplanation("");

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1];
      try {
        const visionResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [{ image: { content: base64 }, features: [{ type: "TEXT_DETECTION" }] }],
            }),
          }
        );

        const visionResult = await visionResponse.json();
        if (visionResult.error) throw new Error(visionResult.error.message);

        const extractedText = visionResult.responses?.[0]?.fullTextAnnotation?.text || "No text found.";

        const simplified = await simplifyTextWithGemini(extractedText);
        setSimplifiedExplanation(simplified);
      } catch (err) {
        console.error("Analysis Error:", err);
        setError(`Analysis failed: ${err.message}. Please check the image or try again.`);
      } finally {
        setLoading(false);
      }
    };
  };

  return (
    <div className="vision-body">
      <div className="vision-container">
        <div className="header">
          <span className="header-icon">🩺</span>
          <h2>Medical Report Explainer</h2>
          <p>Get a simple, easy-to-understand summary of your medical documents.</p>
        </div>

        <div className="upload-section">
          <label htmlFor="file-upload" className="custom-file-upload">
            {imageFile ? "Change Image" : "Select Image"}
          </label>
          <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} />
          {imageFile && <span className="file-name">{imageFile.name}</span>}
        </div>

        <button onClick={analyzeImage} disabled={loading || !imageFile} className="scan-button">
          {loading ? "Analyzing..." : "✨ Get Simplified Explanation"}
        </button>

        <div className="result-area">
          {loading && <div className="loader"></div>}
          {error && <div className="error-message">{error}</div>}
          {!loading && !error && simplifiedExplanation && (
            <div className="explanation-box">
              <pre className="explanation-text">{simplifiedExplanation}</pre>
            </div>
          )}
          {!loading && !simplifiedExplanation && !error && (
            <div className="placeholder-text">
              Your simplified explanation will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisionScanner;