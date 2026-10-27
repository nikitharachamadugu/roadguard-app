"""
RoadGuard Bengaluru • Pothole Detection & Civic Road Hazard Management
Flask Web Application & Karnataka Municipal REST API
"""

import os
import uuid
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename

try:
    from app.detector import PotholeDetector
    from app.models import (
        init_db, add_report, get_all_reports, get_report_by_id, 
        update_report_status, delete_report, get_stats
    )
except ImportError:
    from detector import PotholeDetector
    from models import (
        init_db, add_report, get_all_reports, get_report_by_id, 
        update_report_status, delete_report, get_stats
    )


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
SAMPLES_FOLDER = os.path.join(BASE_DIR, 'static', 'samples')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SAMPLES_FOLDER, exist_ok=True)

app = Flask(__name__, template_folder=os.path.join(BASE_DIR, 'templates'), static_folder=os.path.join(BASE_DIR, 'static'))
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max upload

detector = PotholeDetector()

with app.app_context():
    init_db()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response


@app.route('/')
def index():
    import time
    return render_template('index.html', v=int(time.time()))



@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory(os.path.join(BASE_DIR, 'static'), 'manifest.json', mimetype='application/manifest+json')


@app.route('/sw.js')
def serve_sw():
    return send_from_directory(os.path.join(BASE_DIR, 'static'), 'sw.js', mimetype='application/javascript')





@app.route('/api/samples', methods=['GET'])
def get_samples():
    """Return benchmark sample images located in Bengaluru road network"""
    samples = [
        {
            "id": "pothole_sample_1",
            "title": "Silk Board Junction Crater",
            "category": "Pothole",
            "description": "Multi-crater asphalt hollow on Hosur Road ramp with water accumulation",
            "url": "/static/samples/pothole_sample_1.jpg",
            "default_lat": 12.917649,
            "default_lng": 77.623788,
            "default_address": "Silk Board Junction, Hosur Road, BTM Layout, Bengaluru, Karnataka 560068",
            "zone": "Bommanahalli Zone",
            "ward": "Ward 174 (BTM Layout)"
        },
        {
            "id": "pothole_sample_2",
            "title": "Whitefield ITPL Pavement Cavity",
            "category": "Pothole",
            "description": "Deep asphalt cavity in fast corridor causing traffic crawl",
            "url": "/static/samples/pothole_sample_2.jpg",
            "default_lat": 12.984523,
            "default_lng": 77.749871,
            "default_address": "Whitefield Main Rd near ITPL & Hope Farm, Bengaluru, Karnataka 560066",
            "zone": "Mahadevapura Zone",
            "ward": "Ward 84 (Hagadur)"
        },
        {
            "id": "clean_road_sample",
            "title": "Vidhana Soudha White-Topped Road",
            "category": "Pothole",
            "description": "Smooth, freshly paved high-density asphalt roadway verified safe",
            "url": "/static/samples/clean_road_sample.jpg",
            "default_lat": 12.979692,
            "default_lng": 77.590652,
            "default_address": "Dr Ambedkar Veedhi, Near Vidhana Soudha, Bengaluru, Karnataka 560001",
            "zone": "Central Zone",
            "ward": "Ward 111 (Shantala Nagar)"
        }
    ]
    return jsonify({"success": True, "samples": samples})


@app.route('/api/civic-contacts', methods=['GET'])
def get_civic_contacts():
    """Official BBMP Mayor, Karnataka PWD, BTP and civic helpline directory"""
    contacts = {
        "city": "Bengaluru (Bangalore)",
        "state": "Karnataka",
        "official_body": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
        "mayor_office": {
            "title": "BBMP Mayor & Chief Commissioner",
            "location": "BBMP Head Office, N.R. Square, Corporation Building, Bengaluru - 560002",
            "phone": "080-22660000 / 080-22221188",
            "email": "comm@bbmp.gov.in",
            "twitter": "@BBMPCOMM",
            "deputy_cm_minister_incharge": "@DKShivakumar (Bengaluru Development Minister)"
        },
        "helplines": [
            {
                "name": "BBMP 24x7 Control Room & Sahaaya",
                "phone": "1533 / 080-22660000",
                "whatsapp": "+91 94806 85700",
                "purpose": "Potholes, broken roads, footpath damage & fallen trees",
                "portal": "https://bbmpgov.in"
            },
            {
                "name": "Bangalore Traffic Police (BTP) Hazard Cell",
                "phone": "1095 / 080-22943030",
                "whatsapp": "+91 94808 01000",
                "purpose": "Road accidents due to potholes, waterlogging & roadblock diversions",
                "portal": "https://bangaloretrafficpolice.gov.in"
            },
            {
                "name": "BWSSB (Bangalore Water Supply & Sewerage)",
                "phone": "1916 / 080-22238888",
                "whatsapp": "+91 87622 28888",
                "purpose": "Road digging for sewage drilling, pipeline leakages & uncovered manholes",
                "portal": "https://bwssb.karnataka.gov.in"
            },
            {
                "name": "BESCOM (Electricity Supply)",
                "phone": "1912",
                "whatsapp": "+91 94498 18123",
                "purpose": "Cable trenching on roads, open electrical junction pits",
                "portal": "https://bescom.karnataka.gov.in"
            },
            {
                "name": "Karnataka PWD Grievance Cell",
                "phone": "080-22212260",
                "purpose": "State highways and major arterial bypass roads in Karnataka",
                "portal": "https://kpwd.karnataka.gov.in"
            }
        ],
        "bbmp_zones": [
            {"zone": "Mahadevapura", "joint_comm_phone": "080-28512402", "areas": "Whitefield, Bellandur, Marathahalli, ORR, Hoodi"},
            {"zone": "Bommanahalli", "joint_comm_phone": "080-25732626", "areas": "Silk Board, HSR Layout, BTM Layout, Begur"},
            {"zone": "East Zone", "joint_comm_phone": "080-22975801", "areas": "Indiranagar, Halasuru, Shivaji Nagar, CV Raman Nagar"},
            {"zone": "South Zone", "joint_comm_phone": "080-26566085", "areas": "Jayanagar, JP Nagar, Banashankari, Basavanagudi"},
            {"zone": "West Zone", "joint_comm_phone": "080-23381668", "areas": "Malleshwaram, Rajajinagar, Gandhinagar"},
            {"zone": "Yelahanka", "joint_comm_phone": "080-23636671", "areas": "Hebbal, Sahakar Nagar, Vidyaranyapura, Yelahanka New Town"}
        ]
    }
    return jsonify({"success": True, "data": contacts})


@app.route('/api/detect', methods=['POST'])
def detect_potholes():
    """
    Run detection on an uploaded image or sample image.
    Does not commit to DB until user confirms report submission.
    """
    sensitivity = request.form.get('sensitivity', 'balanced')
    sample_id = request.form.get('sample_id')
    category = request.form.get('category', 'Pothole')

    if sample_id:
        sample_filename = f"{sample_id}.jpg"
        src_path = os.path.join(SAMPLES_FOLDER, sample_filename)
        if not os.path.exists(src_path):
            return jsonify({"success": False, "error": "Sample image not found"}), 404

        unique_id = uuid.uuid4().hex[:10]
        annotated_name = f"sample_{sample_id}_annotated_{unique_id}.jpg"
        annotated_path = os.path.join(UPLOAD_FOLDER, annotated_name)

        try:
            results = detector.analyze_image(src_path, output_annotated_path=annotated_path, sensitivity=sensitivity)
            return jsonify({
                "success": True,
                "original_url": f"/static/samples/{sample_filename}",
                "original_filename": f"samples/{sample_filename}",
                "annotated_url": f"/static/uploads/{annotated_name}",
                "annotated_filename": f"uploads/{annotated_name}",
                "category": category,
                "analysis": {
                    "has_pothole": results["has_pothole"],
                    "pothole_count": results["pothole_count"],
                    "overall_severity": results["overall_severity"],
                    "confidence": results["confidence"],
                    "recommendation": results["recommendation"],
                    "detections": results["detections"],
                    "image_dims": results.get("image_dims", {})
                }
            })
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # User uploaded a file
    if 'image' not in request.files:
        return jsonify({"success": False, "error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"success": False, "error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Unsupported file format. Please upload JPG, PNG, or WEBP."}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_id = uuid.uuid4().hex[:10]
    orig_filename = f"upload_{unique_id}.{ext}"
    orig_path = os.path.join(UPLOAD_FOLDER, orig_filename)
    file.save(orig_path)

    annotated_filename = f"annotated_{unique_id}.{ext}"
    annotated_path = os.path.join(UPLOAD_FOLDER, annotated_filename)

    try:
        results = detector.analyze_image(orig_path, output_annotated_path=annotated_path, sensitivity=sensitivity)
        exif_loc = extract_exif_gps(orig_path)
        return jsonify({
            "success": True,
            "original_url": f"/static/uploads/{orig_filename}",
            "original_filename": f"uploads/{orig_filename}",
            "annotated_url": f"/static/uploads/{annotated_filename}",
            "annotated_filename": f"uploads/{annotated_filename}",
            "category": category,
            "exif_location": exif_loc,
            "analysis": {
                "has_pothole": results["has_pothole"],
                "pothole_count": results["pothole_count"],
                "overall_severity": results["overall_severity"],
                "confidence": results["confidence"],
                "recommendation": results["recommendation"],
                "detections": results["detections"],
                "image_dims": results.get("image_dims", {})
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Detection failed: {str(e)}"}), 500


@app.route('/api/reports', methods=['GET', 'POST'])
def handle_reports():
    if request.method == 'POST':
        data = request.get_json() or {}
        
        required_fields = ['original_image', 'annotated_image', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400

        try:
            report_id = add_report(data)
            created_report = get_report_by_id(report_id)
            return jsonify({"success": True, "report": created_report}), 201
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # GET
    severity = request.args.get('severity')
    status = request.args.get('status')
    category = request.args.get('category')
    reports = get_all_reports(severity=severity, status=status, category=category)
    return jsonify({"success": True, "count": len(reports), "reports": reports})


@app.route('/api/reports/<int:report_id>', methods=['GET', 'DELETE'])
def report_detail(report_id):
    if request.method == 'DELETE':
        delete_report(report_id)
        return jsonify({"success": True, "message": "Report deleted successfully"})

    report = get_report_by_id(report_id)
    if not report:
        return jsonify({"success": False, "error": "Report not found"}), 404
    return jsonify({"success": True, "report": report})


@app.route('/api/reports/<int:report_id>/status', methods=['PATCH'])
def update_status(report_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    valid_statuses = ['Reported', 'Under Review', 'Scheduled for Repair', 'Repaired']
    
    if new_status not in valid_statuses:
        return jsonify({"success": False, "error": f"Invalid status. Must be one of {valid_statuses}"}), 400

    update_report_status(report_id, new_status)
    return jsonify({"success": True, "message": "Status updated successfully", "status": new_status})


@app.route('/api/config', methods=['GET', 'POST'])
def manage_config():
    config_file = os.path.join(BASE_DIR, 'config.json')
    if request.method == 'POST':
        data = request.get_json() or {}
        key = data.get('google_maps_api_key', '').strip()
        config_data = {}
        if os.path.exists(config_file):
            try:
                import json
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
            except Exception:
                config_data = {}
        config_data['google_maps_api_key'] = key
        with open(config_file, 'w', encoding='utf-8') as f:
            import json
            json.dump(config_data, f, indent=2)
        return jsonify({"success": True, "message": "API key saved successfully", "has_key": bool(key)})

    # GET
    key = ""
    if os.path.exists(config_file):
        try:
            import json
            with open(config_file, 'r', encoding='utf-8') as f:
                c = json.load(f)
                key = c.get('google_maps_api_key', '')
        except Exception:
            pass
    return jsonify({"success": True, "google_maps_api_key": key, "has_key": bool(key)})


def extract_exif_gps(image_path):
    """Extract GPS coordinates from smartphone camera EXIF metadata if present"""
    try:
        from PIL import Image, ExifTags
        with Image.open(image_path) as img:
            exif = img._getexif()
            if not exif:
                return None
            gps_info = {}
            for tag_id, value in exif.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    for t in value:
                        sub_tag = ExifTags.GPSTAGS.get(t, t)
                        gps_info[sub_tag] = value[t]
            if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
                def _to_deg(val):
                    d, m, s = val
                    return float(d) + float(m) / 60.0 + float(s) / 3600.0
                lat = _to_deg(gps_info['GPSLatitude'])
                if gps_info.get('GPSLatitudeRef', 'N') != 'N':
                    lat = -lat
                lng = _to_deg(gps_info['GPSLongitude'])
                if gps_info.get('GPSLongitudeRef', 'E') != 'E':
                    lng = -lng
                return {"latitude": round(lat, 6), "longitude": round(lng, 6)}
    except Exception:
        pass
    return None


@app.route('/api/network-location', methods=['GET'])
def get_network_location():
    """Fallback IP / Network location for clients where HTTP blocks GPS"""
    try:
        import urllib.request, json
        req = urllib.request.Request(
            'https://ipapi.co/json/',
            headers={'User-Agent': 'RoadGuard-Bengaluru/1.0'}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if 'latitude' in data and 'longitude' in data:
                return jsonify({
                    "success": True,
                    "latitude": data['latitude'],
                    "longitude": data['longitude'],
                    "city": data.get('city', 'Bengaluru'),
                    "region": data.get('region', 'Karnataka')
                })
    except Exception:
        pass
    # Fallback to Bengaluru Central
    return jsonify({
        "success": True,
        "latitude": 12.9716,
        "longitude": 77.5946,
        "city": "Bengaluru",
        "region": "Karnataka"
    })


@app.route('/api/stats', methods=['GET'])
def get_dashboard_stats():
    stats = get_stats()
    return jsonify({"success": True, "stats": stats})


if __name__ == '__main__':
    init_db()
    cert_path = os.path.join(BASE_DIR, 'cert.pem')
    key_path = os.path.join(BASE_DIR, 'key.pem')

    import threading
    def run_https_server():
        if os.path.exists(cert_path) and os.path.exists(key_path):
            import ssl
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(cert_path, key_path)
            print("RoadGuard HTTPS Server running on https://0.0.0.0:5443 (For Native Phone GPS)")
            app.run(host='0.0.0.0', port=5443, ssl_context=context, debug=False, use_reloader=False)

    https_thread = threading.Thread(target=run_https_server, daemon=True)
    https_thread.start()

    print("RoadGuard HTTP Server running on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)

