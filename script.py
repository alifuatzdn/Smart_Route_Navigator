import json
import math


def generate_id(point):
    """Generate ID from coordinate point"""
    return f"{point[1]},{point[0]}"


def haversine_distance(point1, point2):
    """Calculate distance between two points using Haversine formula (in meters)"""
    R = 6371000  # Earth radius in meters
    lon1, lat1 = point1[0], point1[1]
    lon2, lat2 = point2[0], point2[1]
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def save_json(filename, data):
    """Save data to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# Load GeoJSON data
data = json.load(open("export.geojson", encoding='utf-8'))
nodes = {}
edges = {}

for feature in data['features']:
    coords = feature['geometry']['coordinates']
    
    for i in range(len(coords) - 1):
        start_point = coords[i]
        end_point = coords[i+1]
        
        start_id = generate_id(start_point)
        end_id = generate_id(end_point)
        
        # Add nodes
        nodes[start_id] = {"lat": start_point[1], "lon": start_point[0]}
        nodes[end_id] = {"lat": end_point[1], "lon": end_point[0]}
        
        # Calculate distance
        distance = haversine_distance(start_point, end_point)
        
        # Initialize edges dictionary if needed
        if start_id not in edges:
            edges[start_id] = []
        if end_id not in edges:
            edges[end_id] = []
        
        # Add bidirectional edges
        edges[start_id].append({"node": end_id, "weight": distance})
        edges[end_id].append({"node": start_id, "weight": distance})

# Save results
save_json("graph-data.json", {"nodes": nodes, "edges": edges})

print(f"Graph data saved successfully!")
print(f"  - Total nodes: {len(nodes)}")
print(f"  - Total edges: {sum(len(v) for v in edges.values())}")