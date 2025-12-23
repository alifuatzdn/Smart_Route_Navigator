// Priority Queue for Dijkstra
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.values.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.values.shift();
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

// Dijkstra's Algorithm - find shortest path between two nodes
function dijkstra(graph, startNode, endNode) {
  const pq = new PriorityQueue();
  const distances = new Map();
  const previous = new Map();

  distances.set(startNode, 0);
  pq.enqueue(startNode, 0);

  while (!pq.isEmpty()) {
    const { val: currentNode, priority: currentDist } = pq.dequeue();

    if (currentNode === endNode) {
      return {
        path: reconstructPath(previous, startNode, endNode),
        distance: currentDist
      };
    }

    if (currentDist > (distances.get(currentNode) ?? Infinity)) {
      continue;
    }

    for (const { node: neighbor, weight } of graph.edges[currentNode]) {
      const newDist = currentDist + weight;
      const oldDist = distances.get(neighbor) ?? Infinity;

      if (newDist < oldDist) {
        distances.set(neighbor, newDist);
        previous.set(neighbor, currentNode);
        pq.enqueue(neighbor, newDist);
      }
    }
  }

  return { path: [], distance: Infinity };
}

// Reconstruct path from previous map
function reconstructPath(previous, startNode, endNode) {
  const path = [];
  let curr = endNode;

  while (curr !== null && curr !== undefined) {
    path.push(curr);
    if (curr === startNode) break;
    curr = previous.get(curr);
  }

  return path.reverse();
}

// Find shortest route visiting all points (Brute Force TSP)
function optimizeRouteOrder(selectedNodes, graph) {
  if (selectedNodes.length < 3) {
    return selectedNodes;
  }

  const start = selectedNodes[0];
  const others = selectedNodes.slice(1);

  // Cache all pairwise distances
  const cache = new Map();
  for (const from of selectedNodes) {
    for (const to of selectedNodes) {
      if (from !== to && !cache.has(`${from}-${to}`)) {
        cache.set(`${from}-${to}`, dijkstra(graph, from, to).distance);
      }
    }
  }

  // Try all permutations and find shortest
  let bestRoute = [];
  let minDist = Infinity;

  for (const perm of getPermutations(others)) {
    const route = [start, ...perm];
    let totalDist = 0;
    let valid = true;

    for (let i = 0; i < route.length - 1; i++) {
      const dist = cache.get(`${route[i]}-${route[i + 1]}`);
      if (!dist || dist === Infinity) {
        valid = false;
        break;
      }
      totalDist += dist;
    }

    if (valid && totalDist < minDist) {
      minDist = totalDist;
      bestRoute = route;
    }
  }

  return bestRoute.length > 0 ? bestRoute : selectedNodes;
}

// Generate all permutations
function getPermutations(arr) {
  if (arr.length <= 1) {
    return [arr];
  }
  
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    getPermutations(remaining).forEach(perm => result.push([current, ...perm]));
  }
  return result;
}