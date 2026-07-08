# 🚗 SmartPark - AI Intelligent Parking Management System

SmartPark AI is a full-stack intelligent parking management system that predicts parking availability using machine learning and helps users find, reserve, and manage parking spaces efficiently. The system combines a Flask backend, React frontend, MongoDB database, and a machine learning model to provide real-time parking recommendations.

---

## ✨ Features

- 🔐 User Authentication (Register & Login)
- 🚗 Parking Availability Prediction using Machine Learning
- 📍 Interactive Parking Map
- 🅿️ Smart Parking Recommendations
- 📅 Parking Slot Reservation
- 📊 User Dashboard
- 🤖 Trained ML Model (Scikit-learn)
- 🔄 RESTful API Integration
- 📱 Responsive User Interface

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3

### Backend
- Flask
- Flask-CORS
- REST API

### Machine Learning
- Scikit-learn
- Pandas
- NumPy
- Joblib

### Database
- MongoDB

---

## 📂 Project Structure

```text
Smart_Parking/
│
├── backend/
│   ├── app.py
│   ├── train_model.py
│   ├── model.pkl
│   ├── routes/
│   ├── services/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── ...
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/VisaliniKJ2007/Smart_parking.git
cd Smart_parking
```

---

## Backend Setup

Create a virtual environment.

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux/macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies.

```bash
pip install -r backend/requirements.txt
```

Train the machine learning model.

```bash
cd backend
python train_model.py
```

Run the backend server.

```bash
python app.py
```

Backend URL

```
http://127.0.0.1:5000
```

---

## Frontend Setup

Open a new terminal.

```bash
cd frontend
npm install
npm start
```

Frontend URL

```
http://localhost:3000
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login user |

### Prediction

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/predict` | Predict parking availability |

Example

```
GET /predict?hour=10&day=1&traffic=60&weather=0
```

Sample Response

```json
{
    "predicted_available_slots": 35
}
```

### Reservation

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/reserve` | Reserve a parking slot |
| DELETE | `/cancel` | Cancel reservation |

---

## Machine Learning Model

The parking prediction model is trained using historical parking occupancy data.

Features include:

- Hour of the day
- Day of the week
- Traffic level
- Weather condition

Algorithm:

- Random Forest Regressor (Scikit-learn)

---

## Screenshots

You can add screenshots here.

```
Home Page

Login

Dashboard

Parking Map

Reservation Page
```

---

## Future Enhancements

- Live parking sensor integration
- Google Maps integration
- GPS navigation
- QR-code based parking access
- Online payment gateway
- Dynamic pricing
- Admin analytics dashboard
- Mobile application
- Notification system

---

## Testing

Run backend tests.

```bash
cd backend
pytest
```

---

## Contributors

**Visalini K**

Computer Science Engineering (Cyber Security)

Sri Eshwar College of Engineering

---

## License

This project is developed for educational, research, and hackathon purposes.

---

## Acknowledgements

- Flask
- React
- Scikit-learn
- MongoDB
- OpenStreetMap
