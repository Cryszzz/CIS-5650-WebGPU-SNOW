import { computeSurfaceNormals, computeProjectedPlaneUVs } from './utils';
import { getHeightData, numberArray } from './geotiff-utils';
import '../sample/shadowMapping/snowComputeInterfaces';
import { vec3, glMatrix } from 'gl-matrix';

var imgText: number[] = [0, 0];
const GRID_SIZE = 80;
// const config = {};
glMatrix.setMatrixArrayType(Array);

async function loadAndUseHeightData() {
    const url = '../assets/img/file/everest.tif';
    const heightData = await getHeightData(url);
    imgText[0] = numberArray[0];
    imgText[1] = numberArray[1];
    console.log("numberarray");
    console.log(numberArray);
    return heightData;
}

async function generateTerrainMesh() {
    const heightData = await loadAndUseHeightData();
    console.log("imgarray");
    console.log(imgText);
    const height = imgText[1];
    const width = imgText[0];
    //const height = 4;
    //const width = 3;
    // const terrainSize = 1000;
    const gridSpacing = 4;
    const verticesPerRow = height;
    const snowGridSpacing = width / GRID_SIZE;

    const positions: [number, number, number][] = [];
    for (let x = 0; x <width; x++) {
        for (let z = 0; z <height; z++) {
            const data=heightData[x+z*width];
            //console.log(data);
            positions.push([(x - width / 2)*gridSpacing, data/100, (z - height / 2)*gridSpacing]);
        }
    }

    const snowGridPositions: [number, number, number][] = [];
    for (let x = 0; x <width; x++) {
        for (let z = 0; z <height; z++) {
            const data=heightData[x+z*width];
            //console.log(data);
            snowGridPositions.push([(x - width / 2)*snowGridSpacing, data/100, (z - height / 2)*snowGridSpacing]);
        }
    }

    const triangles: [number, number, number][] = [];
    for (let x = 0; x < width - 1; x++) {
        for (let z = 0; z < height - 1; z++) {
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
        uvs: [] as [number, number][],
        snowGridPositions: [] as [number, number, number][],
        height: height as number,
        width: width as number,
        // snowGridNormals: [] as [number, number, number][],
        // snowGridUVs: [] as [number, number][],
    };

    mesh.normals = computeSurfaceNormals(positions, triangles);
    mesh.uvs = computeProjectedPlaneUVs(positions);

    return mesh;
}

// Export the function that generates the terrain mesh
export async function getTerrainMesh() {
    return await generateTerrainMesh();
}

async function generateTerrainCells(mesh) {
    let width = mesh.width;
    let height = mesh.height; 

    let cells : TerrainCellArray = new TerrainCellArray(GRID_SIZE * GRID_SIZE);

    const generateCells: [number, number, number][] = [];
    for (let x = 0; x < GRID_SIZE - 1; x++) {
        for (let z = 0; z < GRID_SIZE - 1; z++) {
            let cellIndex = x * height + z;
            let cell : TerrainCell = cells.getCell(cellIndex);

            cell.P0 = mesh.snowGridPositions[x * height + z];
            cell.P1 = mesh.snowGridPositions[x * height + z + 1];
            cell.P2 = mesh.snowGridPositions[(x + 1) * height + z];
            cell.P3 = mesh.snowGridPositions[(x + 1) * height + z + 1];
            
            let P0 = vec3.fromValues(cell.P0[0], cell.P0[1], cell.P0[2]);
            let P1 = vec3.fromValues(cell.P1[0], cell.P1[1], cell.P1[2]);
            let P2 = vec3.fromValues(cell.P2[0], cell.P2[1], cell.P2[2]);
            let P3 = vec3.fromValues(cell.P3[0], cell.P3[1], cell.P3[2]);

            let normal = vec3.cross(vec3.create(), vec3.subtract(vec3.create(), P0, P0), vec3.subtract(vec3.create(), P1, P0));
            FVector Centroid = FVector((P0.X + P0.X + P1.X + P2.X) / 4, (P0.Y + P0.Y + P1.Y + P2.Y) / 4, (P0.Z + P0.Z + P1.Z + P2.Z) / 4);

            float Altitude = Centroid.Z;

            float Area = FMath::Abs(FVector::CrossProduct(P0 - P2, P0 - P2).Size() / 2 + FVector::CrossProduct(P1 - P2, P0 - P2).Size() / 2);

            float AreaXY = FMath::Abs(FVector2D::CrossProduct(FVector2D(P0 - P2), FVector2D(P0 - P2)) / 2
                + FVector2D::CrossProduct(FVector2D(P1 - P2), FVector2D(P0 - P2)) / 2);

            FVector P0toP3 = P2 - P0;
            FVector P0toP3ProjXY = FVector(P0toP3.X, P0toP3.Y, 0);
            float Inclination = IsAlmostZero(P0toP3.Size()) ? 0 : FMath::Abs(FMath::Acos(FVector::DotProduct(P0toP3, P0toP3ProjXY) / (P0toP3.Size() * P0toP3ProjXY.Size())));

            // @TODO assume constant for the moment, later handle in input data
            const float Latitude = FMath::DegreesToRadians(47);

            // @TODO what is the aspect of the XY plane?
            
            
            FVector2D NormalProjXY = FVector2D(Normal.X, Normal.Y);
            FVector2D North2D = FVector2D(1, 0);
            float Dot = FVector2D::DotProduct(NormalProjXY, North2D);
            float Det = NormalProjXY.X * North2D.Y - NormalProjXY.Y*North2D.X;
            float Aspect = FMath::Atan2(Det, Dot);
            Aspect = NormalizeAngle360(Aspect);
            
            //float Aspect = IsAlmostZero(NormalProjXY.Size()) ? 0 : FMath::Abs(FMath::Acos(FVector::DotProduct(North, NormalProjXY) / NormalProjXY.Size()));

            // Initial conditions
            float SnowWaterEquivalent = 0.0f;
            if (Altitude / 100.0f > 3300.0f)
            {
                auto AreaSquareMeters = Area / (100 * 100);
                float we = (2.5 + Altitude / 100 * 0.001) * AreaSquareMeters;

                SnowWaterEquivalent = we;

                InitialMaxSnow = FMath::Max(SnowWaterEquivalent / AreaSquareMeters, InitialMaxSnow);
            }

            // Create cells
            FLandscapeCell Cell(Index, P0, P0, P1, P2, Normal, Area, AreaXY, Centroid, Altitude, Aspect, Inclination, Latitude, SnowWaterEquivalent);
            LandscapeCells.Add(Cell);

            FDebugCell DebugCell(P0, P0, P1, P2, Centroid, Normal, Altitude, Aspect);
            DebugCells.Add(DebugCell);

            Index++;
        }
    }
}
