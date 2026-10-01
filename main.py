from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import requests
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

app = FastAPI(title="MoES Polar Smart Microgrid EMS")

# CORS Enable for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SQLite Database Initialization ---
def init_db():
    conn = sqlite3.connect("microgrid_logs.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS optimization_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station TEXT,
            temp REAL,
            wind_speed REAL,
            diesel_saved_liters REAL,
            co2_saved_kg REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- MoES Stations Coordinates ---
STATIONS = {
    "maitri": {"name": "Maitri Station", "lat": -70.76, "lon": 11.73},
    "bharati": {"name": "Bharati Station", "lat": -69.41, "lon": 76.19}
}

class OptimizationInput(BaseModel):
    station_id: str = "maitri"
    temp: float
    wind_speed: float
    manual_override: bool = False

@app.get("/api/weather/{station_id}")
def get_live_weather(station_id: str):
    """Live Weather API from Open-Meteo for Antarctica"""
    station = STATIONS.get(station_id, STATIONS["maitri"])
    url = f"https://api.open-meteo.com/v1/forecast?latitude={station['lat']}&longitude={station['lon']}&current_weather=true"
    
    try:
        res = requests.get(url, timeout=5).json()
        current = res.get("current_weather", {})
        return {
            "station": station["name"],
            "temp": current.get("temperature", -25.0),
            "wind_speed": current.get("windspeed", 15.0)
        }
    except Exception:
        return {"station": station["name"], "temp": -25.0, "wind_speed": 15.0}

@app.post("/api/optimize")
def run_optimization(data: OptimizationInput):
    """AI Microgrid Optimization & DB Logging"""
    station_info = STATIONS.get(data.station_id, STATIONS["maitri"])
    
    if data.manual_override:
        status = "MANUAL_OVERRIDE"
        diesel_saved = 0.0
        co2_saved = 0.0
        message = "Manual Control Active! AI optimization bypassed by Operator."
    else:
        # AI Optimization Calculation
        green_power_kw = min(100.0, data.wind_speed * 2.5)
        diesel_saved = round(data.wind_speed * 1.8 + (abs(data.temp) * 0.5), 1)
        co2_saved = round(diesel_saved * 2.68, 1)
        status = "OPTIMIZED"
        message = f"AI Optimized! Diesel Saved: {diesel_saved} L | CO2 Reduced: {co2_saved} kg"

    # Save Log to SQLite
    conn = sqlite3.connect("microgrid_logs.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO optimization_logs (station, temp, wind_speed, diesel_saved_liters, co2_saved_kg) VALUES (?, ?, ?, ?, ?)",
        (station_info["name"], data.temp, data.wind_speed, diesel_saved, co2_saved)
    )
    conn.commit()
    conn.close()

    return {
        "status": status,
        "station": station_info["name"],
        "diesel_saved_liters": diesel_saved,
        "co2_saved_kg": co2_saved,
        "message": message
    }

@app.get("/api/download-audit-pdf")
def download_pdf_report(station: str = "Maitri Station", diesel_saved: float = 45.0, co2_saved: float = 120.6):
    """Generates Official Energy Audit PDF"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.setFont("Helvetica-Bold", 18)
    p.drawString(80, 750, "MoES Polar Station - Energy Audit Report")
    
    p.setStrokeColorRGB(0.2, 0.4, 0.8)
    p.line(80, 735, 520, 735)
    
    p.setFont("Helvetica", 12)
    p.drawString(80, 690, f"Station Name: {station}")
    p.drawString(80, 665, f"Audit Status: AI Microgrid Dispatch Active")
    p.drawString(80, 640, f"Total Diesel Saved: {diesel_saved} Liters")
    p.drawString(80, 615, f"CO2 Reduction: {co2_saved} kg")
    p.drawString(80, 590, f"System Efficiency: High Operational Optimization")
    
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(80, 520, "Generated automatically by Smart Energy Management System (SIH Winner MVP)")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=Polar_Energy_Audit.pdf"
    })