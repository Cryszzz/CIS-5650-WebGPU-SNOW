import { computeSurfaceNormals, computeProjectedPlaneUVs } from './utils';

const terrainSize = 100; // The physical size of each side of the terrain
const gridSpacing = 0.5; // The spacing between vertices

const verticesPerRow = terrainSize / gridSpacing; // Number of vertices along one side of the terrain

// Generate a grid of positions
const positions: [number, number, number][] = [];
for (let x = 0; x < terrainSize; x += gridSpacing) {
    for (let z = 0; z < terrainSize; z += gridSpacing) {
        positions.push([x, 0, z]); // Set y to 0, as height will be determined in the shader
    }
}

// Generate triangles (cells) for the grid
const triangles: [number, number, number][] = [];
for (let x = 0; x < verticesPerRow - 1; x++) {
    for (let z = 0; z < verticesPerRow - 1; z++) {
        let topLeft = x * verticesPerRow + z;
        let topRight = topLeft + 1;
        let bottomLeft = topLeft + verticesPerRow;
        let bottomRight = bottomLeft + 1;

        // First triangle (top left triangle of the quad)
        triangles.push([topLeft, bottomLeft, topRight]);
        // Second triangle (bottom right triangle of the quad)
        triangles.push([bottomLeft, bottomRight, topRight]);
    }
}

// Compute normals and UVs using utility functions
// Replace these calls with actual implementations from your 'utils' module
const normals = computeSurfaceNormals(positions, triangles);
const uvs = computeProjectedPlaneUVs(positions);

export const mesh = {
    positions: positions as [number, number, number][],
    normals: normals,
    uvs: uvs,
    triangles: triangles as [number, number, number][],
};
