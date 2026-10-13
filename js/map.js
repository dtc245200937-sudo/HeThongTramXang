let map = null;
let markers = [];
let stationsData = [];
let filteredStations = [];
let userLocation = null;
let userMarker = null;
let currentRoutePolyline = null;
let currentRouteGlowPolyline = null;
let currentLayerName = 'satellite';
let activeTileLayer = null;

// Khởi tạo các lớp bản đồ (Tile Layers)
const baseLayers = {
    satellite: L.layerGroup([
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
            maxZoom: 19
        })
    ]),
    street: L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    topo: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), swisstopo, MapmyIndia, &copy; OpenStreetMap contributors'
    })
};

// Phân loại thương hiệu trạm xăng
function getStationBrand(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("petrolimex")) return "petrolimex";
    if (nameLower.includes("pvoil") || nameLower.includes("pv oil")) return "pvoil";
    return "other";
}

// Tạo icon custom cho trạm xăng
function createGasStationIcon(station, isSelected = false) {
    const brand = getStationBrand(station.name);
    let brandClass = "";
    if (brand === "petrolimex") brandClass = "petrolimex";
    else if (brand === "pvoil") brandClass = "pvoil";

    const selectedStyle = isSelected ? 'transform: scale(1.15); z-index: 999;' : '';

    return L.divIcon({
        className: 'custom-gas-pin',
        html: `
            <div class="pin-wrapper ${brandClass}" style="${selectedStyle}">
                <span style="font-size: 14px;">⛽</span>
                <span>${station.name}</span>
                <div class="pin-pulse"></div>
            </div>
        `,
        iconSize: [140, 36],
        iconAnchor: [70, 18]
    });
}

// Tạo icon vị trí người dùng (Radar GPS)
function createUserIcon() {
    return L.divIcon({
        className: 'user-gps-container',
        html: `
            <div class="user-gps-pin">
                <div class="user-gps-pulse"></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

// Công thức Haversine tính khoảng cách (km)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Khởi tạo bản đồ
function initMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    // Tọa độ trung tâm Thái Nguyên [21.5928, 105.8442]
    map = L.map("map", {
        zoomControl: false
    }).setView([21.5928, 105.8442], 13);

    // Zoom control ở góc trên bên phải
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Mặc định dùng lớp bản đồ Vệ tinh
    activeTileLayer = baseLayers.satellite;
    activeTileLayer.addTo(map);

    loadStations();
}

// Chuyển đổi giao diện bản đồ (Satellite, Street, Dark, Topo)
function switchMapLayer(layerName) {
    if (!map || !baseLayers[layerName]) return;

    if (activeTileLayer) {
        map.removeLayer(activeTileLayer);
    }

    activeTileLayer = baseLayers[layerName];
    activeTileLayer.addTo(map);
    currentLayerName = layerName;

    // Update UI buttons state
    document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-layer-${layerName}`);
    if (targetBtn) targetBtn.classList.add('active');
}

// Lấy dữ liệu trạm xăng từ Server
async function loadStations() {
    try {
        const res = await fetch("/api/stations");
        if (!res.ok) throw new Error("Lỗi tải dữ liệu trạm xăng");
        stationsData = await res.json();
    } catch (err) {
        console.warn("⚠️ Không kết nối được API server, sử dụng dữ liệu trạm mặc định:", err);
        stationsData = [
            {
                id: 1,
                name: "Petrolimex Số 10",
                location: "Phan Đình Phùng, TP. Thái Nguyên",
                lat: 21.5937,
                lng: 105.8442,
                prices: { ron95: 24500, e5: 22500, diesel: 20500 }
            },
            {
                id: 2,
                name: "Petrolimex Số 05",
                location: "Đường Hoàng Văn Thụ, TP. Thái Nguyên",
                lat: 21.5985,
                lng: 105.8360,
                prices: { ron95: 24300, e5: 22400, diesel: 20400 }
            },
            {
                id: 3,
                name: "Cửa hàng số 1",
                location: "Đường Lương Ngọc Quyến, TP. Thái Nguyên",
                lat: 21.5850,
                lng: 105.8280,
                prices: { ron95: 24600, e5: 22600, diesel: 20600 }
            },
            {
                id: 4,
                name: "PVOIL Tân Thịnh",
                location: "Tân Thịnh, TP. Thái Nguyên",
                lat: 21.5720,
                lng: 105.8150,
                prices: { ron95: 24400, e5: 22300, diesel: 20300 }
            }
        ];
    }

    filteredStations = [...stationsData];
    renderMapMarkers(filteredStations);
    renderStationList(filteredStations);
}

// Hiển thị Marker trên bản đồ
function renderMapMarkers(list) {
    if (!map) return;

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (list.length === 0) return;

    const bounds = L.latLngBounds();

    list.forEach(station => {
        const lat = station.lat || 21.5928;
        const lng = station.lng || 105.8442;
        bounds.extend([lat, lng]);

        const brand = getStationBrand(station.name);
        let brandBadgeHtml = '<span class="brand-badge brand-other">TRẠM XĂNG</span>';
        if (brand === 'petrolimex') brandBadgeHtml = '<span class="brand-badge brand-petrolimex">PETROLIMEX</span>';
        else if (brand === 'pvoil') brandBadgeHtml = '<span class="brand-badge brand-pvoil">PVOIL</span>';

        const popupContent = `
            <div style="font-family: Arial, sans-serif; min-width: 250px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    ${brandBadgeHtml}
                    <span style="font-size: 11px; color: #16a34a; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">🟢 Mở cửa 24/7</span>
                </div>

                <h3 style="color: #0f766e; font-size: 16px; font-weight: bold; margin-bottom: 6px;">⛽ ${station.name}</h3>
                <p style="color: #64748b; font-size: 13px; line-height: 1.4; margin-bottom: 10px;">📍 ${station.location}</p>

                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e2e8f0; font-size: 13px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                        <span>RON95:</span> <b style="color: #0f766e;">${station.prices?.ron95?.toLocaleString("vi-VN") || 0} đ/L</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                        <span>E5 RON92:</span> <b style="color: #0f766e;">${station.prices?.e5?.toLocaleString("vi-VN") || 0} đ/L</b>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Diesel:</span> <b style="color: #0f766e;">${station.prices?.diesel?.toLocaleString("vi-VN") || 0} đ/L</b>
                    </div>
                </div>

                <div style="display: flex; gap: 6px;">
                    <button onclick="drawRouteToStation(${station.id})" style="flex: 1; background: #2563eb; color: white; border: none; padding: 8px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer;">
                        📍 Vẽ đường đi
                    </button>
                    <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" 
                       style="display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #334155; padding: 8px 10px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: bold; border: 1px solid #cbd5e1;">
                        🧭 Google Maps
                    </a>
                </div>
            </div>
        `;

        const marker = L.marker([lat, lng], {
            icon: createGasStationIcon(station)
        }).addTo(map).bindPopup(popupContent);

        marker.stationId = station.id;
        markers.push(marker);
    });

    if (list.length > 0 && !userLocation) {
        map.fitBounds(bounds.pad(0.15));
    }
}

// Hiển thị danh sách Sidebar
function renderStationList(list) {
    const container = document.getElementById("stationList");
    const countBadge = document.getElementById("stationCount");
    if (!container) return;

    if (countBadge) countBadge.textContent = `${list.length} trạm`;

    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; color: #94a3b8;">
                <p style="font-size: 32px; margin-bottom: 8px;">🔍</p>
                <p style="font-weight: 600;">Không tìm thấy trạm xăng phù hợp</p>
            </div>
        `;
        return;
    }

    list.forEach(station => {
        const brand = getStationBrand(station.name);
        let brandBadgeHtml = '<span class="brand-badge brand-other">TRẠM XĂNG</span>';
        if (brand === 'petrolimex') brandBadgeHtml = '<span class="brand-badge brand-petrolimex">PETROLIMEX</span>';
        else if (brand === 'pvoil') brandBadgeHtml = '<span class="brand-badge brand-pvoil">PVOIL</span>';

        let distHtml = "";
        if (station.distance !== undefined) {
            distHtml = `<span class="distance-tag">📏 ${station.distance.toFixed(2)} km</span>`;
        }

        const card = document.createElement("div");
        card.className = "station-card";
        card.id = `station-card-${station.id}`;

        card.innerHTML = `
            <div class="station-card-head">
                <div class="station-name">⛽ ${station.name}</div>
                ${brandBadgeHtml}
            </div>
            <div class="station-address">📍 ${station.location} ${distHtml}</div>

            <div class="price-badge-group">
                <div class="price-pill">
                    <label>RON95</label>
                    <val>${station.prices?.ron95?.toLocaleString("vi-VN") || 0} đ</val>
                </div>
                <div class="price-pill">
                    <label>E5 RON92</label>
                    <val>${station.prices?.e5?.toLocaleString("vi-VN") || 0} đ</val>
                </div>
                <div class="price-pill">
                    <label>DIESEL</label>
                    <val>${station.prices?.diesel?.toLocaleString("vi-VN") || 0} đ</val>
                </div>
            </div>

            <div class="station-actions">
                <button onclick="focusStation(${station.id})" class="btn-action-sm btn-focus">
                    📍 Zoom trạm
                </button>
                <button onclick="drawRouteToStation(${station.id})" class="btn-action-sm btn-route">
                    🛣️ Đường đi
                </button>
                <a href="https://www.google.com/maps/search/?api=1&query=${station.lat || 21.5928},${station.lng || 105.8442}" target="_blank" class="btn-action-sm btn-gmaps">
                    🧭 Maps
                </a>
            </div>
        `;

        // Highlight marker khi di chuột vào card
        card.addEventListener('mouseenter', () => {
            const marker = markers.find(m => m.stationId === station.id);
            if (marker) {
                marker.setIcon(createGasStationIcon(station, true));
            }
        });

        card.addEventListener('mouseleave', () => {
            const marker = markers.find(m => m.stationId === station.id);
            if (marker) {
                marker.setIcon(createGasStationIcon(station, false));
            }
        });

        container.appendChild(card);
    });
}

// Di chuyển góc nhìn tới trạm
function focusStation(id) {
    const station = stationsData.find(s => s.id === id);
    if (!station || !map) return;

    const lat = station.lat || 21.5928;
    const lng = station.lng || 105.8442;

    map.setView([lat, lng], 16, { animate: true, duration: 1 });

    const marker = markers.find(m => m.stationId === id);
    if (marker) {
        marker.openPopup();
    }

    // Active CSS card trong sidebar
    document.querySelectorAll('.station-card').forEach(c => c.classList.remove('active-selected'));
    const card = document.getElementById(`station-card-${id}`);
    if (card) {
        card.classList.add('active-selected');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Vẽ tuyến đường thực tế (OSRM Route API)
async function drawRouteToStation(stationId) {
    const station = stationsData.find(s => s.id === stationId);
    if (!station || !map) return;

    // Nếu chưa có vị trí người dùng, tự lấy vị trí mặc định/GPS
    if (!userLocation) {
        userLocation = { lat: 21.5928, lng: 105.8442 };
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: createUserIcon()
        }).addTo(map).bindPopup("<b>📍 Vị trí trung tâm (Ước tính)</b>");
    }

    const startLat = userLocation.lat;
    const startLng = userLocation.lng;
    const endLat = station.lat || 21.5928;
    const endLng = station.lng || 105.8442;

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            const distanceKm = (route.distance / 1000).toFixed(2);
            const durationMin = Math.round(route.duration / 60);

            // Xóa đường cũ
            clearRoute();

            // Glow đường
            currentRouteGlowPolyline = L.polyline(coordinates, {
                color: '#60a5fa',
                weight: 10,
                opacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);

            // Đường chính
            currentRoutePolyline = L.polyline(coordinates, {
                color: '#2563eb',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);

            // Hiển thị khung HUD
            showRouteHud(station.name, distanceKm, durationMin);

            // Fit map
            const bounds = L.latLngBounds(coordinates);
            map.fitBounds(bounds.pad(0.2));
            focusStation(station.id);
            return;
        }
    } catch (err) {
        console.warn("⚠️ OSRM API đường đi không phản hồi, dùng đường nối trực tiếp:", err);
    }

    // Direct line fallback
    const directDist = getDistance(startLat, startLng, endLat, endLng).toFixed(2);
    const estimatedMin = Math.round(directDist / 25 * 60);

    clearRoute();
    currentRoutePolyline = L.polyline([
        [startLat, startLng],
        [endLat, endLng]
    ], {
        color: '#2563eb',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.8
    }).addTo(map);

    showRouteHud(station.name, directDist, estimatedMin);
    map.fitBounds(currentRoutePolyline.getBounds().pad(0.2));
    focusStation(station.id);
}

// Hiển thị khung thông tin dẫn đường HUD
function showRouteHud(stationName, distanceKm, durationMin) {
    const hud = document.getElementById("routeHud");
    const content = document.getElementById("routeHudContent");
    if (!hud || !content) return;

    content.innerHTML = `
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">Đến trạm: <b style="color:#0f766e;">${stationName}</b></p>
        <div class="route-hud-stats">
            <div class="route-stat-item">
                <span>Khoảng cách</span>
                <b>${distanceKm} km</b>
            </div>
            <div class="route-stat-item">
                <span>Ước tính di chuyển</span>
                <b>~${durationMin} phút</b>
            </div>
        </div>
    `;

    hud.classList.add("active");
}

// Xóa tuyến đường khỏi bản đồ
function clearRoute() {
    if (currentRoutePolyline) {
        map.removeLayer(currentRoutePolyline);
        currentRoutePolyline = null;
    }
    if (currentRouteGlowPolyline) {
        map.removeLayer(currentRouteGlowPolyline);
        currentRouteGlowPolyline = null;
    }
    const hud = document.getElementById("routeHud");
    if (hud) hud.classList.remove("active");
}

// Tìm cây xăng gần nhất
function findNearest() {
    locateUserGPS(true);
}

// Xác định vị trí GPS người dùng
function locateUserGPS(autoSelectNearest = false) {
    const nearestContainer = document.getElementById("nearestStation");
    if (nearestContainer) {
        nearestContainer.innerHTML = `
            <div style="background: #eff6ff; border: 1px solid #93c5fd; color: #1e40af; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-weight: 600; font-size: 14px; display:flex; align-items:center; gap:8px;">
                <span style="display:inline-block; animation: spin 1s linear infinite;">🔄</span> Đang tìm kiếm tọa độ vị trí thực tế của bạn...
            </div>
        `;
    }

    if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ Geolocation!");
        processNearestStation(21.5928, 105.8442, true, autoSelectNearest);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const uLat = pos.coords.latitude;
            const uLng = pos.coords.longitude;
            userLocation = { lat: uLat, lng: uLng };

            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([uLat, uLng], {
                icon: createUserIcon()
            }).addTo(map).bindPopup("<b>📍 Vị trí chính xác của bạn</b>").openPopup();

            processNearestStation(uLat, uLng, false, autoSelectNearest);
        },
        err => {
            console.warn("⚠️ GPS Error, dùng vị trí trung tâm Thái Nguyên:", err.message);
            const fallbackLat = 21.5928;
            const fallbackLng = 105.8442;
            userLocation = { lat: fallbackLat, lng: fallbackLng };

            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([fallbackLat, fallbackLng], {
                icon: createUserIcon()
            }).addTo(map).bindPopup("<b>📍 Vị trí ước tính (Trung tâm Thái Nguyên)</b>");

            processNearestStation(fallbackLat, fallbackLng, true, autoSelectNearest);
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// Xử lý và tính khoảng cách tới các trạm
function processNearestStation(uLat, uLng, isFallback = false, autoSelectNearest = false) {
    if (stationsData.length === 0) return;

    let nearest = null;
    let minDistance = Infinity;

    stationsData.forEach(station => {
        const lat = station.lat || 21.5928;
        const lng = station.lng || 105.8442;
        const dist = getDistance(uLat, uLng, lat, lng);
        station.distance = dist;

        if (dist < minDistance) {
            minDistance = dist;
            nearest = station;
        }
    });

    // Sắp xếp danh sách theo khoảng cách
    filteredStations = [...stationsData].sort((a, b) => a.distance - b.distance);
    renderStationList(filteredStations);

    const nearestContainer = document.getElementById("nearestStation");
    if (nearestContainer && nearest) {
        nearestContainer.innerHTML = `
            <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="color: #059669; font-size: 16px; margin-bottom: 4px; font-weight: bold;">
                            📍 Trạm xăng gần bạn nhất: ${nearest.name}
                        </h3>
                        <p style="margin: 0; color: #4b5563; font-size: 14px;">
                            Địa chỉ: <b>${nearest.location}</b> — Khoảng cách: <b style="color: #059669; font-size: 15px;">${minDistance.toFixed(2)} km</b>
                            ${isFallback ? ' <span style="color:#94a3b8; font-size:12px;">(Tính từ trung tâm TP. Thái Nguyên)</span>' : ''}
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="drawRouteToStation(${nearest.id})" style="background: #059669; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; display:flex; align-items:center; gap:4px;">
                            🛣️ Dẫn đường ngay
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    if (autoSelectNearest && nearest) {
        drawRouteToStation(nearest.id);
    }
}

// Hiện lại tất cả trạm
function showAllStations() {
    clearRoute();
    const nearestContainer = document.getElementById("nearestStation");
    if (nearestContainer) nearestContainer.innerHTML = "";

    stationsData.forEach(s => delete s.distance);
    filteredStations = [...stationsData];
    renderStationList(filteredStations);
    renderMapMarkers(filteredStations);
    resetMapBounds();
}

// Đặt lại góc nhìn bản đồ (Reset Bounds)
function resetMapBounds() {
    if (!map || stationsData.length === 0) return;
    const bounds = L.latLngBounds();
    stationsData.forEach(s => bounds.extend([s.lat || 21.5928, s.lng || 105.8442]));
    map.fitBounds(bounds.pad(0.15));
}

// Chế độ xem toàn màn hình (Fullscreen toggle)
function toggleFullScreen() {
    const mapElem = document.querySelector('.map-wrapper');
    if (!document.fullscreenElement) {
        mapElem.requestFullscreen().catch(err => {
            alert(`Lỗi khi bật toàn màn hình: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Lọc & Tìm kiếm
function handleSearch() {
    applyFiltersAndSort();
}

function handleFilter() {
    applyFiltersAndSort();
}

function handleSort() {
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    const query = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
    const brand = document.getElementById("brandFilter")?.value || "all";
    const sort = document.getElementById("sortFilter")?.value || "default";

    filteredStations = stationsData.filter(station => {
        const matchesQuery = station.name.toLowerCase().includes(query) || station.location.toLowerCase().includes(query);
        const stationBrand = getStationBrand(station.name);
        const matchesBrand = (brand === "all") || (brand === stationBrand);
        return matchesQuery && matchesBrand;
    });

    if (sort === "distance" && userLocation) {
        filteredStations.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    } else if (sort === "ron95") {
        filteredStations.sort((a, b) => (a.prices?.ron95 || 0) - (b.prices?.ron95 || 0));
    } else if (sort === "name") {
        filteredStations.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderMapMarkers(filteredStations);
    renderStationList(filteredStations);
}

// Window exports
window.switchMapLayer = switchMapLayer;
window.findNearest = findNearest;
window.locateUserGPS = locateUserGPS;
window.showAllStations = showAllStations;
window.resetMapBounds = resetMapBounds;
window.toggleFullScreen = toggleFullScreen;
window.focusStation = focusStation;
window.drawRouteToStation = drawRouteToStation;
window.clearRoute = clearRoute;
window.handleSearch = handleSearch;
window.handleFilter = handleFilter;
window.handleSort = handleSort;

document.addEventListener("DOMContentLoaded", () => {
    initMap();
});
