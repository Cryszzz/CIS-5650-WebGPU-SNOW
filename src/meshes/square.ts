import { computeSurfaceNormals, computeProjectedPlaneUVs, degreesToRadians} from './utils';
async function generateSquareMesh() {
    const positions: [number, number, number][]= [
        [1.0,0.0,1.0],
        [1.0,0.0,-1.0],
        [-1.0,0.0,-1.0],
        [1.0,0.0,1.0],
        [-1.0,0.0,-1.0],
        [-1.0,0.0,1.0],];
    const uvs: [number, number][]= [
        [1.0,0.0],
        [1.0,1.0],
        [0.0,1.0],
        [1.0,0.0],
        [0.0,1.0],
        [0.0,0.0]];
    const normals: [number][]= [
        [1.0],[1.0],[1.0],[0.0],[0.0],[0.0]];
    const mesh = {
        positions: positions as [number, number, number][],
        normals: normals as [number][],
        uvs: uvs as [number, number][],
    };
    return mesh;
}

export async function getSquareMesh() {
    return await generateSquareMesh();
}