// Smart Route Navigator - Campus Navigation System

// Configuration constants
const CONFIG = {
    colors: ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'],
    walkingSpeed: 83.33, // meters/minute (5 km/h)
    stepLength: 0.75, // meters per step
    offsetFactor: 0.00003 // Line offset multiplier for overlapping routes
};

// Global state
let map, graphData = null;
let state = { markers: [], nodeIds: [], layers: [] };

// Initialize map (Mugla Sitki Kocman University)
map = L.map('map').setView([37.163, 28.372], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

// Load graph data
fetch('graph-data.json')
    .then(r => r.json())
    .then(d => { graphData = d; console.log("Graph loaded:", Object.keys(d.nodes).length, "nodes"); })
    .catch(e => console.error("Data loading error:", e));

// Create numbered marker icon
const createIcon = (num) => L.divIcon({
    className: 'numbered-marker',
    html: `<div style="background:#3498db;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
});

// Find nearest graph node to coordinates
const findNearestNode = (lat, lng) => {
    let min = Infinity, closest = null;
    for (const [id, node] of Object.entries(graphData.nodes)) {
        const dist = Math.hypot(node.lat - lat, node.lon - lng);
        if (dist < min) { min = dist; closest = id; }
    }
    return closest;
};

// Map click handler - add new point
map.on('click', e => {
    if (!graphData) return;
    const nodeId = findNearestNode(e.latlng.lat, e.latlng.lng);
    if (nodeId) addPoint(nodeId);
});

// Add new point to map
function addPoint(nodeId) {
    const node = graphData.nodes[nodeId];
    const num = state.nodeIds.length + 1;
    const marker = L.marker([node.lat, node.lon], { icon: createIcon(num) })
        .addTo(map)
        .on('click', e => { L.DomEvent.stopPropagation(e); removePoint(state.markers.indexOf(marker)); });

    marker.bindPopup(`<b>Point ${num}</b><br><small>Click to remove</small>`);
    state.markers.push(marker);
    state.nodeIds.push(nodeId);
    updateUI();
}

// Remove point by index
function removePoint(index) {
    if (index > -1 && index < state.markers.length) {
        map.removeLayer(state.markers[index]);
        state.markers.splice(index, 1);
        state.nodeIds.splice(index, 1);

        // Update marker numbers
        state.markers.forEach((m, i) => {
            m.setIcon(createIcon(i + 1));
            m.setPopupContent(`<b>Point ${i + 1}</b><br><small>Click to remove</small>`);
        });

        clearRoute();
        updateUI();
    }
}

// Clear all markers and routes
function clearMap() {
    state.markers.forEach(m => map.removeLayer(m));
    clearRoute();
    state = { markers: [], nodeIds: [], layers: [] };
    updateUI();
}

// Clear route layers only
function clearRoute() {
    state.layers.forEach(l => map.removeLayer(l));
    state.layers = [];
    document.getElementById('route-info').innerHTML = '';
}

// Update UI elements
function updateUI() {
    document.getElementById('status').innerText = `Selected Points: ${state.nodeIds.length}`;
    document.getElementById('points-list').innerHTML = state.markers.map((_, i) =>
        `<div class="point-item">Point ${i + 1} <button onclick="removePoint(${i})">×</button></div>`
    ).join('');
}

// Calculate and display route
function calculateRoute() {
    if (state.nodeIds.length < 2) return alert("Please select at least 2 points!");
    if (!graphData.edges) return alert("Graph data could not be loaded!");

    const optimizedOrder = optimizeRouteOrder(state.nodeIds, graphData);
    console.log("Optimized order:", optimizedOrder);

    let totalDist = 0, pathCoords = [];
    let edgeUsage = {}; // Track edge usage for offset

    clearRoute();

    // Build route segments
    for (let i = 0; i < optimizedOrder.length - 1; i++) {
        const result = dijkstra(graphData, optimizedOrder[i], optimizedOrder[i + 1]);
        if (!result.path.length) return alert(`No route found between points ${i + 1} and ${i + 2}!`);

        totalDist += result.distance;

        // Process segment coordinates with offset for overlapping routes
        let segmentPoints = result.path.map((nid, j) => {
            const node = graphData.nodes[nid];
            let { lat, lon } = node;

            // Track edge usage for offset calculation
            if (j < result.path.length - 1) {
                const nextId = result.path[j + 1];
                const edgeKey = [nid, nextId].sort().join('|');
                edgeUsage[edgeKey] = (edgeUsage[edgeKey] || 0) + 1;

                // Apply perpendicular offset for overlapping edges
                if (edgeUsage[edgeKey] > 1) {
                    const nextNode = graphData.nodes[nextId];
                    const dx = nextNode.lon - lon, dy = nextNode.lat - lat;
                    const len = Math.hypot(dx, dy);
                    if (len > 0) {
                        lat += (-dy / len) * (CONFIG.offsetFactor * i);
                        lon += (dx / len) * (CONFIG.offsetFactor * i);
                    }
                }
            }
            return [lat, lon];
        });

        // Draw route segment
        const poly = L.polyline(segmentPoints, {
            color: CONFIG.colors[i % CONFIG.colors.length],
            weight: 5,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(map);
        state.layers.push(poly);
        pathCoords.push(...segmentPoints);
    }

    // Display statistics
    showStats(totalDist, optimizedOrder);
    if (pathCoords.length) map.fitBounds(pathCoords);
}

// Display route statistics
function showStats(dist, order) {
    const distKm = (dist / 1000).toFixed(2);
    const mins = Math.round(dist / CONFIG.walkingSpeed);
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
    const steps = Math.round(dist / CONFIG.stepLength);
    const orderStr = order.map(id => state.nodeIds.indexOf(id) + 1).join(' → ');

    document.getElementById('status').innerHTML = `Selected Points: ${state.nodeIds.length}`;
    document.getElementById('route-info').innerHTML = `
        <div class="route-stat">
            <span class="stat-icon">📍</span>
            <span class="stat-value">${distKm} km</span>
            <span class="stat-label">Distance</span>
        </div>
        <div class="route-stat">
            <span class="stat-icon">⏱️</span>
            <span class="stat-value">${timeStr}</span>
            <span class="stat-label">Time</span>
        </div>
        <div class="route-stat">
            <span class="stat-icon">🚶</span>
            <span class="stat-value">${steps.toLocaleString()}</span>
            <span class="stat-label">Steps</span>
        </div>
        <div class="route-stat" style="grid-column: 1 / -1;">
            <span class="stat-icon">🗺️</span>
            <span class="stat-value" style="font-size: 16px;">${orderStr}</span>
            <span class="stat-label">Route Order</span>
        </div>
    `;
}