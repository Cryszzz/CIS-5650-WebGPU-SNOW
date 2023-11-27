import { computeSurfaceNormals, computeProjectedPlaneUVs } from './utils';
import { getHeightData, numberArray } from './geotiff-utils';

var imgText: number[] = [0, 0];

async function loadAndUseHeightData() {
    const url = '../assets/img/file/everest.tif';
    const heightData = await getHeightData(url);
    imgText[0] = numberArray[0];
    imgText[1] = numberArray[1];
    console.log("numberarray");
    console.log(numberArray);
    return heightData;
}

async function createTextureFromImage(device: GPUDevice, src: string): Promise<GPUTexture> {
    const img = new Image();
    img.src = src;
    await img.decode();
  
    const imageBitmap = await createImageBitmap(img);
    const texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
  
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );
  
    return texture;
}
  

async function generateTerrainMesh(device: GPUDevice): Promise<{ mesh: any, texture: GPUTexture }> {
    const heightData = await loadAndUseHeightData();
    const texture = await createTextureFromImage(device, '../file/stone+mountain+rock-2048x2048.png');
    console.log("imgarray");
    console.log(imgText);
    const height = imgText[1];
    const width = imgText[0];
    //const height = 4;
    //const width = 3;
    const terrainSize = 1000;
    const gridSpacing = 4;
    const verticesPerRow = height;

    const positions: [number, number, number][] = [];
    for (let x = 0; x <width; x++) {
        for (let z = 0; z <height; z++) {
            const data=heightData[x+z*width];
            //console.log(data);
            positions.push([(x - width / 2)*gridSpacing, data/100, (z - height / 2)*gridSpacing]);
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
    };

    mesh.normals = computeSurfaceNormals(positions, triangles);
    mesh.uvs = computeProjectedPlaneUVs(positions);

    return { mesh: mesh, texture };
}

// Update this function to accept a GPUDevice parameter
export async function getTerrainMesh(device: GPUDevice): Promise<{ mesh: any, texture: GPUTexture }> {
    return await generateTerrainMesh(device);
}

