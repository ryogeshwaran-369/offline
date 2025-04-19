import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import "./HomePage.css";

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    link: "",
    title: "",
    email: "",
    workflow: ""
  });
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [workflowTerm, setWorkflowTerm] = useState("");
  const [fullscreenIndex, setFullscreenIndex] = useState(null);
  const [model, setModel] = useState(null);
  const [filteredCards, setFilteredCards] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  const [editingCardIndex, setEditingCardIndex] = useState(null);
  const [workflowInput, setWorkflowInput] = useState("");

  useEffect(() => {
    fetch("cards.json")
      .then((response) => response.json())
      .then((data) => {
        setCards(data);
        setFilteredCards(data);
      })
      .catch((error) => console.error("Failed to load cards.json", error));

    mobilenet.load().then(setModel);
  }, []);

  const toggleForm = () => setShowForm(!showForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedCards = [...cards, formData];
    setCards(updatedCards);
    setFilteredCards(updatedCards);
    setFormData({ link: "", title: "", email: "", workflow: "" });
    setShowForm(false);
  };

  const toggleFullscreen = (index) => {
    setFullscreenIndex(fullscreenIndex === index ? null : index);
  };

  const handleImageUrlSearch = async () => {
    if (!imageUrl || !model) {
      return;
    }
    const inputImg = document.createElement("img");
    inputImg.src = imageUrl;
    inputImg.crossOrigin = "anonymous";
    document.body.appendChild(inputImg);

    inputImg.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(inputImg, 0, 0, 224, 224);
        const inputTensor = tf.browser.fromPixels(canvas);
        const inputFeatures = model.infer(inputTensor, true);

        const distances = await Promise.all(
          cards.map(async (card) => {
            const cardImg = document.createElement("img");
            cardImg.crossOrigin = "anonymous";
            cardImg.src = card.link;
            await new Promise((resolve) => (cardImg.onload = resolve));

            const cardCanvas = document.createElement("canvas");
            cardCanvas.width = 224;
            cardCanvas.height = 224;
            const ctx2 = cardCanvas.getContext("2d");
            ctx2.drawImage(cardImg, 0, 0, 224, 224);
            const cardTensor = tf.browser.fromPixels(cardCanvas);
            const cardFeatures = model.infer(cardTensor, true);

            const distance = tf.losses.cosineDistance(inputFeatures, cardFeatures, 0).dataSync()[0];
            return { card, distance };
          })
        );

        const sorted = distances.sort((a, b) => a.distance - b.distance);
        setFilteredCards(sorted.map((item) => item.card));
      } catch (err) {
        console.error("Error comparing images:", err);
      } finally {
        inputImg.remove();
      }
    };

    inputImg.onerror = () => {
      inputImg.remove();
    };
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setWorkflowTerm("");
    setImageUrl("");
    setFilteredCards(cards);
  };

  const handleWorkflowUpdate = (index) => {
    const updatedCards = [...cards];
    if (!updatedCards[index].workflows) {
      updatedCards[index].workflows = [];
    }
    updatedCards[index].workflows.push(workflowInput);
    setCards(updatedCards);
    setFilteredCards(updatedCards);
    setEditingCardIndex(null);
    setWorkflowInput("");
  };

  const displayCards = filteredCards.filter((card) => {
    const titleMatch = card.title.toLowerCase().includes(searchTerm.toLowerCase());
    const workflowMatch = workflowTerm
      ? Array.isArray(card.workflows) && card.workflows.some((wf) =>
          wf.toLowerCase().includes(workflowTerm.toLowerCase())
        )
      : true;
    return titleMatch && workflowMatch;
  });

  return (
    <div className="homepage-container">
      <div className="header-section">
        <h1 className="homepage-title">Offline Website Pages</h1>
        <div className="filters-wrapper">
          <input
            type="text"
            placeholder="Search by page title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Search by workflow..."
            value={workflowTerm}
            onChange={(e) => setWorkflowTerm(e.target.value)}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Paste image URL to search visually"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="search-input"
          />
          <button onClick={handleImageUrlSearch} className="submit-button">
            Search Image
          </button>
          <button onClick={handleResetFilters} className="submit-button">
            Reset Filters
          </button>
        </div>
      </div>

      {/* Cards Display */}
      <div className="cards-container">
        {displayCards.map((card, index) => (
          <div className="card" key={index}>
            <img
              src={card.link}
              alt={card.title}
              className={`card-image ${fullscreenIndex === index ? "fullscreen" : ""}`}
              onClick={() => toggleFullscreen(index)}
            />
            <h2 className="card-title">{card.title}</h2>
            <p className="card-email">{card.email}</p>
            {editingCardIndex === index ? (
              <div className="workflow-input">
                <input
                  type="text"
                  placeholder="Enter workflow"
                  value={workflowInput}
                  onChange={(e) => setWorkflowInput(e.target.value)}
                />
                <button onClick={() => handleWorkflowUpdate(index)} className="submit-button">
                  Submit
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingCardIndex(index)} className="card-add-button">
                Add Workflow
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Floating Button */}
      <button onClick={toggleForm} className="floating-button">
        <Plus size={24} />
      </button>

      {/* Floating Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="floating-form">
          <div className="form-group">
            <label>Image Link</label>
            <input
              type="text"
              name="link"
              value={formData.link}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Page Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Trainer Mail ID</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="submit-button">
            Submit
          </button>
        </form>
      )}
    </div>
  );
}