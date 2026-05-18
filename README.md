# CardioCore-Frontend
The decoupled, responsive frontend for CardioCore. Features a dynamic clinical risk assessment UI and a secure appointment booking system built with Vanilla JavaScript.

# CardioCore Frontend Interface 🩺

This repository houses the client-side architecture for **CardioCore**. It is a fully decoupled, responsive web application designed to interact seamlessly with a Python/FastAPI backend.

## 🎨 Tech Stack
* **Markup/Styling:** HTML5, Modern CSS3 (Flexbox/Grid)
* **Logic:** Vanilla JavaScript (ES6+)
* **Integration:** Asynchronous Fetch API

## 🚀 Core Features
1. **Dynamic Risk Assessment:** A 13-point clinical form with real-time validation and progress tracking.
2. **Asynchronous API Integration:** Communicates with the FastAPI backend to generate ML predictions without page reloads.
3. **Animated Data Visualization:** Uses DOM manipulation and SVG attributes to dynamically render a gauge chart based on the precise percentage returned by the ML model.
4. **Appointment Management:** Securely packages patient data via `FormData` objects and handles HTTP POST requests to the backend database queue.
