import { computeSurfaceNormals, computeProjectedPlaneUVs, degreesToRadians} from './utils';

import { getHeightData, numberArray } from './geotiff-utils';
import { vec3, glMatrix, vec2 } from 'gl-matrix';

var imgText: number[] = [0, 0];
const EPSILON = 0.00001;

async function loadAndUseHeightData() {
    //const url = '../assets/img/file/everest.tif';
    const url = '../assets/img/file/test2.tif';
    const heightData = await getHeightData(url);
    imgText[0] = numberArray[0];
    imgText[1] = numberArray[1];
    console.log("numberarray");
    console.log(numberArray);
    return heightData;
}

async function generateTerrainMesh() {
    const heightData = await loadAndUseHeightData();
    //console.log("imgarray");
    //console.log(imgText);
    const height = imgText[1];
    const width = imgText[0];
    //const height = 160;
    //const width = 190;
    const terrainSize = 1000;
    const gridSpacing = 1;
    // const gridSpacing = 4;
    const skip=40;
    const uvrepeat=10;
    const verticesPerRow = Math.floor((Math.floor(height/skip)-1)/2)*2+1;
    const verticesPerColumn = Math.floor((Math.floor(width/skip)-1)/2)*2+1;
    console.log("verticesPerRow"+verticesPerRow );
    console.log("verticesPerColumn"+verticesPerColumn );

    const positions: [number, number, number][] = [];
    const uvs: [number, number][] = [];
    for (let x = 0; x <verticesPerColumn*skip; x+=skip) {
        for (let z = 0; z <verticesPerRow*skip; z+=skip) {
          // const dataIndex = x + z * verticesPerRow;
          // console.log(`x: ${x}, z: ${z}, dataIndex: ${dataIndex}, heightData[dataIndex]: ${heightData[dataIndex]}`);


          const data=heightData[x+z*width];
          //console.log(data);
          positions.push([(x - width / 2)*gridSpacing, data, (z - height / 2)*gridSpacing]);
          //positions.push([(x - width / 2)*gridSpacing, 0, (z - height / 2)*gridSpacing]);
          uvs.push([x/(verticesPerRow*skip)*uvrepeat,verticesPerRow*skip-z/(verticesPerRow*skip)*uvrepeat]);
      }
  }

    // for (let x = 0; x <width; x++) {
    //   for (let z = 0; z <height; z++) {
    //     const data=heightData[x+z*width];
    //     //console.log(data);
    //     positions.push([(x - width / 2)*gridSpacing, data/100, (z - height / 2)*gridSpacing]);
    //     const u = (x - width / 2) * uvrepeat / width;
    //     const v = (z - height / 2) * uvrepeat / height;
    //     uvs.push([u, v]);
    //     // uvs.push([u, v]);
    //     // uvs.push([x - width / 2*uvrepeat,verticesPerRow*skip-z/(verticesPerRow*skip)*uvrepeat]);
    //   }
    // }

    const triangles: [number, number, number][] = [];
    for (let x = 0; x < verticesPerColumn - 1; x++) {
        for (let z = 0; z < verticesPerRow - 1; z++) {
            let topLeft = x * verticesPerRow + z;
            let topRight = topLeft + 1;
            let bottomLeft = topLeft + verticesPerRow;
            let bottomRight = bottomLeft + 1;

            triangles.push([topLeft, topRight, bottomLeft]);
            triangles.push([topRight, bottomRight, bottomLeft]);
        }
    }

    const mesh = {
        positions: positions as [number, number, number][],
        triangles: triangles as [number, number, number][],
        normals: [] as [number, number, number][],
        uvs: uvs as [number, number][],
        height: verticesPerRow as number,
        width: verticesPerColumn as number,
    };

    mesh.normals = computeSurfaceNormals(positions, triangles);

    // mesh.uvs = computeProjectedPlaneUVs(positions);

    return mesh;
}

// Export the function that generates the terrain mesh
export async function getTerrainMesh() {
    return await generateTerrainMesh();
}
//     const positions: [number, number, number][]= [[1.0,1.0,0.0],[1.0,-1.0,0.0],[-1.0,-1.0,0.0],[-1.0,1.0,0.0]];
//     const triangles: [number, number, number][]= [[0,1,2],[0,2,3]];
//     const mesh = {
//         positions: positions as [number, number, number][],
//         triangles: triangles as [number, number, number][],
//         normals: [] as [number, number, number][],
//         uvs: [] as [number, number][],
//     };
//     mesh.normals = computeSurfaceNormals(positions, triangles);
//     mesh.uvs = computeProjectedPlaneUVs(positions);
//     return mesh;
// }



export async function getTerrainCells(mesh) {
  return await generateTerrainCells(mesh);
}

async function generateTerrainCells(mesh) {
  let width = mesh.width;
  let height = mesh.height; 
  let grid_size = mesh.positions.length;
  console.log("grid_size " + grid_size);

  let cells :  {
    P0: [number, number, number][],
    P1: [number, number, number][],
    P2: [number, number, number][],
    P3: [number, number, number][],
    Aspect: number[],
    Inclination: number[],
    Altitude: number[],
    Latitude: number[],
    Area: number[],
    AreaXZ: number[],
    SnowWaterEquivalent: number[],
    InterpolatedSWE: number[],
    SnowAlbedo: number[],
    DaysSinceLastSnowfall: number[],
    Curvature: number[],
  } = {
    P0: new Array<[number, number, number]>(grid_size),
    P1: new Array<[number, number, number]>(grid_size),
    P2: new Array<[number, number, number]>(grid_size),
    P3: new Array<[number, number, number]>(grid_size),
    Aspect: new Array<number>(grid_size),
    Inclination: new Array<number>(grid_size),
    Altitude: new Array<number>(grid_size),
    Latitude: new Array<number>(grid_size),
    Area: new Array<number>(grid_size),
    AreaXZ: new Array<number>(grid_size),
    SnowWaterEquivalent: new Array<number>(grid_size),
    InterpolatedSWE: new Array<number>(grid_size),
    SnowAlbedo: new Array<number>(grid_size),
    DaysSinceLastSnowfall: new Array<number>(grid_size),
    Curvature: new Array<number>(grid_size),
  };

  let initialMaxSnow = 0.0;

  for (let x = 0; x < width - 1; x++) {
    for (let z = 0; z < height - 1; z++) {
      let cellIndex = x * height + z;

      cells.P0[cellIndex] = mesh.positions[x * height + z];
      cells.P1[cellIndex] = mesh.positions[x * height + z + 1];
      cells.P2[cellIndex] = mesh.positions[(x + 1) * height + z];
      cells.P3[cellIndex] = mesh.positions[(x + 1) * height + z + 1];

      let P0 = vec3.fromValues(cells.P0[cellIndex][0], cells.P0[cellIndex][1], cells.P0[cellIndex][2]);
      let P1 = vec3.fromValues(cells.P1[cellIndex][0], cells.P1[cellIndex][1], cells.P1[cellIndex][2]);
      let P2 = vec3.fromValues(cells.P2[cellIndex][0], cells.P2[cellIndex][1], cells.P2[cellIndex][2]);
      let P3 = vec3.fromValues(cells.P3[cellIndex][0], cells.P3[cellIndex][1], cells.P3[cellIndex][2]);

      let normal = vec3.cross(vec3.create(), vec3.subtract(vec3.create(), P0, P0), vec3.subtract(vec3.create(), P1, P0));
      let centroid = vec3.fromValues((P0[0] + P1[0] + P2[0] + P3[0]) / 4, (P0[1] + P1[1] + P2[1] + P3[1]) / 4, (P0[2] + P1[2] + P2[2] + P3[2]) / 4);
      cells.Altitude[cellIndex] = centroid[1]; // Centroid.Z

      let P0_minus_P2 = vec3.subtract(vec3.create(), P0, P2);
      let P1_minus_P2 = vec3.subtract(vec3.create(), P1, P2);
      let P0_minus_P2ProjXZ = vec2.fromValues(P0_minus_P2[0], P0_minus_P2[2]);
      let P1_minus_P2ProjXZ = vec2.fromValues(P1_minus_P2[0], P1_minus_P2[2]);
      // cells.AreaXZ = Math.abs(vec2.cross())
      cells.Area[cellIndex] = Math.abs(vec3.len(vec3.cross(vec3.create(), P0_minus_P2, P0_minus_P2)) / 2 + vec3.len(vec3.cross(vec3.create(), P1_minus_P2, P0_minus_P2)) / 2);
      cells.AreaXZ[cellIndex] = Math.abs((vec2.cross(vec3.create(), P0_minus_P2ProjXZ, P0_minus_P2ProjXZ))[2] / 2 + (vec2.cross(vec3.create(), P1_minus_P2ProjXZ, P0_minus_P2ProjXZ))[2] / 2);

      let P0toP3 = vec3.subtract(vec3.create(), P2, P0);
      let P0toP3ProjXZ = vec3.fromValues(P0toP3[0], P0toP3[2], 0);
      cells.Inclination[cellIndex] = vec3.len(P0toP3) < EPSILON ? 0 : Math.acos(vec3.dot(P0toP3, P0toP3ProjXZ) / (vec3.len(P0toP3) * vec3.len(P0toP3ProjXZ)));

      // @TODO: assume constant for the moment, later handle in input data
      const latitude = 47;
      // cells.Latitude[cellIndex] = latitude;
      cells.Latitude[cellIndex] = degreesToRadians(latitude);

      let normalProjXZ = vec2.fromValues(normal[0], normal[2]);
      let north2D = vec2.fromValues(1, 0);
      let dot = vec2.dot(normalProjXZ, north2D);
      let det = normalProjXZ[0] * north2D[1] - normalProjXZ[1] * north2D[0];
      cells.Aspect[cellIndex] = Math.atan2(det, dot);

      // Initial conditions
      let snowWaterEquivalent = 0.0;
      if (cells.Altitude[cellIndex] / 100.0 > 3300.0) {
        let areaSquareMeters = cells.Area[cellIndex] / (100 * 100);
        let we = (2.5 + cells.Altitude[cellIndex] / 100 * 0.001) * areaSquareMeters;

        snowWaterEquivalent = we;

        initialMaxSnow = Math.max(snowWaterEquivalent / areaSquareMeters, initialMaxSnow);
      }
      
      // TODO: if Aspect is used in compute shader, use this
      // float Aspect = IsAlmostZero(NormalProjXY.Size()) ? 0 : FMath::Abs(FMath::Acos(FVector::DotProduct(North, NormalProjXY) / NormalProjXY.Size()));

      cells.SnowWaterEquivalent[cellIndex] = snowWaterEquivalent;

      // TODO: Curvature
    }
  }
  return cells;
}
