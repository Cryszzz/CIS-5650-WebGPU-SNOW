import { mat4, vec3 } from 'wgpu-matrix';
import basicVertWGSL from '../../shaders/basic.vert.wgsl';
//import sampleCubemapWGSL from '../../shaders/sampleCubemap.frag.wgsl';
import { cubeVertexArray, cubeVertexSize, cubeUVOffset, cubePositionOffset, cubeVertexCount } from '../../meshes/cube';

// Function to create the pipeline for rendering the skybox
export async function createSkyboxPipeline(device, presentationFormat)  {
    return device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({ code: basicVertWGSL }),
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: cubeVertexSize,
                attributes: [
                    { shaderLocation: 0, offset: cubePositionOffset, format: 'float32x4' },
                    { shaderLocation: 1, offset: cubeUVOffset, format: 'float32x2' },
                ],
            }],
        },
        fragment: {
            module: device.createShaderModule({ code: basicVertWGSL }),
            entryPoint: 'fs_main',
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8',
        },
    });
}

// Function to load and create cubemap texture
export async function loadCubemapTexture(device) {
  const imgSrcs = [
      '../assets/img/cubemap/posx.jpg',
      '../assets/img/cubemap/negx.jpg',
      '../assets/img/cubemap/posy.jpg',
      '../assets/img/cubemap/negy.jpg',
      '../assets/img/cubemap/posz.jpg',
      '../assets/img/cubemap/negz.jpg',
  ];

  const promises = imgSrcs.map(async (src) => {
    const response = await fetch(src);
    return createImageBitmap(await response.blob());
  });
  const imageBitmaps = await Promise.all(promises);
  
  var cubemapTexture: GPUTexture;
  cubemapTexture = device.createTexture({
      dimension: '2d',
      size: [imageBitmaps[0].width, imageBitmaps[0].height, 6],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  for (let i = 0; i < imageBitmaps.length; i++) {
    const imageBitmap = imageBitmaps[i];
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: cubemapTexture, origin: [0, 0, i] },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  return cubemapTexture;
}

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
