let stations = [];
let currentViewMode = 'cards';

// Lấy dữ liệu trạm xăng từ API
async function loadStations() {
    try {
        const response = await fetch("/api/stations");
        if (!response.ok) throw new Error("Lỗi kết nối");
        stations = await response.json();
    } catch (error) {
        console.warn("⚠️ Không kết nối được API server, dùng dữ liệu dự phòng:", error);
        stations = [
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

    updateTickers();
    filterPrice();
}

// Cập nhật giá niêm yết trên Ticker Cards
function updateTickers() {
    if (stations.length === 0) return;
    const s0 = stations[0];
    if (s0.prices?.ron95) document.getElementById("tickerRon95").textContent = s0.prices.ron95.toLocaleString("vi-VN") + " đ/L";
    if (s0.prices?.e5) document.getElementById("tickerE5").textContent = s0.prices.e5.toLocaleString("vi-VN") + " đ/L";
    if (s0.prices?.diesel) document.getElementById("tickerDiesel").textContent = s0.prices.diesel.toLocaleString("vi-VN") + " đ/L";
}

// Chuyển đổi giữa giao diện Thẻ & Bảng
function switchPriceView(mode) {
    currentViewMode = mode;
    const cardsElem = document.getElementById("priceCardsContainer");
    const tableElem = document.getElementById("priceTableWrapper");
    const btnCards = document.getElementById("btn-view-cards");
    const btnTable = document.getElementById("btn-view-table");

    if (mode === 'cards') {
        cardsElem.style.display = "grid";
        tableElem.classList.remove("active");
        btnCards.classList.add("active");
        btnTable.classList.remove("active");
    } else {
        cardsElem.style.display = "none";
        tableElem.classList.add("active");
        btnTable.classList.add("active");
        btnCards.classList.remove("active");
    }
}

// Lọc & Hiển thị dữ liệu giá
function filterPrice() {
    const fuelTypeSelect = document.getElementById("fuelType");
    const fuelType = fuelTypeSelect ? fuelTypeSelect.value : "all";

    let cheapestStationId = null;

    if (fuelType !== "all" && stations.length > 0) {
        findPriceResult(fuelType);
        const prices = stations.map(s => s.prices[fuelType]);
        const minVal = Math.min(...prices);
        const cheapest = stations.find(s => s.prices[fuelType] === minVal);
        if (cheapest) cheapestStationId = cheapest.id;
    } else {
        document.getElementById("minPrice").textContent = "Chọn loại nhiên liệu";
        document.getElementById("maxPrice").textContent = "Chọn loại nhiên liệu";
        document.getElementById("difference").textContent = "Chọn loại nhiên liệu";
        document.getElementById("cheapestStation").innerHTML = "<p style='color:#64748b; margin-top:8px;'>Vui lòng chọn loại nhiên liệu (RON95, E5, Diesel) để tìm trạm rẻ nhất</p>";
    }

    renderPriceCards(fuelType, cheapestStationId);
    renderPriceTable(fuelType, cheapestStationId);
}

// Tính toán kết quả so sánh (Thấp nhất, Cao nhất, Chênh lệch)
function findPriceResult(fuelType) {
    const prices = stations.map(station => station.prices[fuelType] || 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const difference = max - min;
    const cheapestStation = stations.find(station => station.prices[fuelType] === min);

    document.getElementById("minPrice").textContent = min.toLocaleString("vi-VN") + " đ/L";
    document.getElementById("maxPrice").textContent = max.toLocaleString("vi-VN") + " đ/L";
    document.getElementById("difference").textContent = difference.toLocaleString("vi-VN") + " đ/L";

    if (cheapestStation) {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cheapestStation.name + " " + cheapestStation.location)}`;
        document.getElementById("cheapestStation").innerHTML = `
            <div style="font-weight: 800; color: #059669; font-size: 15px; margin-bottom: 2px;">${cheapestStation.name}</div>
            <div style="color: #475569; font-size: 12px; margin-bottom: 6px;">📍 ${cheapestStation.location}</div>
            <a href="${mapUrl}" target="_blank" class="btn-direction-pill">
                🧭 Dẫn đường tới trạm rẻ nhất
            </a>
        `;
    }
}

// Render Giao diện Thẻ (Cards)
function renderPriceCards(fuelType, cheapestStationId) {
    const container = document.getElementById("priceCardsContainer");
    if (!container) return;

    container.innerHTML = "";

    stations.forEach(station => {
        const isCheapest = station.id === cheapestStationId;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.name + " " + station.location)}`;

        const card = document.createElement("div");
        card.className = `price-station-card ${isCheapest ? 'is-cheapest' : ''}`;

        card.innerHTML = `
            ${isCheapest ? '<div class="card-cheapest-badge">👑 RẺ NHẤT</div>' : ''}
            <div class="station-card-title">⛽ ${station.name}</div>
            <div class="station-card-location">📍 ${station.location}</div>

            <div class="price-list-rows">
                <div class="price-row-item" style="${fuelType === 'ron95' ? 'background:#ecfdf5; padding:6px; border-radius:6px;' : ''}">
                    <label>RON 95-III:</label>
                    <val style="${fuelType === 'ron95' ? 'font-size:15px;' : ''}">${station.prices?.ron95?.toLocaleString("vi-VN") || 0} đ/L</val>
                </div>
                <div class="price-row-item" style="${fuelType === 'e5' ? 'background:#ecfdf5; padding:6px; border-radius:6px;' : ''}">
                    <label>E5 RON 92-II:</label>
                    <val style="${fuelType === 'e5' ? 'font-size:15px;' : ''}">${station.prices?.e5?.toLocaleString("vi-VN") || 0} đ/L</val>
                </div>
                <div class="price-row-item" style="${fuelType === 'diesel' ? 'background:#ecfdf5; padding:6px; border-radius:6px;' : ''}">
                    <label>DIESEL 0.05S-II:</label>
                    <val style="${fuelType === 'diesel' ? 'font-size:15px;' : ''}">${station.prices?.diesel?.toLocaleString("vi-VN") || 0} đ/L</val>
                </div>
            </div>

            <a href="${mapUrl}" target="_blank" class="card-action-btn">
                🧭 Dẫn đường Google Maps
            </a>
        `;

        container.appendChild(card);
    });
}

// Render Giao diện Bảng (Table)
function renderPriceTable(fuelType, cheapestStationId) {
    const tableBody = document.getElementById("priceTable");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    stations.forEach(station => {
        const isCheapest = station.id === cheapestStationId;
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.name + " " + station.location)}`;

        const row = document.createElement("tr");
        if (isCheapest) row.className = "cheapest-row";

        row.innerHTML = `
            <td><b>${isCheapest ? '👑 ' : ''}${station.name}</b></td>
            <td>📍 ${station.location}</td>
            <td class="price-tag-highlight">${station.prices?.ron95?.toLocaleString("vi-VN") || 0} đ/L</td>
            <td class="price-tag-highlight">${station.prices?.e5?.toLocaleString("vi-VN") || 0} đ/L</td>
            <td class="price-tag-highlight">${station.prices?.diesel?.toLocaleString("vi-VN") || 0} đ/L</td>
            <td>
                <a href="${mapUrl}" target="_blank" style="color:#0f766e; font-weight:bold; text-decoration:none;">
                    🧭 Chỉ đường
                </a>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

window.filterPrice = filterPrice;
window.switchPriceView = switchPriceView;

document.addEventListener("DOMContentLoaded", () => {
    loadStations();
});