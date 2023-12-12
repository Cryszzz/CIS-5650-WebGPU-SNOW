import { fromUrl, fromArrayBuffer, fromBlob ,TypedArray } from 'geotiff';
//import fs from 'fs/promises';
const lerp = (a, b, t) => (1 - t) * a + t * b;

var numberArray : number[] = [0,0];

function transform(a, b, M, roundToInt = false) {
  const round = (v) => (roundToInt ? v | 0 : v);
  return [
    round(M[0] + M[1] * a + M[2] * b),
    round(M[3] + M[4] * a + M[5] * b),
  ];
}

export async function getHeightData(filePath: string): Promise<Float32Array> {
    // Read file data as ArrayBuffer
    const response = await fetch(filePath);
    //const arrayBuffer = await response.arrayBuffer();

    // Use the arrayBuffer to create the GeoTIFF
    /*const fileBuffer = await fs.readFile(filePath);
    const arrayBuffer = fileBuffer.buffer; */

    const tiff = await fromBlob(await response.blob());

    // Get image from GeoTIFF data
    const image = await tiff.getImage();

    // Read raster data from the image
    const rasterData = await image.readRasters();
    const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
    let [sx, sy, sz] = s;
    let [px, py, k, gx, gy, gz] = t;
    sy = -sy; // WGS-84 tiles have a "flipped" y component

    const pixelToGPS = [gx, sx, 0, gy, 0, sy];

    const gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];

    const heightDataArray = rasterData[0];
    const [gx1, gy1, gx2, gy2] = image.getBoundingBox();

    const lat = lerp(gy1, gy2, Math.random());
    const long = lerp(gx1, gx2, Math.random());

    const [x, y] = transform(long, lat, gpsToPixel, true);
    // Check if heightDataArray is an array or TypedArray
    /*if (!Array.isArray(heightDataArray) && !(heightDataArray instanceof Float32Array)) {
        throw new Error("Height data is not in the expected format");
    }*/

    // Convert the height data to Float32Array
    const { width, [0]: raster } = rasterData;
    const height=Math.floor(width/(gx2-gx1)*(gy2-gy1));
    numberArray[0]=width;
    numberArray[1]=height;
    const float32HeightData = new Float32Array(heightDataArray as TypedArray);

    return float32HeightData;
}

export {numberArray};