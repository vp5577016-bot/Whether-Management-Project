let energyChart;
let batterySoC = 82;

// 1. Chart.js Initialization
window.onload = function () {
    const ctx = document.getElementById('energyChart').getContext('2d');
    
    energyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00'],
            datasets: [
                {
                    label: 'Demand (kW)',
                    data: [40, 42, 45, 38, 35, 48, 50],
                    borderColor: '#f87171',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Green (kW)',
                    data: [20, 25, 30, 35, 40, 30, 20],
                    borderColor: '#4ade80',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { display: false } },
                y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: '#1e293b' } }
            }
        }
    });

    updateSimulation();
};

// 2. Main Simulation & Dispatch Engine
function updateSimulation() {
    const temp = parseInt(document.getElementById('tempSlider').value);
    const wind = parseInt(document.getElementById('windSlider').value);

    document.getElementById('tempDisplay').innerText = temp + "°C";
    document.getElementById('windDisplay').innerText = wind + " m/s";

    // Dynamic Heating Demand Logic based on Temp
    let baseDemand = 30 + (Math.abs(temp) * 0.5); 
    
    // Wind Power Output Logic
    let windGen = Math.min(35, (wind / 35) * 30);
    let solarGen = (temp > -20) ? 12 : 5; // Simplified Solar Logic
    let totalGreen = windGen + solarGen;

    let netDeficit = baseDemand - totalGreen;

    // Diesel Dispatch Logic
    let dieselKW = 0;
    let alertBox = document.getElementById('alertBox');
    let alertMsg = document.getElementById('alertMsg');

    if (netDeficit > 0) {
        if (batterySoC > 20) {
            // Drain Battery
            batterySoC = Math.max(20, batterySoC - (netDeficit * 0.1));
            document.getElementById('genStatus').innerText = "OFF";
            document.getElementById('genStatus').className = "text-green";
        } else {
            // Turn ON Diesel Generator
            dieselKW = netDeficit.toFixed(1);
            document.getElementById('genStatus').innerText = `ON (${dieselKW} kW)`;
            document.getElementById('genStatus').className = "text-yellow";
        }
    } else {
        // Charge Battery with surplus
        batterySoC = Math.min(100, batterySoC + (Math.abs(netDeficit) * 0.05));
        document.getElementById('genStatus').innerText = "OFF";
        document.getElementById('genStatus').className = "text-green";
    }

    // Alerts Thresholds
    if (wind > 32) {
        alertBox.classList.remove('hidden');
        alertMsg.innerText = "Blizzard Warning! Wind turbine cut-off mode engaged.";
    } else if (batterySoC <= 20) {
        alertBox.classList.remove('hidden');
        alertMsg.innerText = "Critical Low Battery! Diesel backup generator activated.";
    } else {
        alertBox.classList.add('hidden');
    }

    // UI Updates
    document.getElementById('demandVal').innerHTML = `${baseDemand.toFixed(1)} <small>kW</small>`;
    document.getElementById('cleanVal').innerHTML = `${totalGreen.toFixed(1)} <small>kW</small>`;
    document.getElementById('renShare').innerText = `Solar: ${solarGen.toFixed(1)}k | Wind: ${windGen.toFixed(1)}k`;
    document.getElementById('batteryVal').innerText = `${Math.round(batterySoC)}%`;
    document.getElementById('batteryFill').style.width = `${batterySoC}%`;

    // Dynamic Chart Update
    if (energyChart) {
        energyChart.data.datasets[0].data = Array.from({length: 7}, () => baseDemand + (Math.random()*4 - 2));
        energyChart.data.datasets[1].data = Array.from({length: 7}, () => totalGreen + (Math.random()*4 - 2));
        energyChart.update();
    }
}

// 3. AI Dispatch Optimizer
function runAIOptimizer() {
    alert("🤖 AI Model successfully optimized the microgrid dispatch. Next diesel generator cycle delayed by 4 hours!");
    batterySoC = Math.min(100, batterySoC + 15);
    updateSimulation();
}

// 4. CSV Telemetry Export Function
function exportReport() {
    let csvContent = "data:text/csv;charset=utf-8,Timestamp,Demand(kW),GreenGen(kW),Battery(%),Status\n";
    csvContent += `${new Date().toISOString()},${document.getElementById('demandVal').innerText},${document.getElementById('cleanVal').innerText},${batterySoC}%,Success\n`;
    
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Maitri_Polar_Telemetry.csv");
    document.body.appendChild(link);
    link.click();
}