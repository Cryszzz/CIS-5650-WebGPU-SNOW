import { computeSurfaceNormals, computeProjectedPlaneUVs } from './utils';
// Another TypeScript file in your project
import { getHeightData } from './geotiff-utils';

async function loadAndUseHeightData() {
    const url = 'file://../assets/img/file/everest.tif';
    const heightData = await getHeightData(url);
    // Use heightData as needed
    return heightData;
}

const heightmap = loadAndUseHeightData();
const terrainSize = 1000; // The physical size of each side of the terrain
const gridSpacing = 40; // The spacing between vertices

const verticesPerRow = terrainSize / gridSpacing+1; // Number of vertices along one side of the terrain
//verticesPerRow =3;
console.log(verticesPerRow);

// Generate a grid of positions
const positions: [number, number, number][] = [];
for (let x = -terrainSize/2; x <= terrainSize/2; x += gridSpacing) {
    for (let z = -terrainSize/2; z <= terrainSize/2; z += gridSpacing) {
        positions.push([x, 0, z]); // Set y to 0, as height will be determined in the shader
        //console.log([x, 0, z]);
    }
}

//console.log("here");
// Generate triangles (cells) for the grid
const triangles: [number, number, number][] = [];
for (let x = 0; x < verticesPerRow-1 ; x++) {
    for (let z = 0; z < verticesPerRow -1; z++) {
        let topLeft = x * verticesPerRow + z;
        let topRight = topLeft + 1;
        let bottomLeft = topLeft + verticesPerRow;
        let bottomRight = bottomLeft  + 1;

        // First triangle (top left triangle of the quad)
        triangles.push([topLeft,  topRight,bottomLeft]);
        /*console.log([topLeft,topRight, bottomLeft, bottomRight]);
        console.log(positions[topLeft]);
        
        console.log(positions[topRight]);
        console.log(positions[bottomLeft]);
        console.log(positions[bottomRight]);*/
        // Second triangle (bottom right triangle of the quad)
        triangles.push([topRight, bottomRight,bottomLeft]);
        //console.log([topRight, bottomLeft, bottomRight]);
    }
}

// Compute normals and UVs using utility functions
// Replace these calls with actual implementations from your 'utils' module

export const mesh = {
    positions: positions as [number, number, number][],
    triangles: triangles as [number, number, number][],
    normals: [] as [number, number, number][],
    uvs: [] as [number, number][],
};

mesh.normals = computeSurfaceNormals(positions, triangles);
mesh.uvs = computeProjectedPlaneUVs(positions);