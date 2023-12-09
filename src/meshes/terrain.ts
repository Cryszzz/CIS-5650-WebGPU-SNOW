import { computeSurfaceNormals, computeProjectedPlaneUVs, degreesToRadians} from './utils';

import { getHeightData, numberArray } from './geotiff-utils';
import { vec3, glMatrix, vec2 } from 'gl-matrix';

var imgText: number[] = [0, 0];
const EPSILON = 0.00001;

async function loadAndUseHeightData() {
    const url = '../assets/img/file/k2-h.tif';
    // const url = '../assets/img/file/test2.tif';
    const heightData = await getHeightData(url);
    imgText[0] = numberArray[0];
    imgText[1] = numberArray[1];
    console.log("numberarray");
    console.log(numberArray);
    return heightData;
}

async function generateTerrainMesh() {
    const heightData = await loadAndUseHeightData();
    const width = imgText[0]; // TODO: may have to swap this
    const height = imgText[1]; // TODO: may have to swap this
    const gridSpacing = 1;
    const skip=8;
    const verticesPerRow = Math.floor(width/skip); // height = verticesPerRow
    const verticesPerColumn = Math.floor(height/skip); //width = verticesPerColumn
    console.log("verticesPerRow"+verticesPerRow );
    console.log("verticesPerColumn"+verticesPerColumn );

    const positions: [number, number, number][] = [];
    for (let z = 0; z <verticesPerColumn*skip; z+=skip) {
        for (let x = 0; x <verticesPerRow*skip; x+=skip) {
          // console.log(`x: ${x}, z: ${z}, heightData[z*width+x]: ${heightData[z*width+x]}`);
          const data=heightData[z*width+x];
          positions.push([(x - width / 2)*gridSpacing, data, (z - height / 2)*gridSpacing]);
        }
    }

    const mesh = {
        positions: positions as [number, number, number][],
        height: verticesPerColumn as number,
        width: verticesPerRow as number,
    };

    return mesh;
}

// Export the function that generates the terrain mesh
export async function getTerrainMesh() {
    return await generateTerrainMesh();
}

const normalizeAngle360 = (A: number) => {
    A = A % 360;
    return A < 0 ? A + (Math.PI*2) : A;
}

export async function getTerrainCells(mesh) {
  return await generateTerrainCells(mesh);
}

function getCellIndex(x : number, z : number, cell_width_x : number, cell_height_z)
{
  let index = z * cell_width_x + x;
  return (index >= 0 && index < (cell_width_x * cell_height_z) && x < cell_width_x && x > 0) ? index : -1;
 
}

async function generateTerrainCells(mesh) {
  let width = mesh.width;
  let height = mesh.height; 
  let grid_size = (width - 1) * (height - 1);
  console.log("grid_size " + grid_size);
  console.log("side_width " + (width-1));
  console.log("side_height " + (height-1));

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
    Size: number,
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
    Size: (height-1)*(width-1),
  };

  let initialMaxSnow = 0.0;
  // let cellIndex = 0;
  
  for (let z = 0; z < height - 1; z++) {
    for (let x = 0; x < width - 1; x++) {
      let cellIndex = z * (width - 1) + x;
      cells.P0[cellIndex] = mesh.positions[z * (width) + x];
      cells.P1[cellIndex] = mesh.positions[z * (width) + x + 1];
      cells.P2[cellIndex] = mesh.positions[(z + 1) * (width) + x];
      cells.P3[cellIndex] = mesh.positions[(z + 1) * (width) + x + 1];

      let P0 = vec3.fromValues(cells.P0[cellIndex][0], cells.P0[cellIndex][1], cells.P0[cellIndex][2]);
      let P1 = vec3.fromValues(cells.P1[cellIndex][0], cells.P1[cellIndex][1], cells.P1[cellIndex][2]);
      let P2 = vec3.fromValues(cells.P2[cellIndex][0], cells.P2[cellIndex][1], cells.P2[cellIndex][2]);
      let P3 = vec3.fromValues(cells.P3[cellIndex][0], cells.P3[cellIndex][1], cells.P3[cellIndex][2]);

      let normal = vec3.cross(vec3.create(), vec3.subtract(vec3.create(), P1, P0), vec3.subtract(vec3.create(), P2, P0));
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
      let north2D = vec2.fromValues(0, -1);
      let dot = vec2.dot(normalProjXZ, north2D);
      let det = normalProjXZ[0] * north2D[1] - normalProjXZ[1] * north2D[0];
      cells.Aspect[cellIndex] = Math.atan2(det, dot);
      cells.Aspect[cellIndex] = normalizeAngle360(cells.Aspect[cellIndex]);

      // Initial conditions
      let snowWaterEquivalent = 0.0;
      if (cells.Altitude[cellIndex] / 100.0 > 3300.0) {
        let areaSquareMeters = cells.Area[cellIndex] / (100 * 100);
        let we = (2.5 + cells.Altitude[cellIndex] / 100 * 0.001) * areaSquareMeters;
        // console.log("initial swe: " + we);
        snowWaterEquivalent = we;
      // TODO: bind max snow buffer to this number
        initialMaxSnow = Math.max(snowWaterEquivalent / areaSquareMeters, initialMaxSnow);
      }
      
      // TODO: if Aspect is used in compute shader, use this
      // float Aspect = IsAlmostZero(NormalProjXY.Size()) ? 0 : FMath::Abs(FMath::Acos(FVector::DotProduct(North, NormalProjXY) / NormalProjXY.Size()));

      cells.SnowWaterEquivalent[cellIndex] = snowWaterEquivalent;

      // TODO: Curvature
      // cells.Curvature[cellIndex] = 1.0;
      // cellIndex++;
    }
  }

  let cell_width_x = width - 1;
  let cell_height_z = height - 1;
  
  for (let z = 0; z < cell_height_z; z++) {
    for (let x = 0; x < cell_width_x; x++) {
      let index = z * cell_width_x + x;
      let neighborsIndices = new Array(8);

      neighborsIndices[0] = getCellIndex(x, z - 1, cell_width_x, cell_height_z);						// N
      neighborsIndices[1] = getCellIndex(x + 1, z - 1, cell_width_x, cell_height_z);					// NE
      neighborsIndices[2] = getCellIndex(x + 1, z, cell_width_x, cell_height_z);						// E
      neighborsIndices[3] = getCellIndex(x + 1, z + 1, cell_width_x, cell_height_z);					// SE

      neighborsIndices[4] = getCellIndex(x, z + 1, cell_width_x, cell_height_z);						// S
      neighborsIndices[5] = getCellIndex(x - 1, z + 1, cell_width_x, cell_height_z); 				// SW
      neighborsIndices[6] = getCellIndex(x - 1, z, cell_width_x, cell_height_z);						// W
      neighborsIndices[7] = getCellIndex(x - 1, z - 1, cell_width_x, cell_height_z);					// NW

      // if (x > 20 && x < 30 && z > 20 && z < 30) {
      //   console.log("index: ", index);
      //   console.log("neighborsIndices: ", neighborsIndices);
      //   console.log("0: ", neighborsIndices[0]);
      //   console.log("1: ", neighborsIndices[1]);
      //   console.log("2: ", neighborsIndices[2]);
      //   console.log("3: ", neighborsIndices[3]);
      //   console.log("4: ", neighborsIndices[4]);
      //   console.log("5: ", neighborsIndices[5]);
      //   console.log("6: ", neighborsIndices[6]);
      //   console.log("7: ", neighborsIndices[7]);
      // }
      if (neighborsIndices[0] == -1 || neighborsIndices[1] == -1 || neighborsIndices[2] == -1 || neighborsIndices[3] == -1
        || neighborsIndices[4] == -1 || neighborsIndices[5] == -1 || neighborsIndices[6] == -1 || neighborsIndices[7] == -1)
        {
          console.log("index: " + index + " 5e-7");
          cells.Curvature[index] = -0.0005;
          continue;
        }

      let Z1 = cells.Altitude[neighborsIndices[1]] / 100; // NW
      let Z2 = cells.Altitude[neighborsIndices[0]] / 100; // N
      let Z3 = cells.Altitude[neighborsIndices[7]] / 100; // NE
      let Z4 = cells.Altitude[neighborsIndices[2]] / 100; // W
      let Z5 = cells.Altitude[index] / 100;
      let Z6 = cells.Altitude[neighborsIndices[6]] / 100; // E
      let Z7 = cells.Altitude[neighborsIndices[3]] / 100; // SW
      let Z8 = cells.Altitude[neighborsIndices[4]] / 100; // S
      let Z9 = cells.Altitude[neighborsIndices[5]] / 100; // SE

      // console.log("cells.P1[index][0], cells.P0[index][0]: " + cells.P1[index][0] + ", " + cells.P0[index][0]);
      let L = cells.P1[index][0] - cells.P0[index][0]

      // console.log("L: ", L);
      // console.log("Z2: ", Z2);
      // console.log("Z4: ", Z4);
      // console.log("Z5: ", Z5);
      // console.log("Z6: ", Z6);
      // console.log("Z8: ", Z8);

      let D = ((Z4 + Z6) / 2 - Z5) / (L * L);
      let E = ((Z2 + Z8) / 2 - Z5) / (L * L);
      cells.Curvature[index] = 2 * (D + E);
      // if (x > 20 && x < 30 && z > 20 && z < 30) {
      //   console.log("curvature: ", cells.Curvature[index]);
      // }

    }
  }
  return cells;
}
