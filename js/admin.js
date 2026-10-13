async function loadStations() {

    try {

        const response =
            await fetch("/api/stations");

        const stations =
            await response.json();

        const stationGrid =
            document.getElementById("stationGrid");

        stationGrid.innerHTML = "";


        stations.forEach(station => {

            const card =
                document.createElement("div");

            card.className = "station-card";


            card.innerHTML = `

                <h2>
                    ${station.name}
                </h2>

                <div class="station-location">
                    📍 ${station.location}
                </div>

                <div class="inventory-title">
                    ⛽ Tồn kho nhiên liệu
                </div>


                <div class="fuel-row">

                    <span class="fuel-name">
                        RON95
                    </span>

                    <span class="fuel-amount">
                        ${station.inventory.ron95.toLocaleString("vi-VN")} L
                    </span>

                </div>


                <div class="fuel-row">

                    <span class="fuel-name">
                        E5 RON92
                    </span>

                    <span class="fuel-amount">
                        ${station.inventory.e5.toLocaleString("vi-VN")} L
                    </span>

                </div>


                <div class="fuel-row">

                    <span class="fuel-name">
                        Diesel
                    </span>

                    <span class="fuel-amount">
                        ${station.inventory.diesel.toLocaleString("vi-VN")} L
                    </span>

                </div>


                <div class="status">
                    ✓ Đang hoạt động
                </div>

            `;


            stationGrid.appendChild(card);

        });


    } catch (error) {

        console.error(
            "Lỗi tải dữ liệu trạm:",
            error
        );

    }

}


loadStations();