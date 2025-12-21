=== Smart Route Navigator ===

OVERVIEW
--------
A web-based campus navigation system for Muğla Sıtkı Koçman University that finds optimal routes 
between multiple points using Dijkstra's algorithm and TSP optimization.

FEATURES
--------
- Interactive map interface with click-to-select points
- Snap-to-road functionality for accurate routing
- Dijkstra's algorithm for shortest paths
- TSP optimization for multi-point route ordering (up to 6 points)
- Color-coded route segments with visual offset for overlaps
- Route statistics: distance, time, steps, and optimized order
- Numbered markers with click-to-remove functionality

REQUIREMENTS
------------
- Python 3.8 or higher (for graph generation)
- Modern web browser (Chrome, Firefox, Edge)
- Internet connection (for OpenStreetMap tiles)

INSTALLATION
------------
1. Generate graph data:
   - Run script.py and this converts export.geojson to graph-data.json

2. Run the application:
   - Open index.html directly in browser, or

HOW TO USE
----------
- Click on the map to add waypoints (up to 6 recommended for performance)
- Click "Calculate Route" to find optimal path
- View distance, time, and step count in the info panel
- Click markers or use × buttons to remove points
- Use "Clear Map" to start over

PROJECT STRUCTURE
-----------------
index.html      - Main UI and HTML structure
style.css       - Styling and layout
script.js       - Application logic and map interaction
dijkstra.js     - Pathfinding and TSP algorithms
script.py       - GeoJSON to graph converter
export.geojson  - Raw OpenStreetMap data
graph-data.json - Processed graph (16,480 nodes, 35,260 edges)

TECHNICAL DETAILS
-----------------
Technologies:
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Mapping: Leaflet.js 1.9.4
- Data Source: OpenStreetMap (GeoJSON)

Algorithms:
- Dijkstra's algorithm: O((V+E)logV) with priority queue
- Brute force TSP: O(n!) for route optimization

Graph Data:
- 16,480 nodes (road intersections)
- 35,260 bidirectional edges with distance weights

CUSTOMIZATION
-------------
Walking speed (script.js):
  const totalMinutes = Math.round(totalDistance / 83.33); // 5 km/h

Map center (script.js):
  map = L.map('map').setView([37.163, 28.372], 15);

Route colors (script.js):
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];

KNOWN LIMITATIONS
-----------------
- Maximum 10 or 11 points for TSP optimization (performance constraint)
- Fixed walking speed estimation (5 km/h)
- Requires internet for map tiles
- No route persistence across page refreshes