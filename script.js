/**
 * Smart Route Navigator - Campus Navigation System
 * Interactive map application for finding optimal routes between multiple points
 * using Dijkstra's algorithm and TSP optimization
 */

let map;
let graphData = null;
let selectedMarkers = [];
let selectedNodeIds = [];
let routeLayers = [];

/**
 * Creates a numbered marker icon for map points
 * @param {number} num - Point number to display
 * @returns {L.DivIcon} Leaflet div icon with number
 */
function createNumberedIcon(num) {
    return L.divIcon({
        className: 'numbered-marker',
        html: `<div style="background:#3498db;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);">${num}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

// Initialize Map (Mugla Sitki Kocman University)
map = L.map('map').setView([37.163, 28.372], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load graph data from preprocessed GeoJSON
fetch('graph-data.json')
    .then(response => response.json())
    .then(data => {
        graphData = data;
        console.log("Map data loaded. Node count:", Object.keys(graphData.nodes).length);
    })
    .catch(err => console.error("Data loading error:", err));

/**
 * Handle map click events - add new point at nearest road node
 * Implements snap-to-road functionality
 */
map.on('click', function (e) {
    if (!graphData) return;

    const nearestNodeId = findNearestGraphNode(e.latlng.lat, e.latlng.lng);
    if (nearestNodeId) {
        const node = graphData.nodes[nearestNodeId];
        const pointNumber = selectedNodeIds.length + 1;
        const marker = L.marker([node.lat, node.lon], { icon: createNumberedIcon(pointNumber) }).addTo(map);

        marker.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            removePoint(marker, nearestNodeId);
        });
        marker.bindPopup(`<b>Point ${pointNumber}</b><br><small>Click to remove</small>`);
        selectedMarkers.push(marker);
        selectedNodeIds.push(nearestNodeId);

        updatePointsList();
    }
});

/**
 * Remove a selected point from the map and recalculate route
 * @param {L.Marker} marker - Leaflet marker to remove
 * @param {string} nodeId - Graph node ID
 */
function removePoint(marker, nodeId) {
    const index = selectedNodeIds.indexOf(nodeId);
    if (index > -1) {
        map.removeLayer(marker);
        selectedMarkers.splice(index, 1);
        selectedNodeIds.splice(index, 1);
        updateMarkerNumbers();
        updatePointsList();
        clearRoute();
    }
}

/**
 * Update numbering on all markers after point removal
 * Ensures consecutive numbering (1, 2, 3...)
 */
function updateMarkerNumbers() {
    selectedMarkers.forEach((marker, idx) => {
        const num = idx + 1;
        marker.setIcon(createNumberedIcon(num));
        marker.setPopupContent(`<b>Point ${num}</b><br><small>Click to remove</small>`);
    });
}

/**
 * Update the UI points list in the control panel
 * Shows all selected points with remove buttons
 */
function updatePointsList() {
    document.getElementById('status').innerText = `Selected Points: ${selectedNodeIds.length}`;
    const listHtml = selectedMarkers.map((_, idx) =>
        `<div class="point-item">Point ${idx + 1} <button onclick="removePointByIndex(${idx})">×</button></div>`
    ).join('');
    document.getElementById('points-list').innerHTML = listHtml;
}

/**
 * Remove point by index from the UI list
 * @param {number} index - Index in selectedMarkers array
 */
function removePointByIndex(index) {
    if (index >= 0 && index < selectedMarkers.length) {
        map.removeLayer(selectedMarkers[index]);
        selectedMarkers.splice(index, 1);
        selectedNodeIds.splice(index, 1);
        updateMarkerNumbers();
        updatePointsList();
        clearRoute();
    }
}

/**
 * Clear route layers from map without removing point markers
 * Preserves selected points for recalculation
 */
function clearRoute() {
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];
    document.getElementById('route-info').innerHTML = '';
}

/**
 * Find nearest graph node to clicked coordinates
 * Implements snap-to-road by finding closest node in graph
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string|null} Node ID of nearest graph node
 */
function findNearestGraphNode(lat, lng) {
    let minDist = Infinity;
    let closestId = null;
    for (const [id, node] of Object.entries(graphData.nodes)) {
        const dist = Math.hypot(node.lat - lat, node.lon - lng);
        if (dist < minDist) {
            minDist = dist;
            closestId = id;
        }
    }
    return closestId;
}

/**
 * Calculate and display optimal route between selected points
 * Uses TSP optimization (brute force for ≤6 points) and Dijkstra for pathfinding
 * Implements visual offset for overlapping route segments
 */
function calculateRoute() {
    if (selectedNodeIds.length < 2) return alert("Please select at least 2 points!");
    if (!graphData.edges) return alert("Graph data could not be loaded!");

    const optimizedOrder = optimizeRouteOrder(selectedNodeIds, graphData);
    console.log("Optimized order:", optimizedOrder);

    // Build route segments using Dijkstra between consecutive points
    let allSegments = [];
    let totalDistance = 0;
    let edgeUsageCount = {}; // Track edge usage for visual offset
    let routeFound = true;

    for (let i = 0; i < optimizedOrder.length - 1; i++) {
        const result = dijkstra(graphData, optimizedOrder[i], optimizedOrder[i + 1]);
        const pathNodes = result.path;

        if (pathNodes.length === 0) {
            alert(`No route found between points ${i + 1} and ${i + 2}!`);
            routeFound = false;
            break;
        }

        totalDistance += result.distance;

        // Store segment coordinates with node information for offset calculation
        let segmentCoords = [];
        for (let j = 0; j < pathNodes.length; j++) {
            const nodeId = pathNodes[j];
            const node = graphData.nodes[nodeId];

            if (j < pathNodes.length - 1) {
                const edgeKey = [pathNodes[j], pathNodes[j + 1]].sort().join('|');
                edgeUsageCount[edgeKey] = (edgeUsageCount[edgeKey] || 0) + 1;
            }

            segmentCoords.push({
                lat: node.lat,
                lon: node.lon,
                nodeId: nodeId,
                nextNodeId: j < pathNodes.length - 1 ? pathNodes[j + 1] : null
            });
        }

        allSegments.push({ coords: segmentCoords, segmentIndex: i });
    }

    if (!routeFound) return;

    // Clear previous route layers
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];

    let fullPathForBounds = [];

    // Draw each segment with color coding and perpendicular offset for overlaps
    allSegments.forEach((segment, segIdx) => {
        let offsetCoords = [];

        for (let k = 0; k < segment.coords.length; k++) {
            const point = segment.coords[k];
            let offsetLat = point.lat;
            let offsetLon = point.lon;

            // Apply perpendicular offset to overlapping edges
            if (point.nextNodeId) {
                const edgeKey = [point.nodeId, point.nextNodeId].sort().join('|');
                if (edgeUsageCount[edgeKey] > 1) {
                    const nextPoint = segment.coords[k + 1];
                    if (nextPoint) {
                        const dx = nextPoint.lon - point.lon;
                        const dy = nextPoint.lat - point.lat;
                        const len = Math.sqrt(dx * dx + dy * dy);

                        if (len > 0) {
                            const perpX = -dy / len;
                            const perpY = dx / len;
                            const offsetAmount = 0.00003 * segIdx;

                            offsetLat += perpY * offsetAmount;
                            offsetLon += perpX * offsetAmount;
                        }
                    }
                }
            }

            offsetCoords.push([offsetLat, offsetLon]);
            fullPathForBounds.push([offsetLat, offsetLon]);
        }

        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
        const layer = L.polyline(offsetCoords, {
            color: colors[segIdx % colors.length],
            weight: 5,
            opacity: 0.8,
            smoothFactor: 1
        }).addTo(map);
        routeLayers.push(layer);
    });

    // Calculate and display route statistics
    const distanceKm = (totalDistance / 1000).toFixed(2);
    const totalMinutes = Math.round(totalDistance / 83.33); // Walking speed: 5 km/h
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
    const totalSteps = Math.round(totalDistance / 0.75); // Average step: 0.75m

    document.getElementById('status').innerHTML = `Selected Points: ${selectedNodeIds.length}`;

    const routeOrder = optimizedOrder.map(nodeId =>
        selectedNodeIds.indexOf(nodeId) + 1
    ).join(' → ');

    document.getElementById('route-info').innerHTML = `
        <div class="route-stat">
            <span class="stat-icon">📍</span>
            <span class="stat-value">${distanceKm} km</span>
            <span class="stat-label">Distance</span>
        </div>
        <div class="route-stat">
            <span class="stat-icon">⏱️</span>
            <span class="stat-value">${timeStr}</span>
            <span class="stat-label">Time</span>
        </div>
        <div class="route-stat">
            <span class="stat-icon">🚶</span>
            <span class="stat-value">${totalSteps.toLocaleString()}</span>
            <span class="stat-label">Steps</span>
        </div>
        <div class="route-stat" style="grid-column: 1 / -1;">
            <span class="stat-icon">🗺️</span>
            <span class="stat-value" style="font-size: 16px;">${routeOrder}</span>
            <span class="stat-label">Route Order</span>
        </div>
    `;

    if (fullPathForBounds.length > 0) map.fitBounds(L.latLngBounds(fullPathForBounds));
}

/**
 * Clear all markers and routes from the map
 * Resets the application to initial state
 */
function clearMap() {
    selectedMarkers.forEach(m => map.removeLayer(m));
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];
    selectedMarkers = [];
    selectedNodeIds = [];
    document.getElementById('status').innerText = "Selected Points: 0";
    document.getElementById('points-list').innerHTML = '';
    document.getElementById('route-info').innerHTML = '';
}