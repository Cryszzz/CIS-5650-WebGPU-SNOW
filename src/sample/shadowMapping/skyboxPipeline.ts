import { mat4, vec3 } from 'wgpu-matrix';
import basicVertWGSL from '../shaders/basic.vert.wgsl';
//import sampleCubemapWGSL from '../../shaders/sampleCubemap.frag.wgsl';
import { cubeVertexArray, cubeVertexSize, cubeUVOffset, cubePositionOffset, cubeVertexCount } from '../../meshes/cube';

// Function to create the pipeline for rendering the skybox

export async function renderSkybox(device, pipeline, verticesBuffer, uniformBuffer, uniformBindGroup,passEncoder,cameraViewProj) {
    //console.log(uniformBindGroup);
  //device.queue.writeBuffer(uniformBuffer, 0, matrixArray.buffer, matrixArray.byteOffset, matrixArray.byteLength);
  //const cameraViewProj = getModelViewProjectionMatrix(deltaTime);
    device.queue.writeBuffer(
        uniformBuffer,
        0,
        cameraViewProj.buffer,
        cameraViewProj.byteOffset,
        cameraViewProj.byteLength
    )

  // Issue draw call for the skybox
  //const commandEncoder = device.createCommandEncoder();
  //const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.draw(cubeVertexCount);
  //passEncoder.end();
  //device.queue.submit([commandEncoder.finish()]);
}
