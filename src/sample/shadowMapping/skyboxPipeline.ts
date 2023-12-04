import { mat4, vec3 } from 'wgpu-matrix';
import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import sampleCubemapWGSL from '../../shaders/sampleCubemap.frag.wgsl';
import { cubeVertexArray, cubeVertexSize, cubeUVOffset, cubePositionOffset, cubeVertexCount } from '../../meshes/cube';

// Function to create the pipeline for rendering the skybox
async function createSkyboxPipeline(device, presentationFormat) {
    return device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({ code: basicVertWGSL }),
            entryPoint: 'main',
            buffers: [{
                arrayStride: cubeVertexSize,
                attributes: [
                    { shaderLocation: 0, offset: cubePositionOffset, format: 'float32x4' },
                    { shaderLocation: 1, offset: cubeUVOffset, format: 'float32x2' },
                ],
            }],
        },
        fragment: {
            module: device.createShaderModule({ code: sampleCubemapWGSL }),
            entryPoint: 'main',
            targets: [{ format: presentationFormat }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'none',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });
}

// Function to load and create cubemap texture
async function loadCubemapTexture(device) {
  const imgSrcs = [
      '../assets/img/cubemap/posx.jpg',
      '../assets/img/cubemap/negx.jpg',
      '../assets/img/cubemap/posy.jpg',
      '../assets/img/cubemap/negy.jpg',
      '../assets/img/cubemap/posz.jpg',
      '../assets/img/cubemap/negz.jpg',
  ];

  const imageBitmaps = await Promise.all(imgSrcs.map(async (src) => {
      const response = await fetch(src);
      return createImageBitmap(await response.blob());
  }));

  const cubemapTexture = device.createTexture({
      dimension: '2d',
      size: [imageBitmaps[0].width, imageBitmaps[0].height, 6],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  imageBitmaps.forEach((imageBitmap, i) => {
      device.queue.copyExternalImageToTexture(
          { source: imageBitmap },
          { texture: cubemapTexture, origin: [0, 0, i] },
          [imageBitmap.width, imageBitmap.height]
      );
  });

  return cubemapTexture;
}

// Main function to render the skybox
export async function renderSkybox(device, canvas, viewMatrix, projectionMatrix) {
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const aspect = canvas.width / canvas.height;

    // Create pipeline
    const pipeline = await createSkyboxPipeline(device, presentationFormat);

    // Load cubemap texture
    const cubemapTexture = await loadCubemapTexture(device);

    // Create a vertex buffer from the cube data
    const verticesBuffer = device.createBuffer({
        size: cubeVertexArray.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
    verticesBuffer.unmap();

    // Create uniform buffer for the model-view-projection matrix        
    const uniformBuffer = device.createBuffer({
      size: 64, // Size for 4x4 matrix in bytes (16 floats * 4 bytes each)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Update transformation matrices and write to buffer
    const modelMatrix = mat4.scaling(vec3.fromValues(1000, 1000, 1000));
    const modelViewProjectionMatrix = mat4.create();
    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, mat4.multiply(modelViewProjectionMatrix, viewMatrix, modelMatrix));

    // Convert the matrix to a Float32Array before writing
    const matrixArray = new Float32Array(modelViewProjectionMatrix);
    console.log(matrixArray.byteLength); // This should output 64
    device.queue.writeBuffer(uniformBuffer, 0, matrixArray.buffer, matrixArray.byteOffset, matrixArray.byteLength);


    // Create a sampler for the cubemap texture
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
    });

    // Create a bind group that binds the uniform buffer and cubemap texture
    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: sampler },
            { binding: 2, resource: cubemapTexture.createView({ dimension: 'cube' }) },
        ],
    });

    // Setup render pass descriptor
    const renderPassDescriptor = {
        colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store' }],
        depthStencilAttachment: {
            view: device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            }).createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    };

    // Issue draw call for the skybox
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(cubeVertexCount);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

