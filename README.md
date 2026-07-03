# SmartPark AI: Real-Time Parking Availability Prediction and Recommendation System

## Overview

SmartPark AI is an intelligent parking management system designed to predict parking availability and recommend the best parking location to drivers. The system uses machine learning techniques to forecast parking occupancy based on historical data and real-time conditions such as traffic and weather.

By reducing the time spent searching for parking spaces, SmartPark AI helps decrease traffic congestion, fuel consumption, and carbon emissions.

---

## Problem Statement

Finding parking in urban areas is time-consuming and contributes significantly to traffic congestion and environmental pollution. Drivers often spend several minutes searching for available parking spaces, leading to wasted fuel and increased stress.

SmartPark AI addresses this problem by providing accurate parking availability predictions and intelligent parking recommendations.

---

## Objectives

* Predict parking slot availability using machine learning.
* Recommend the best parking location based on distance and availability.
* Display parking information on an interactive map.
* Support dynamic pricing based on occupancy levels.
* Improve parking utilization and reduce traffic congestion.

---

## Features

### Machine Learning Prediction

* Predict future parking availability.
* Analyze historical occupancy trends.
* Support real-time prediction requests.

### Parking Recommendation Engine

* Recommend optimal parking locations.
* Consider both distance and available spaces.
* Reduce parking search time.

### Interactive Map Visualization

* Display parking locations on a map.
* Show availability using color-coded markers:

  * Green: Available
  * Yellow: Limited Availability
  * Red: Full

### Dynamic Pricing

* Adjust parking prices according to occupancy levels.
* Encourage balanced parking distribution.

### Reservation System

* Allow users to reserve parking spaces.
* Manage bookings and cancellations.

### Admin Dashboard

* Manage parking locations.
* Monitor occupancy statistics.
* View analytics and reports.

---

## Technology Stack

| Component         | Technology                 |
| ----------------- | -------------------------- |
| Frontend          | React.js                   |
| Backend           | Flask                      |
| Machine Learning  | Scikit-learn               |
| Database          | MongoDB                    |
| Maps              | Leaflet.js + OpenStreetMap |
| API Communication | REST API                   |
| Data Processing   | Pandas, NumPy              |

---

## System Architecture

Parking Data Collection
↓
Machine Learning Model
↓
Prediction Engine
↓
Recommendation Engine
↓
Flask Backend API
↓
React Frontend
↓
Interactive Map Dashboard

---

## Project Structure

```text
smart-parking/
│
├── backend/
│   ├── app.py
│   ├── train_model.py
│   ├── model.pkl
│   ├── requirements.txt
│   └── data/
│       └── parking_data.csv
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## Installation

### Clone the Repository

```bash
git clone <repository-url>
cd smart-parking
```

### Create a Virtual Environment

```bash
python -m venv venv
```

### Activate the Virtual Environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Running the Project

### Train the Machine Learning Model

```bash
python train_model.py
```

### Start the Flask Backend

```bash
python app.py
```

The server will start on:

```text
http://127.0.0.1:5000
```

---

## Example API Request

```http
GET /predict?hour=10&day=1&traffic=60&weather=0
```

### Example Response

```json
{
  "predicted_available_slots": 35
}
```

---

## Future Enhancements

* Real-time parking sensor integration.
* Computer vision-based vehicle detection using YOLO and OpenCV.
* Electric vehicle charging station recommendations.
* Event-based demand prediction.
* Mobile application support.
* Smart city integration.

---

## Expected Outcomes

* Reduced parking search time.
* Lower traffic congestion.
* Reduced fuel consumption.
* Improved parking space utilization.
* Better user experience for drivers.

---

## License

This project is intended for educational, research, and hackathon purposes.

---

## Authors

Developed as a hackathon project for intelligent urban mobility and smart city solutions.
