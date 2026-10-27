"""
Database Models & SQLite Manager for RoadGuard Bengaluru
Pothole Detection, Civic Road Blockages & Karnataka Geotagging
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'potholes.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'Pothole',
            original_image TEXT NOT NULL,
            annotated_image TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            address TEXT,
            zone TEXT DEFAULT 'East Zone',
            ward_name TEXT,
            google_maps_url TEXT,
            has_pothole INTEGER NOT NULL,
            pothole_count INTEGER NOT NULL,
            severity TEXT NOT NULL,
            confidence REAL NOT NULL,
            recommendation TEXT,
            detections_json TEXT,
            status TEXT DEFAULT 'Reported',
            reported_by TEXT DEFAULT 'Namma Citizen',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

    # Check if empty, seed initial realistic records
    cursor.execute('SELECT COUNT(*) FROM reports')
    count = cursor.fetchone()[0]
    if count == 0:
        seed_bengaluru_data(conn)

    conn.close()


def seed_bengaluru_data(conn):
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Seed iconic Bangalore road distress, sewage drilling and metro blockage spots
    sample_reports = [
        (
            "Severe Multi-Crater Pothole Cluster near Silk Board",
            "Deep asphalt hollow with exposed gravel aggregate and water accumulation on the flyover down-ramp. Heavy vehicle crawl towards BTM Layout.",
            "Pothole",
            "samples/pothole_sample_1.jpg",
            "samples/pothole_sample_1_annotated.jpg",
            12.917649,
            77.623788,
            "Silk Board Junction, Hosur Road, BTM Layout, Bengaluru, Karnataka 560068",
            "Bommanahalli Zone",
            "Ward 174 (BTM Layout)",
            "https://www.google.com/maps?q=12.917649,77.623788",
            1,
            3,
            "Critical",
            94.2,
            "Immediate BBMP pothole patching needed. High risk of two-wheeler skidding and axle damage.",
            json.dumps([
                {"id": 1, "severity": "Critical", "confidence": 94.2, "depth_contrast": 13.3, "area_pct": 3.8},
                {"id": 2, "severity": "Moderate", "confidence": 91.5, "depth_contrast": 8.3, "area_pct": 1.4},
                {"id": 3, "severity": "Minor", "confidence": 88.0, "depth_contrast": 6.9, "area_pct": 0.9}
            ]),
            "Under Review",
            "BTP Road Safety Cell",
            now
        ),
        (
            "Deep Arterial Road Cavity on Whitefield Main Road",
            "Large circular cavity in inner driving lane near Hope Farm junction. Multiple citizen complaints submitted regarding wheel rim damage.",
            "Pothole",
            "samples/pothole_sample_2.jpg",
            "samples/pothole_sample_2_annotated.jpg",
            12.984523,
            77.749871,
            "Whitefield Main Rd near ITPL & Hope Farm, Bengaluru, Karnataka 560066",
            "Mahadevapura Zone",
            "Ward 84 (Hagadur)",
            "https://www.google.com/maps?q=12.984523,77.749871",
            1,
            3,
            "Critical",
            92.8,
            "Severe crater in rapid corridor. BBMP Major Roads engineering wing dispatched for inspection.",
            json.dumps([
                {"id": 1, "severity": "Critical", "confidence": 93.8, "depth_contrast": 13.3, "area_pct": 3.4},
                {"id": 2, "severity": "Moderate", "confidence": 89.2, "depth_contrast": 12.1, "area_pct": 1.2}
            ]),
            "Scheduled for Repair",
            "Mahadevapura Task Force",
            now
        ),
        (
            "BWSSB Sewage Pipeline Drilling & Road Trench",
            "Main carriage way blocked for Cauvery 5th stage underground sewage pipe drilling. Road surface dug up for 80 meters with mud heaps.",
            "Sewage Drilling",
            "samples/pothole_sample_1.jpg",
            "samples/pothole_sample_1_annotated.jpg",
            12.971940,
            77.641150,
            "100 Feet Road, Near 12th Main, Indiranagar, Bengaluru, Karnataka 560038",
            "East Zone",
            "Ward 80 (Hoysala Nagar)",
            "https://www.google.com/maps?q=12.971940,77.641150",
            1,
            2,
            "Critical",
            90.5,
            "Road blocked due to BWSSB sewage drilling. Traffic diverted to 80 Feet Road. Caution boards installed.",
            json.dumps([]),
            "Reported",
            "Indiranagar RWA",
            now
        ),
        (
            "BMRCL Namma Metro Construction Lane Blockage",
            "Blue Line Metro construction pillar works barricaded 2 out of 3 lanes on Outer Ring Road. High congestion during peak office hours.",
            "Metro Construction",
            "samples/pothole_sample_2.jpg",
            "samples/pothole_sample_2_annotated.jpg",
            12.927923,
            77.683515,
            "Outer Ring Road (ORR), Near Bellandur Eco-Space, Bengaluru, Karnataka 560103",
            "Mahadevapura Zone",
            "Ward 150 (Bellandur)",
            "https://www.google.com/maps?q=12.927923,77.683515",
            1,
            1,
            "Moderate",
            89.0,
            "Active Metro barricading. Heavy vehicle speed limit reduced to 20 km/h.",
            json.dumps([]),
            "Under Review",
            "ORRCA Traffic Volunteer",
            now
        ),
        (
            "BESCOM Underground Power Cable Trench",
            "Trench dug along left lane for high-tension cable laying. Loose gravel and unpaved mud causing two-wheeler skid hazards.",
            "BESCOM Trenching",
            "samples/pothole_sample_1.jpg",
            "samples/pothole_sample_1_annotated.jpg",
            12.935240,
            77.624480,
            "80 Feet Road, 4th Block Koramangala, Bengaluru, Karnataka 560034",
            "South Zone",
            "Ward 151 (Koramangala)",
            "https://www.google.com/maps?q=12.935240,77.624480",
            1,
            2,
            "Moderate",
            87.5,
            "Civic coordination required between BESCOM and BBMP for prompt road restoration.",
            json.dumps([]),
            "Scheduled for Repair",
            "Citizen Road Patrol",
            now
        ),
        (
            "Newly White-Topped Road Section - Vidhana Soudha Corridor",
            "Verification scan of freshly paved high-density asphalt and white-topping road. Surface passes zero-hazard test.",
            "Pothole",
            "samples/clean_road_sample.jpg",
            "samples/clean_road_annotated.jpg",
            12.979692,
            77.590652,
            "Dr Ambedkar Veedhi, Near Vidhana Soudha, Bengaluru, Karnataka 560001",
            "Central Zone",
            "Ward 111 (Shantala Nagar)",
            "https://www.google.com/maps?q=12.979692,77.590652",
            0,
            0,
            "Safe / Clear Road",
            96.8,
            "Road surface in excellent condition. Safe for continuous high-speed transit.",
            json.dumps([]),
            "Repaired",
            "BBMP Smart City Works",
            now
        )
    ]

    cursor.executemany('''
        INSERT INTO reports (
            title, description, category, original_image, annotated_image,
            latitude, longitude, address, zone, ward_name, google_maps_url,
            has_pothole, pothole_count, severity, confidence, recommendation,
            detections_json, status, reported_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', sample_reports)

    conn.commit()


def add_report(report_data):
    conn = get_db_connection()
    cursor = conn.cursor()

    lat = float(report_data.get('latitude', 12.9716))
    lng = float(report_data.get('longitude', 77.5946))
    gmaps_url = report_data.get('google_maps_url') or f"https://www.google.com/maps?q={lat:.6f},{lng:.6f}"

    cursor.execute('''
        INSERT INTO reports (
            title, description, category, original_image, annotated_image,
            latitude, longitude, address, zone, ward_name, google_maps_url,
            has_pothole, pothole_count, severity, confidence, recommendation,
            detections_json, status, reported_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        report_data.get('title', 'Bengaluru Road Hazard Report'),
        report_data.get('description', ''),
        report_data.get('category', 'Pothole'),
        report_data.get('original_image'),
        report_data.get('annotated_image'),
        lat,
        lng,
        report_data.get('address', 'Bengaluru, Karnataka'),
        report_data.get('zone', 'East Zone'),
        report_data.get('ward_name', 'BBMP Ward'),
        gmaps_url,
        int(report_data.get('has_pothole', 1)),
        int(report_data.get('pothole_count', 0)),
        report_data.get('severity', 'Moderate'),
        float(report_data.get('confidence', 88.0)),
        report_data.get('recommendation', ''),
        json.dumps(report_data.get('detections', [])),
        report_data.get('status', 'Reported'),
        report_data.get('reported_by', 'Namma Citizen'),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def get_all_reports(severity=None, status=None, category=None, limit=150):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM reports WHERE 1=1"
    params = []
    
    if severity and severity != 'all':
        query += " AND severity = ?"
        params.append(severity)
    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)
    if category and category != 'all':
        query += " AND category = ?"
        params.append(category)
        
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        item = dict(row)
        try:
            item['detections'] = json.loads(item['detections_json']) if item['detections_json'] else []
        except Exception:
            item['detections'] = []
        results.append(item)
    return results


def get_report_by_id(report_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        try:
            item['detections'] = json.loads(item['detections_json']) if item['detections_json'] else []
        except Exception:
            item['detections'] = []
        return item
    return None


def update_report_status(report_id, new_status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE reports SET status = ? WHERE id = ?", (new_status, report_id))
    conn.commit()
    conn.close()
    return True


def delete_report(report_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    conn.commit()
    conn.close()
    return True


def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM reports")
    total_reports = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM reports WHERE category = 'Pothole' AND has_pothole = 1")
    total_potholes = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE category IN ('Sewage Drilling', 'Metro Construction', 'BESCOM Trenching', 'Water-logging')")
    blockages_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM reports WHERE severity = 'Critical'")
    critical_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM reports WHERE severity = 'Moderate'")
    moderate_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM reports WHERE severity = 'Minor'")
    minor_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM reports WHERE status = 'Repaired'")
    repaired_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT AVG(confidence) FROM reports WHERE has_pothole = 1")
    avg_conf_row = cursor.fetchone()[0]
    avg_conf = round(avg_conf_row, 1) if avg_conf_row else 0.0
    
    conn.close()
    
    return {
        "total_reports": total_reports,
        "total_potholes": total_potholes,
        "blockages_count": blockages_count,
        "critical_count": critical_count,
        "moderate_count": moderate_count,
        "minor_count": minor_count,
        "repaired_count": repaired_count,
        "pending_count": total_reports - repaired_count,
        "avg_confidence": avg_conf
    }
