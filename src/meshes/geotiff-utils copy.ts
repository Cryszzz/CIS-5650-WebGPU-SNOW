import { fromArrayBuffer, TypedArray } from 'geotiff';
//import fs from 'fs/promises';

export async function getHeightData(filePath: string): Promise<Float32Array> {
    try {
        // Read file data as ArrayBuffer
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();

        // Use the arrayBuffer to create the GeoTIFF
        /*const fileBuffer = await fs.readFile(filePath);
        const arrayBuffer = fileBuffer.buffer; */

        const tiff = await fromArrayBuffer(arrayBuffer);

        // Get image from GeoTIFF data
        const image = await tiff.getImage();

        // Read raster data from the image
        const rasterData = await image.readRasters();

        const heightDataArray = rasterData[0];

        // Check if heightDataArray is an array or TypedArray
        /*if (!Array.isArray(heightDataArray) && !(heightDataArray instanceof Float32Array)) {
            throw new Error("Height data is not in the expected format");
        }*/

        // Convert the height data to Float32Array
        const float32HeightData = new Float32Array(heightDataArray as TypedArray);

        return float32HeightData;
    } catch (error) {
        console.error("Error in getHeightData:", error.message);
        throw error;
    }
}