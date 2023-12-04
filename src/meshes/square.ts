import { computeSurfaceNormals, computeProjectedPlaneUVs, degreesToRadians} from './utils';
async function generateSquareMesh() {
    const positions: [number, number, number][]= [
        [1.0,0.0,1.0],
        [1.0,0.0,-1.0],
        [-1.0,0.0,-1.0],
        [1.0,0.0,1.0],
        [-1.0,0.0,-1.0],
        [-1.0,0.0,1.0],];
    /*[1.0,0.0,1.0],
    [1.0,0.0,-1.0],
    [-1.0,0.0,-1.0],*/
    const triangles: [number, number, number][]= [[0,1,2],[0,2,3]];//[0,2,3]];
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
        triangles: triangles as [number, number, number][],
        normals: normals as [number][],
        uvs: uvs as [number, number][],
    };
    //mesh.normals = computeSurfaceNormals(positions, triangles);
    //mesh.uvs = computeProjectedPlaneUVs(positions);
    console.log(mesh);
    return mesh;
}

export async function getSquareMesh() {
    return await generateSquareMesh();
}