/**
 * RoadGuard Bengaluru - Application Controller
 * Ultra-Simple, Accessible Light-Mode UI for Pothole & Road Hazard Reporting
 * Facilitating Quicker BBMP Repairs with GPS Geotagging & 1-Tap WhatsApp Grievance
 */

// Global State
const state = {
    currentTab: 'tab-report',
    // Default: Bengaluru Silk Board Junction
    currentLocation: {
        lat: 12.917649,
        lng: 77.623788,
        address: 'Silk Board Junction, Hosur Road, BTM Layout, Bengaluru 560068'
    },
    activeScanResult: null,
    pickerMap: null,
    pickerMarker: null,
    hazardMap: null,
    hazardMarkers: [],
    userLocationMarker: null,
    reportsList: [],
    radarAudioEnabled: true,
    lastBuzzTimestamp: 0,
    audioContext: null,
    currentMapLayer: 'google-road',
    pickerTileLayer: null,
    hazardTileLayer: null
};

// ==========================================================================
// Tile Layer Provider (Google Maps & OpenStreetMap - No Carto API key needed)
// ==========================================================================
function createTileLayer(layerType = state.currentMapLayer) {
    if (layerType === 'google-road') {
        return L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '&copy; Google Maps'
        });
    } else if (layerType === 'google-satellite') {
        return L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '&copy; Google Satellite'
        });
    } else {
        return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        });
    }
}

function switchMapLayer(newLayer) {
    state.currentMapLayer = newLayer;
    if (state.pickerMap && state.pickerTileLayer) {
        state.pickerMap.removeLayer(state.pickerTileLayer);
        state.pickerTileLayer = createTileLayer(newLayer).addTo(state.pickerMap);
    }
    if (state.hazardMap && state.hazardTileLayer) {
        state.hazardMap.removeLayer(state.hazardTileLayer);
        state.hazardTileLayer = createTileLayer(newLayer).addTo(state.hazardMap);
    }
}

// ==========================================================================
// Toast Notifications
// ==========================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';

    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}

// ==========================================================================
// Audio Warning Tone & Phone Vibration (Proximity Alert)
// ==========================================================================
function playPotholeBuzzTone() {
    if (!state.radarAudioEnabled) return;

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (!state.audioContext) {
            state.audioContext = new AudioCtx();
        }
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }

        const now = state.audioContext.currentTime;
        const osc = state.audioContext.createOscillator();
        const gain = state.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
        osc.frequency.setValueAtTime(340, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.38);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

        osc.connect(gain);
        gain.connect(state.audioContext.destination);

        osc.start(now);
        osc.stop(now + 0.42);
    } catch (e) {
        console.warn('Audio Context warning:', e);
    }

    if (navigator.vibrate) {
        try {
            navigator.vibrate([160, 80, 160]);
        } catch (e) {
            console.warn('Vibration not permitted:', e);
        }
    }
}

function showProximityBanner(title, desc) {
    const banner = document.getElementById('proximityBuzzBanner');
    const titleEl = document.getElementById('buzzHazardTitle');
    const descEl = document.getElementById('buzzHazardDesc');

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (banner) banner.style.display = 'flex';

    if (window.lucide) lucide.createIcons();
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function checkHazardsProximity(userLat, userLng) {
    if (!state.reportsList || state.reportsList.length === 0) return;

    const PROXIMITY_THRESHOLD = 90;
    const currentTime = Date.now();

    if (currentTime - state.lastBuzzTimestamp < 12000) return;

    for (const report of state.reportsList) {
        if (report.status === 'Repaired' || report.severity === 'Safe / Clear Road') continue;

        const dist = getDistanceMeters(userLat, userLng, report.latitude, report.longitude);
        if (dist <= PROXIMITY_THRESHOLD) {
            state.lastBuzzTimestamp = currentTime;
            playPotholeBuzzTone();
            
            showProximityBanner(
                `⚠️ POTHOLE NEARBY: ${report.severity.toUpperCase()} (${Math.round(dist)}m Ahead!)`,
                `${report.category}: ${report.title} on ${report.address.split(',')[0]}`
            );
            break;
        }
    }
}

// ==========================================================================
// GEOLOCATION ENGINE ("CURRENT LOCATION" BUTTONS & HOTSPOTS)
// ==========================================================================
function checkSecurityContext() {
    const tipBox = document.getElementById('httpsTipBox');
    const linkSwitch = document.getElementById('linkHttpsSwitch');

    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (tipBox) tipBox.style.display = 'block';
        if (linkSwitch) {
            linkSwitch.href = `https://${window.location.hostname}:5443`;
            linkSwitch.textContent = `🔒 Open via Secure HTTPS (https://${window.location.hostname}:5443)`;
        }
    } else {
        if (tipBox) tipBox.style.display = 'none';
    }
}

function requestUserLocation(showNotice = false) {
    checkSecurityContext();

    if (!navigator.geolocation) {
        fallbackNetworkLocation(showNotice, 'Browser does not support GPS');
        return;
    }

    if (showNotice) {
        showToast('📍 Accessing GPS location...', 'info');
    }

    const locStatusText = document.getElementById('locStatusText');
    if (locStatusText && showNotice) {
        locStatusText.textContent = '📍 Finding your GPS location... Please wait';
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setFormCoordinates(lat, lng);
            reverseGeocode(lat, lng);

            if (state.pickerMap) {
                state.pickerMap.setView([lat, lng], 16, { animate: true });
                if (state.pickerMarker) state.pickerMarker.setLatLng([lat, lng]);
            }
            if (state.hazardMap) {
                state.hazardMap.setView([lat, lng], 16, { animate: true });
                dropUserMarkerOnMap(lat, lng);
            }

            checkHazardsProximity(lat, lng);

            if (showNotice) {
                showToast('📍 Located! Your current phone GPS is pinned.', 'success');
            }
        },
        (err) => {
            console.warn('Geolocation error:', err.message);
            fallbackNetworkLocation(showNotice, 'Phone browser requires HTTPS or permission to access GPS');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

async function fallbackNetworkLocation(showNotice, reason) {
    const locStatusText = document.getElementById('locStatusText');
    const tipBox = document.getElementById('httpsTipBox');

    if (tipBox && window.location.protocol === 'http:') {
        tipBox.style.display = 'block';
    }

    try {
        const res = await fetch('/api/network-location');
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
            setFormCoordinates(data.latitude, data.longitude);
            reverseGeocode(data.latitude, data.longitude);
            if (showNotice) {
                showToast('📍 GPS blocked on HTTP. Set to Bengaluru. Pick your area below!', 'info');
            }
            return;
        }
    } catch (e) {
        console.warn('Network location failed:', e);
    }

    if (locStatusText) {
        locStatusText.textContent = `📍 Selected: Silk Board Junction, Hosur Road, Bengaluru`;
    }
    if (showNotice) {
        showToast('📍 Tap your area below (e.g. Silk Board, Indiranagar) or touch map!', 'info');
    }
}

function initHotspotsAndSearch() {
    // 1-Tap Bengaluru Area Chips
    document.querySelectorAll('.btn-area-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-area-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const lat = parseFloat(btn.dataset.lat);
            const lng = parseFloat(btn.dataset.lng);
            const addr = btn.dataset.addr;
            const zone = btn.dataset.zone;
            const ward = btn.dataset.ward;

            setFormCoordinates(lat, lng);

            const addrInp = document.getElementById('inputAddress');
            const zoneInp = document.getElementById('selectZone');
            const wardInp = document.getElementById('inputWard');
            const locStatus = document.getElementById('locStatusText');

            if (addrInp) addrInp.value = addr;
            if (zoneInp) zoneInp.value = zone;
            if (wardInp) wardInp.value = ward;
            if (locStatus) locStatus.textContent = `📍 Selected: ${addr}`;

            if (state.pickerMap) {
                state.pickerMap.setView([lat, lng], 15);
                if (state.pickerMarker) state.pickerMarker.setLatLng([lat, lng]);
            }
            if (state.hazardMap) {
                state.hazardMap.setView([lat, lng], 15);
                dropUserMarkerOnMap(lat, lng);
            }

            showToast(`📍 Set area to ${btn.textContent.trim().replace('📍 ', '')}`, 'success');
        });
    });

    // Area Search by Name
    const searchBtn = document.getElementById('btnSearchArea');
    const searchInp = document.getElementById('inputSearchArea');

    const doSearch = async () => {
        const query = searchInp?.value.trim();
        if (!query) {
            showToast('Enter an area name first', 'info');
            return;
        }
        showToast(`Searching for "${query}" in Bengaluru...`, 'info');
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Bengaluru, Karnataka')}&limit=1`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const list = await res.json();
            if (list && list.length > 0) {
                const lat = parseFloat(list[0].lat);
                const lng = parseFloat(list[0].lon);
                setFormCoordinates(lat, lng);
                const display = list[0].display_name.split(',').slice(0, 3).join(',');
                document.getElementById('inputAddress').value = display;
                document.getElementById('locStatusText').textContent = `📍 Found: ${display}`;
                if (state.pickerMap) {
                    state.pickerMap.setView([lat, lng], 15);
                    if (state.pickerMarker) state.pickerMarker.setLatLng([lat, lng]);
                }
                showToast(`📍 Located: ${display}`, 'success');
            } else {
                showToast('Could not find area. Please tap directly on the map.', 'error');
            }
        } catch (e) {
            showToast('Search failed. Please tap map directly.', 'error');
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInp) {
        searchInp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSearch();
            }
        });
    }
}


function dropUserMarkerOnMap(lat, lng) {
    if (!state.hazardMap) return;

    if (state.userLocationMarker) {
        state.userLocationMarker.setLatLng([lat, lng]);
    } else {
        const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: '<div style="width: 20px; height: 20px; background: #2563EB; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 12px rgba(37,99,235,0.8); animation: pulse-ring 1.5s infinite;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        state.userLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(state.hazardMap);
        state.userLocationMarker.bindPopup('<strong>📍 You Are Here</strong><br>Current Bengaluru Location');
    }
}

function setFormCoordinates(lat, lng) {
    state.currentLocation.lat = lat;
    state.currentLocation.lng = lng;

    const latInp = document.getElementById('inputLatitude');
    const lngInp = document.getElementById('inputLongitude');
    if (latInp) latInp.value = lat.toFixed(6);
    if (lngInp) lngInp.value = lng.toFixed(6);

    const gmapsBtn = document.getElementById('btnOpenGMaps');
    if (gmapsBtn) {
        gmapsBtn.href = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    }

    if (state.pickerMap && state.pickerMarker) {
        state.pickerMarker.setLatLng([lat, lng]);
        state.pickerMap.setView([lat, lng], 15);
    }
}

async function reverseGeocode(lat, lng) {
    const addressInp = document.getElementById('inputAddress');
    const locStatusText = document.getElementById('locStatusText');

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (data && data.display_name) {
            const addr = data.address || {};
            const road = addr.road || addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.state_district || 'Bengaluru';
            const clean = [road, city].filter(Boolean).join(', ');
            const finalAddr = clean || data.display_name.split(',').slice(0, 3).join(',');

            if (addressInp) addressInp.value = finalAddr;
            state.currentLocation.address = finalAddr;

            if (locStatusText) {
                locStatusText.textContent = `📍 Current Location: ${finalAddr} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
        }
    } catch (e) {
        if (locStatusText) {
            locStatusText.textContent = `📍 Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    }
}

// ==========================================================================
// TAB SWITCHING (CLEAN & NON-OVERLAPPING)
// ==========================================================================
function initNavigation() {
    const desktopBtns = document.querySelectorAll('.desktop-nav .nav-tab-btn');
    const mobileBtns = document.querySelectorAll('.capi-bottom-dock .dock-btn, .mobile-bottom-nav .m-nav-item');

    function switchTab(tabId) {
        state.currentTab = tabId;

        desktopBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        mobileBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });

        if (window.lucide) lucide.createIcons();

        // Invalidate map sizes so tiles redraw cleanly without gaps
        if (tabId === 'tab-map' && state.hazardMap) {
            setTimeout(() => {
                state.hazardMap.invalidateSize();
                if (state.currentLocation.lat && state.currentLocation.lng) {
                    state.hazardMap.setView([state.currentLocation.lat, state.currentLocation.lng], 13);
                }
            }, 150);
        }
        if (tabId === 'tab-report' && state.pickerMap) {
            setTimeout(() => {
                state.pickerMap.invalidateSize();
            }, 150);
        }
        if (tabId === 'tab-mayor') {
            populateComplaintDropdown();
        }
    }

    desktopBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    mobileBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

// ==========================================================================
// PHOTO UPLOAD & AI POTHOLE SCANNER
// ==========================================================================
function initUploadAndScanner() {
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');
    const browseBtn = document.getElementById('browseFileBtn');
    const cameraBtn = document.getElementById('takePhotoBtn');
    const sampleBtns = document.querySelectorAll('.sample-pill-btn');

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    if (cameraBtn && cameraInput) {
        cameraBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cameraInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) handleImageUpload(fileInput.files[0]);
        });
    }

    if (cameraInput) {
        cameraInput.addEventListener('change', () => {
            if (cameraInput.files && cameraInput.files[0]) handleImageUpload(cameraInput.files[0]);
        });
    }

    sampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sampleId = btn.dataset.sample;
            handleSampleBenchmark(sampleId);
        });
    });

    // Toggle between AI detected bounding boxes and original photo
    const btnAnnotated = document.getElementById('btnViewAnnotated');
    const btnOriginal = document.getElementById('btnViewOriginal');
    const imgAnnotated = document.getElementById('annotatedPreviewImg');
    const imgOriginal = document.getElementById('originalPreviewImg');

    if (btnAnnotated && btnOriginal && imgAnnotated && imgOriginal) {
        btnAnnotated.addEventListener('click', () => {
            btnAnnotated.classList.add('active');
            btnOriginal.classList.remove('active');
            imgAnnotated.style.display = 'block';
            imgOriginal.style.display = 'none';
        });

        btnOriginal.addEventListener('click', () => {
            btnOriginal.classList.add('active');
            btnAnnotated.classList.remove('active');
            imgAnnotated.style.display = 'none';
            imgOriginal.style.display = 'block';
        });
    }

    const resetBtn = document.getElementById('btnResetScan');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetScanner());
    }
}

function resetScanner() {
    state.activeScanResult = null;
    const idleState = document.getElementById('uploadIdleState');
    const procState = document.getElementById('uploadProcessingState');
    const resultBox = document.getElementById('scanResultContainer');
    const submitBtn = document.getElementById('btnSubmitReport');
    const note = document.getElementById('submitHelperNote');

    if (idleState) idleState.style.display = 'grid';
    if (procState) procState.style.display = 'none';
    if (resultBox) resultBox.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    if (note) note.textContent = 'Upload a photo in Step 2 or pick a sample photo to submit';

    const fInp = document.getElementById('fileInput');
    const cInp = document.getElementById('cameraInput');
    if (fInp) fInp.value = '';
    if (cInp) cInp.value = '';
}

async function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file', 'error');
        return;
    }

    const idleState = document.getElementById('uploadIdleState');
    const procState = document.getElementById('uploadProcessingState');
    const procImg = document.getElementById('processingPreviewImg');
    const resultBox = document.getElementById('scanResultContainer');

    if (procImg) procImg.src = URL.createObjectURL(file);
    if (idleState) idleState.style.display = 'none';
    if (procState) procState.style.display = 'flex';
    if (resultBox) resultBox.style.display = 'none';

    const category = document.getElementById('selectCategory')?.value || 'Pothole';
    const formData = new FormData();
    formData.append('image', file);
    formData.append('sensitivity', 'medium');
    formData.append('category', category);

    try {
        const response = await fetch('/api/detect', { method: 'POST', body: formData });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Detection failed');

        if (data.exif_location && data.exif_location.latitude && data.exif_location.longitude) {
            setFormCoordinates(data.exif_location.latitude, data.exif_location.longitude);
            reverseGeocode(data.exif_location.latitude, data.exif_location.longitude);
            showToast('📍 Extracted exact GPS coordinates from your photo!', 'success');
        }

        displayScanResult(data);
        showToast('Road distress analysis completed!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
        resetScanner();
    }
}


async function handleSampleBenchmark(sampleId) {
    const idleState = document.getElementById('uploadIdleState');
    const procState = document.getElementById('uploadProcessingState');
    const procImg = document.getElementById('processingPreviewImg');
    const resultBox = document.getElementById('scanResultContainer');

    if (procImg) procImg.src = `/static/samples/${sampleId}.jpg`;
    if (idleState) idleState.style.display = 'none';
    if (procState) procState.style.display = 'flex';
    if (resultBox) resultBox.style.display = 'none';

    // Set Bengaluru preset coordinates for sample
    if (sampleId === 'pothole_sample_1') {
        setFormCoordinates(12.917649, 77.623788);
        document.getElementById('inputAddress').value = "Silk Board Junction, Hosur Road, BTM Layout, Bengaluru";
        document.getElementById('selectZone').value = "Bommanahalli Zone";
        document.getElementById('inputWard').value = "Ward 174 (BTM Layout)";
    } else if (sampleId === 'pothole_sample_2') {
        setFormCoordinates(12.984523, 77.749871);
        document.getElementById('inputAddress').value = "Whitefield Main Rd near ITPL & Hope Farm, Bengaluru";
        document.getElementById('selectZone').value = "Mahadevapura Zone";
        document.getElementById('inputWard').value = "Ward 84 (Hagadur)";
    } else {
        setFormCoordinates(12.979692, 77.590652);
        document.getElementById('inputAddress').value = "Dr Ambedkar Veedhi, Near Vidhana Soudha, Bengaluru";
        document.getElementById('selectZone').value = "Central Zone";
        document.getElementById('inputWard').value = "Ward 111 (Shantala Nagar)";
    }

    const category = document.getElementById('selectCategory')?.value || 'Pothole';
    const formData = new FormData();
    formData.append('sample_id', sampleId);
    formData.append('sensitivity', 'medium');
    formData.append('category', category);

    try {
        const response = await fetch('/api/detect', { method: 'POST', body: formData });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Benchmark scan failed');

        displayScanResult(data);
        showToast(`Analyzed sample photo`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
        resetScanner();
    }
}

function displayScanResult(resultData) {
    state.activeScanResult = resultData;

    const idleState = document.getElementById('uploadIdleState');
    const procState = document.getElementById('uploadProcessingState');
    const resultBox = document.getElementById('scanResultContainer');

    if (idleState) idleState.style.display = 'none';
    if (procState) procState.style.display = 'none';
    if (resultBox) resultBox.style.display = 'block';

    const imgAnnotated = document.getElementById('annotatedPreviewImg');
    const imgOriginal = document.getElementById('originalPreviewImg');
    if (imgAnnotated) imgAnnotated.src = resultData.annotated_url;
    if (imgOriginal) imgOriginal.src = resultData.original_url;

    const btnAnnotated = document.getElementById('btnViewAnnotated');
    const btnOriginal = document.getElementById('btnViewOriginal');
    if (btnAnnotated) btnAnnotated.classList.add('active');
    if (btnOriginal) btnOriginal.classList.remove('active');
    if (imgAnnotated) imgAnnotated.style.display = 'block';
    if (imgOriginal) imgOriginal.style.display = 'none';

    const analysis = resultData.analysis;
    const sevPill = document.getElementById('resultSeverityPill');
    if (sevPill) {
        sevPill.textContent = `${analysis.overall_severity} Road Distress`;
        sevPill.className = 'result-badge-sev';
        if (analysis.overall_severity === 'Critical') sevPill.classList.add('critical');
        else if (analysis.overall_severity === 'Moderate') sevPill.classList.add('moderate');
        else if (analysis.overall_severity === 'Minor') sevPill.classList.add('minor');
        else sevPill.classList.add('safe');
    }

    const countEl = document.getElementById('resultPotholeCount');
    const confEl = document.getElementById('resultConfidence');
    const recText = document.getElementById('resultRecommendationText');

    if (countEl) countEl.textContent = analysis.pothole_count;
    if (confEl) confEl.textContent = `${analysis.confidence}%`;
    if (recText) recText.textContent = analysis.recommendation;

    // Enable submit button
    const submitBtn = document.getElementById('btnSubmitReport');
    const note = document.getElementById('submitHelperNote');
    if (submitBtn) {
        submitBtn.disabled = false;
    }
    if (note) {
        note.textContent = '✅ Photo analyzed! Tap button above to submit to BBMP';
    }

    // Auto-update report title
    const titleInp = document.getElementById('inputTitle');
    const category = document.getElementById('selectCategory')?.value || 'Pothole';
    if (titleInp && analysis.has_pothole) {
        titleInp.value = `${analysis.overall_severity} ${category} Hazard (${analysis.pothole_count} Cavities)`;
    }

    if (window.lucide) lucide.createIcons();
}

// ==========================================================================
// MINI LOCATION PICKER MAP (STEP 1)
// ==========================================================================
function initMiniPickerMap() {
    const lat = state.currentLocation.lat;
    const lng = state.currentLocation.lng;

    state.pickerMap = L.map('pickerMap', {
        zoomControl: false,
        attributionControl: false
    }).setView([lat, lng], 14);

    state.pickerTileLayer = createTileLayer(state.currentMapLayer).addTo(state.pickerMap);

    state.pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(state.pickerMap);

    state.pickerMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setFormCoordinates(pos.lat, pos.lng);
        reverseGeocode(pos.lat, pos.lng);
    });

    state.pickerMap.on('click', (e) => {
        state.pickerMarker.setLatLng(e.latlng);
        setFormCoordinates(e.latlng.lat, e.latlng.lng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // BIG "USE MY CURRENT LOCATION" BUTTON IN FORM
    const btnGetLocation = document.getElementById('btnGetLocation');
    if (btnGetLocation) {
        btnGetLocation.addEventListener('click', () => {
            requestUserLocation(true);
        });
    }

    // Google Maps Sync
    const btnSync = document.getElementById('btnExtractGMaps');
    if (btnSync) {
        btnSync.addEventListener('click', () => parseGoogleMapsInput());
    }
}

function parseGoogleMapsInput() {
    const raw = document.getElementById('inputGoogleMapsUrl')?.value.trim();
    if (!raw) {
        showToast('Paste a Google Maps link or coordinates first', 'info');
        return;
    }

    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const plainRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;

    const match = raw.match(atRegex) || raw.match(qRegex) || raw.match(plainRegex);
    if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        setFormCoordinates(lat, lng);
        reverseGeocode(lat, lng);
        showToast('Location synced from Google Maps link!', 'success');
    } else {
        showToast('Could not extract coordinates. Please tap on the map directly.', 'error');
    }
}

// ==========================================================================
// HAZARD MAP TAB & "FIND MY LOCATION" OVERLAY
// ==========================================================================
function initHazardMap() {
    state.hazardMap = L.map('hazardMap', { zoomControl: true }).setView([12.9716, 77.5946], 12);

    state.hazardTileLayer = createTileLayer(state.currentMapLayer).addTo(state.hazardMap);

    // Refresh Map Button
    const refreshBtn = document.getElementById('btnRefreshMap');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadReports();
            showToast('Refreshing road hazards...', 'info');
        });
    }

    // BIG PROMINENT "FIND MY LOCATION" BUTTON ON MAP
    const findMeBtn = document.getElementById('btnCenterUser');
    if (findMeBtn) {
        findMeBtn.addEventListener('click', () => {
            requestUserLocation(true);
        });
    }

    // Map Layer Selector
    const layerSelect = document.getElementById('mapLayerSelect');
    if (layerSelect) {
        layerSelect.addEventListener('change', (e) => {
            switchMapLayer(e.target.value);
        });
    }

    // Category Filter Chips
    const chips = document.querySelectorAll('.map-filter-chips .chip-btn');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderHazardPins(chip.dataset.cat);
        });
    });
}

function renderHazardPins(filterCat = 'all') {
    if (!state.hazardMap) return;

    state.hazardMarkers.forEach(m => state.hazardMap.removeLayer(m));
    state.hazardMarkers = [];

    const filtered = state.reportsList.filter(rep => {
        if (filterCat === 'all') return true;
        return rep.category === filterCat;
    });

    filtered.forEach(rep => {
        const lat = rep.latitude;
        const lng = rep.longitude;
        if (!lat || !lng) return;

        let pinClass = 'pin-moderate';
        let iconName = 'alert-triangle';

        if (rep.category === 'Sewage Drilling') {
            pinClass = 'pin-sewage';
            iconName = 'cone';
        } else if (rep.category === 'Metro Construction') {
            pinClass = 'pin-metro';
            iconName = 'hard-hat';
        } else if (rep.category === 'BESCOM Trenching') {
            pinClass = 'pin-trench';
            iconName = 'zap';
        } else if (rep.severity === 'Critical') {
            pinClass = 'pin-critical';
            iconName = 'alert-octagon';
        } else if (rep.severity === 'Safe / Clear Road' || rep.status === 'Repaired') {
            pinClass = 'pin-safe';
            iconName = 'check';
        }

        const customIcon = L.divIcon({
            className: 'custom-hazard-marker-wrapper',
            html: `<div class="custom-hazard-pin ${pinClass}"><i data-lucide="${iconName}"></i></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(state.hazardMap);
        const gmapsUrl = rep.google_maps_url || `https://www.google.com/maps?q=${lat},${lng}`;

        const popupContent = `
            <div style="font-family: inherit; color: #0F172A; max-width: 240px; padding: 2px;">
                <div style="position: relative; height: 110px; border-radius: 8px; overflow: hidden; margin-bottom: 6px; background: #000;">
                    <img src="/static/${rep.annotated_image}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/static/${rep.original_image}'">
                    <span style="position: absolute; top: 6px; right: 6px; background: #DC2626; color: #FFF; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">
                        ${rep.category || 'Pothole'}
                    </span>
                </div>
                <h4 style="font-size: 13px; font-weight: 800; margin: 0 0 4px 0; line-height: 1.2;">${rep.title}</h4>
                <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0;">📍 ${rep.address}</p>
                <div style="display: flex; gap: 4px; margin-top: 6px;">
                    <a href="${gmapsUrl}" target="_blank" style="flex: 1; text-align: center; background: #2563EB; color: #FFF; font-size: 11px; font-weight: 700; padding: 5px; border-radius: 4px; text-decoration: none;">
                        Open Google Maps 🗺️
                    </a>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        state.hazardMarkers.push(marker);
    });

    if (window.lucide) lucide.createIcons();
}

// ==========================================================================
// REPORT FORM SUBMISSION
// ==========================================================================
function initReportForm() {
    const form = document.getElementById('reportForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!state.activeScanResult) {
            showToast('Please take or upload a road photo in Step 2 first', 'error');
            return;
        }

        const submitBtn = document.getElementById('btnSubmitReport');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-circle" style="width: 20px; height: 20px; border-color: #FFF; border-top-color: transparent;"></div> <span>Submitting...</span>';

        const lat = parseFloat(document.getElementById('inputLatitude')?.value || state.currentLocation.lat);
        const lng = parseFloat(document.getElementById('inputLongitude')?.value || state.currentLocation.lng);
        const address = document.getElementById('inputAddress')?.value || state.currentLocation.address;
        const category = document.getElementById('selectCategory')?.value || 'Pothole';
        const zone = document.getElementById('selectZone')?.value || 'Bommanahalli Zone';
        const ward = document.getElementById('inputWard')?.value || '';
        const title = document.getElementById('inputTitle')?.value || `${category} Road Hazard`;
        const description = document.getElementById('inputDescription')?.value || '';
        const reportedBy = document.getElementById('inputReporter')?.value || 'Bengaluru Citizen';

        const analysis = state.activeScanResult.analysis;

        const reportPayload = {
            title: title,
            description: description,
            category: category,
            zone: zone,
            ward_name: ward,
            original_image: state.activeScanResult.original_filename,
            annotated_image: state.activeScanResult.annotated_filename,
            latitude: lat,
            longitude: lng,
            address: address,
            google_maps_url: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
            has_pothole: analysis.has_pothole ? 1 : 0,
            pothole_count: analysis.pothole_count,
            severity: analysis.overall_severity,
            confidence: analysis.confidence,
            recommendation: analysis.recommendation,
            detections: analysis.detections,
            reported_by: reportedBy,
            status: 'Reported'
        };

        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportPayload)
            });

            const res = await response.json();
            if (!res.success) throw new Error(res.error || 'Submission failed');

            // Success Handling
            const ticket = `Ticket #RDG-${Math.floor(10000 + Math.random() * 90000)}`;
            const gmapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
            const waText = encodeURIComponent(
                `*BBMP CITIZEN GRIEVANCE: URGENT ROAD REPAIR REQUIRED*\n\n` +
                `*Hazard:* ${category} (${analysis.overall_severity})\n` +
                `*Location:* ${address}\n` +
                `*Ward/Zone:* ${ward}, ${zone}\n` +
                `*GPS Google Maps:* ${gmapsUrl}\n` +
                `*Ticket:* ${ticket}\n\n` +
                `Please repair this hazard immediately under Karnataka Municipal Corporations Act.`
            );

            // Display Success Box
            const flowContainer = document.getElementById('reportFlowContainer');
            const successBox = document.getElementById('submissionSuccessBox');
            const ticketEl = document.getElementById('successTicketNum');
            const waBtn = document.getElementById('btnSuccessWhatsApp');

            if (flowContainer) flowContainer.style.display = 'none';
            if (successBox) successBox.style.display = 'block';
            if (ticketEl) ticketEl.textContent = ticket;
            if (waBtn) waBtn.href = `https://wa.me/919480685700?text=${waText}`;

            showToast('✅ Road hazard reported successfully!', 'success');
            loadReports();

        } catch (err) {
            showToast(err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="send"></i><span>SUBMIT REPORT TO BBMP FOR REPAIR</span>';
            if (window.lucide) lucide.createIcons();
        }
    });

    const reportAnotherBtn = document.getElementById('btnReportAnother');
    if (reportAnotherBtn) {
        reportAnotherBtn.addEventListener('click', () => {
            const flowContainer = document.getElementById('reportFlowContainer');
            const successBox = document.getElementById('submissionSuccessBox');
            if (flowContainer) flowContainer.style.display = 'block';
            if (successBox) successBox.style.display = 'none';
            resetScanner();
        });
    }
}

// ==========================================================================
// REPORTS FEED & MODAL
// ==========================================================================
function initReportsFeed() {
    const searchInput = document.getElementById('reportSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = state.reportsList.filter(rep => 
                rep.title.toLowerCase().includes(query) ||
                rep.address.toLowerCase().includes(query) ||
                (rep.ward_name && rep.ward_name.toLowerCase().includes(query))
            );
            renderReportsCards(filtered);
        });
    }

    const modalClose = document.getElementById('btnCloseModal');
    const modal = document.getElementById('reportModal');
    if (modalClose && modal) {
        modalClose.addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'reportModal') modal.style.display = 'none';
        });
    }
}

async function loadReports() {
    try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        if (data.success) {
            state.reportsList = data.reports;
            renderHazardPins();
            renderReportsCards(state.reportsList);
            populateComplaintDropdown();
        }
    } catch (e) {
        console.warn('Error fetching reports:', e);
    }
}

function renderReportsCards(reports) {
    const grid = document.getElementById('reportsCardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!reports || reports.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                <i data-lucide="inbox" style="width: 44px; height: 44px; margin: 0 auto 0.5rem; display: block;"></i>
                <h4>No road hazards found</h4>
                <p style="font-size: 0.8rem;">Take a photo or search for a different area.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    reports.forEach(rep => {
        const card = document.createElement('div');
        card.className = 'report-card-light';

        const gmapsUrl = rep.google_maps_url || `https://www.google.com/maps?q=${rep.latitude},${rep.longitude}`;
        const waText = encodeURIComponent(
            `*BBMP HAZARD ESCALATION:*\n` +
            `*Issue:* ${rep.category} - ${rep.title}\n` +
            `*Location:* ${rep.address}\n` +
            `*GPS Link:* ${gmapsUrl}\n` +
            `Please fix urgently.`
        );

        card.innerHTML = `
            <div class="card-top-row">
                <span class="card-cat-pill ${rep.severity === 'Critical' ? 'critical' : 'moderate'}">
                    ${rep.category || 'Pothole'} • ${rep.severity || 'Moderate'}
                </span>
                <span class="card-date">${rep.created_at ? rep.created_at.slice(0, 10) : 'Bengaluru'}</span>
            </div>
            <h4 class="card-title">${rep.title}</h4>
            <div class="card-address">
                <i data-lucide="map-pin"></i>
                <span>${rep.address}</span>
            </div>
            <div class="card-photo-thumb">
                <img src="/static/${rep.annotated_image}" alt="Road photo" onerror="this.src='/static/${rep.original_image}'">
            </div>
            <div class="card-footer-btns">
                <a href="${gmapsUrl}" target="_blank" class="btn-card-gmaps">
                    <i data-lucide="map"></i> Google Maps
                </a>
                <a href="https://wa.me/919480685700?text=${waText}" target="_blank" class="btn-card-wa">
                    <i data-lucide="message-circle"></i> WhatsApp BBMP
                </a>
            </div>
        `;

        grid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// ==========================================================================
// MAYOR & BBMP ESCALATION TAB
// ==========================================================================
function populateComplaintDropdown() {
    const select = document.getElementById('complaintReportSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose reported hazard from list --</option>';

    state.reportsList.forEach(rep => {
        const opt = document.createElement('option');
        opt.value = rep.id;
        opt.textContent = `${rep.category}: ${rep.title} (${rep.address.split(',')[0]})`;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => {
        const repId = parseInt(select.value);
        const report = state.reportsList.find(r => r.id === repId);
        const preview = document.getElementById('complaintTextPreview');

        if (report && preview) {
            const gmapsUrl = report.google_maps_url || `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
            preview.value = 
                `To: BBMP Chief Commissioner / Mayor, Bengaluru\n` +
                `Subject: Urgent Road Repair Request for ${report.category}\n\n` +
                `Location: ${report.address}\n` +
                `Ward/Zone: ${report.ward_name || 'N/A'}, ${report.zone || 'Bengaluru'}\n` +
                `Severity: ${report.severity} (${report.pothole_count} cavities detected)\n` +
                `Google Maps GPS: ${gmapsUrl}\n\n` +
                `This road hazard is causing vehicle accidents and severe traffic delays. Please arrange immediate hot-mix asphalt patching.`;
        }
    });

    // Default to first report if available
    if (state.reportsList.length > 0 && !select.value) {
        select.value = state.reportsList[0].id;
        select.dispatchEvent(new Event('change'));
    }
}

function initCivicEscalation() {
    const waBtn = document.getElementById('btnSendWhatsApp');
    const tweetBtn = document.getElementById('btnTweetMayor');

    if (waBtn) {
        waBtn.addEventListener('click', () => {
            const text = document.getElementById('complaintTextPreview')?.value;
            if (!text) {
                showToast('Please select a hazard from the list first', 'info');
                return;
            }
            window.open(`https://wa.me/919480685700?text=${encodeURIComponent(text)}`, '_blank');
        });
    }

    if (tweetBtn) {
        tweetBtn.addEventListener('click', () => {
            const text = document.getElementById('complaintTextPreview')?.value;
            if (!text) {
                showToast('Please select a hazard from the list first', 'info');
                return;
            }
            const shortTweet = encodeURIComponent(
                `Attention @BBMPCOMM @blrcitytraffic: Dangerous road hazard reported at ${state.currentLocation.address.split(',')[0]}. Immediate repair needed. https://www.google.com/maps?q=${state.currentLocation.lat},${state.currentLocation.lng}`
            );
            window.open(`https://twitter.com/intent/tweet?text=${shortTweet}`, '_blank');
        });
    }

    const buzzToggle = document.getElementById('btnToggleRadar');
    const buzzLabel = document.getElementById('radarSoundLabel');
    if (buzzToggle) {
        buzzToggle.addEventListener('click', () => {
            state.radarAudioEnabled = !state.radarAudioEnabled;
            buzzToggle.classList.toggle('active', state.radarAudioEnabled);
            if (buzzLabel) buzzLabel.textContent = state.radarAudioEnabled ? 'Buzz: ON' : 'Buzz: OFF';
            showToast(`Proximity Alert: ${state.radarAudioEnabled ? 'ENABLED' : 'MUTED'}`, 'info');
            if (state.radarAudioEnabled) playPotholeBuzzTone();
        });
    }

    const dismissBuzz = document.getElementById('btnDismissBuzz');
    if (dismissBuzz) {
        dismissBuzz.addEventListener('click', () => {
            document.getElementById('proximityBuzzBanner').style.display = 'none';
        });
    }
}

// ==========================================================================
// APPLICATION BOOTSTRAP
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    initNavigation();
    initMiniPickerMap();
    initHazardMap();
    initHotspotsAndSearch();
    initUploadAndScanner();
    initReportForm();
    initReportsFeed();
    initCivicEscalation();

    // Check HTTPS security context
    checkSecurityContext();

    // Load initial Bengaluru data
    loadReports();

    // Request GPS location on launch
    requestUserLocation(false);
});

