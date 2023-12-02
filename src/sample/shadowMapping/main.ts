import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import particleWGSL from './particle.wgsl';
import probabilityMapWGSL from './probabilityMap.wgsl';
import { getTerrainMesh, getTerrainCells } from '../../meshes/terrain';
import { WASDCamera, cameraSourceInfo } from './camera';
import { createInputHandler, inputSourceInfo } from './input';
import { getWeatherData } from './weather';
import { getDayOfYear, degreesToRadians, timeToDays, timeToHours} from '../../meshes/utils';

const numParticles = 50000;
const particlePositionOffset = 0;
const particleColorOffset = 4 * 4;
const particleInstanceByteSize =
  3 * 4 + // position
  1 * 4 + // lifetime
  4 * 4 + // color
  3 * 4 + // velocity
  1 * 4 + // padding
  0;

const terrainCellByteSize =
  1 * 4 + // Aspect
  1 * 4 + // Inclination
  1 * 4 + // Altitude
  1 * 4 + // Latitude
  1 * 4 + // Area
  1 * 4 + // AreaXZ
  1 * 4 + // SnowWaterEquivalent
  1 * 4 + // InterpolatedSWE
  1 * 4 + // SnowAlbedo
  1 * 4 + // DaysSinceLastSnowfall
  1 * 4 + // Curvature
  0;

const weatherCellByteSize =
  1 * 4 + // Temperature
  1 * 4 + // Precipitation
  0;

const cameraDefaults = {
  position: vec3.create(0, 300, -80),
  target: vec3.create(0, 250, 0),
  // position: vec3.create(0, 5, -5),
  // target: vec3.create(0, 0, 0),
};


function setCamera(position?, target?)
{
  const initialCameraPosition = position ? position : cameraDefaults.position;
  const initialCameraTarget = target ? target : cameraDefaults.target;
  return new WASDCamera({ position: initialCameraPosition, target: initialCameraTarget });
}


const init: SampleInit = async ({ canvas, pageState, gui }) => {
 

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
 
  // The input handler
  const inputHandler = createInputHandler(window, canvas);

  // Camera initialization
  let camera = setCamera();

  const cameraParams = 
  {
    resetCamera() {
      camera = setCamera();
    }
  };

  gui.add(cameraParams, 'resetCamera').name("Reset Camera");

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const particlesBuffer = device.createBuffer({
    size: numParticles * particleInstanceByteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
  });

  const mesh=await getTerrainMesh();
  const terrainCells = await getTerrainCells(mesh);

  for (let i = 0; i < 200; i += 20) {
    console.log("Terrain Cell: " + i)
    console.log("P0: " + i + " " + terrainCells.P0[i]);
    console.log("P1: " + i + " " + terrainCells.P1[i]);
    console.log("P2: " + i + " " + terrainCells.P2[i]);
    console.log("P3: " + i + " " + terrainCells.P3[i]);
    console.log("Aspect: " + i + " " + terrainCells.Aspect[i]);
    console.log("Inclination: " + i + " " + terrainCells.Inclination[i]);
    console.log("Altitude: " + i + " " + terrainCells.Altitude[i]);
    console.log("Latitude: " + i + " " + terrainCells.Latitude[i]);
    console.log("Area: " + i + " " + terrainCells.Area[i]);
    console.log("AreaXZ: " + i + " " + terrainCells.AreaXZ[i]);
    console.log("SnowWaterEquivalent: " + i + " " + terrainCells.SnowWaterEquivalent[i]);
    console.log("InterpolatedSWE: " + i + " " + terrainCells.InterpolatedSWE[i]);
    console.log("SnowAlbedo: " + i + " " + terrainCells.SnowAlbedo[i]);
    console.log("DaysSinceLastSnowfall: " + i + " " + terrainCells.DaysSinceLastSnowfall[i]);
    console.log("Curvature: " + i + " " + terrainCells.Curvature[i]);
  }

  const weatherBuffer =  device.createBuffer({
    size: mesh.width * mesh.height * weatherCellByteSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  
  const indexCount = mesh.triangles.length * 3;
  console.log("buffer size"+indexCount * Uint16Array.BYTES_PER_ELEMENT);
  console.log("mesh.triangles.length: " + mesh.triangles.length)
  const indexBuffer = device.createBuffer({
    label: "index buffer",
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < mesh.triangles.length; ++i) {
      mapping.set(mesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
  }
  const vertexBuffer = device.createBuffer({
    label: "vertex buffer",
    size: mesh.positions.length * 8 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], 8 * i);
      mapping.set(mesh.normals[i], 8 * i + 3);
      mapping.set(mesh.uvs[i], 8 * i+6);
    }
    vertexBuffer.unmap();
  }
  const vertexBuffers: Iterable<GPUVertexBufferLayout> = [
    {
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 8,
      attributes: [
        {
          // position
          shaderLocation: 0,
          offset: 0,
          format: 'float32x3',
        },
        {
          // normal
          shaderLocation: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 3,
          format: 'float32x3',
        },
        {
          // uv
          shaderLocation: 2,
          offset: Float32Array.BYTES_PER_ELEMENT * 6,
          format: 'float32x2',
        },
      ],
    },
  ];
  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: particleWGSL,
      }),
      entryPoint: 'vs_main',
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: particleWGSL,
      }),
      entryPoint: 'fs_main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      //cullMode: 'back',
    },

    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus-stencil8',
    },
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus-stencil8',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const writableTexture = device.createTexture({
    size: [mesh.width, mesh.height, 1],
    format: 'rgba8unorm', // Adjust based on your requirements
    usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const uniformBufferSize =
    4 * 4 * 4 + // modelViewProjectionMatrix : mat4x4<f32>
    3 * 4 + // right : vec3<f32>
    4 + // padding
    3 * 4 + // up : vec3<f32>
    4 + // padding
    0;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: writableTexture.createView(),
      },
    ],
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      stencilClearValue: 0,
      stencilLoadOp: 'clear',
      stencilStoreOp: 'store',
    },
  };

  //////////////////////////////////////////////////////////////////////////////
  // Quad vertex buffer
  //////////////////////////////////////////////////////////////////////////////
  const quadVertexBuffer = device.createBuffer({
    size: 6 * 2 * 4, // 6x vec2<f32>
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  // prettier-ignore
  const vertexData = [
    -1.0, -1.0, +1.0, -1.0, -1.0, +1.0, -1.0, +1.0, +1.0, -1.0, +1.0, +1.0,
  ];
  new Float32Array(quadVertexBuffer.getMappedRange()).set(vertexData);
  quadVertexBuffer.unmap();

  //////////////////////////////////////////////////////////////////////////////
  // Texture
  //////////////////////////////////////////////////////////////////////////////
  let cubeTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/file/rock.png');
    const imageBitmap = await createImageBitmap(await response.blob());

    cubeTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: cubeTexture },
      [imageBitmap.width, imageBitmap.height]
    );
  }
  
  let texture: GPUTexture;
  let textureWidth = 1;
  let textureHeight = 1;
  let numMipLevels = 1;
  {
    const response = await fetch('../assets/img/webgpu.png');
    const imageBitmap = await createImageBitmap(await response.blob());

    // Calculate number of mip levels required to generate the probability map
    while (
      textureWidth < imageBitmap.width ||
      textureHeight < imageBitmap.height
    ) {
      textureWidth *= 2;
      textureHeight *= 2;
      numMipLevels++;
    }
    texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      mipLevelCount: numMipLevels,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Probability map generation
  // The 0'th mip level of texture holds the color data and spawn-probability in
  // the alpha channel. The mip levels 1..N are generated to hold spawn
  // probabilities up to the top 1x1 mip level.
  //////////////////////////////////////////////////////////////////////////////
  {
    const probabilityMapImportLevelPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: device.createShaderModule({ code: probabilityMapWGSL }),
        entryPoint: 'import_level',
      },
    });
    const probabilityMapExportLevelPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: device.createShaderModule({ code: probabilityMapWGSL }),
        entryPoint: 'export_level',
      },
    });

    const probabilityMapUBOBufferSize =
      1 * 4 + // stride
      3 * 4 + // padding
      0;
    const probabilityMapUBOBuffer = device.createBuffer({
      size: probabilityMapUBOBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const buffer_a = device.createBuffer({
      size: textureWidth * textureHeight * 4,
      usage: GPUBufferUsage.STORAGE,
    });
    const buffer_b = device.createBuffer({
      size: textureWidth * textureHeight * 4,
      usage: GPUBufferUsage.STORAGE,
    });
    device.queue.writeBuffer(
      probabilityMapUBOBuffer,
      0,
      new Int32Array([textureWidth])
    );
    const commandEncoder = device.createCommandEncoder();
    for (let level = 0; level < numMipLevels; level++) {
      const levelWidth = textureWidth >> level;
      const levelHeight = textureHeight >> level;
      const pipeline =
        level == 0
          ? probabilityMapImportLevelPipeline.getBindGroupLayout(0)
          : probabilityMapExportLevelPipeline.getBindGroupLayout(0);
      const probabilityMapBindGroup = device.createBindGroup({
        layout: pipeline,
        entries: [
          {
            // ubo
            binding: 0,
            resource: { buffer: probabilityMapUBOBuffer },
          },
          {
            // buf_in
            binding: 1,
            resource: { buffer: level & 1 ? buffer_a : buffer_b },
          },
          {
            // buf_out
            binding: 2,
            resource: { buffer: level & 1 ? buffer_b : buffer_a },
          },
          {
            // tex_in / tex_out
            binding: 3,
            resource: texture.createView({
              format: 'rgba8unorm',
              dimension: '2d',
              baseMipLevel: level,
              mipLevelCount: 1,
            }),
          },
        ],
      });
      if (level == 0) {
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(probabilityMapImportLevelPipeline);
        passEncoder.setBindGroup(0, probabilityMapBindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(levelWidth / 64), levelHeight);
        passEncoder.end();
      } else {
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(probabilityMapExportLevelPipeline);
        passEncoder.setBindGroup(0, probabilityMapBindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(levelWidth / 64), levelHeight);
        passEncoder.end();
      }
    }
    device.queue.submit([commandEncoder.finish()]);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Simulation compute pipeline
  //////////////////////////////////////////////////////////////////////////////
  const simulationParams = {
    simulate: true,
    deltaTime: 0.04,
  };

  const simulationUBOBufferSize =
    1 * 4 + // deltaTime
    3 * 4 + // padding
    4 * 4 + // seed
    4 * 4 + //temp+perci
    0;
  const simulationUBOBuffer = device.createBuffer({
    size: simulationUBOBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  Object.keys(simulationParams).forEach((k) => {
    gui.add(simulationParams, k);
  });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        code: particleWGSL,
      }),
      entryPoint: 'simulate',
    },
  });
  const computeBindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: simulationUBOBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: particlesBuffer,
          offset: 0,
          size: numParticles * particleInstanceByteSize,
        },
      },
      {
        binding: 2,
        resource: cubeTexture.createView(),
      },
      {
        binding: 3,
        //resource: cubeTexture.createView(),
        resource: writableTexture.createView({
            format: 'rgba8unorm',
            dimension: '2d',
          }
        ),
      },
    ],
  });

  const aspect = canvas.width / canvas.height;
  const projection = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  const view = mat4.create();
  const mvp = mat4.create();

  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    2000.0
  );

  const modelViewProjectionMatrix = mat4.create();

  function getModelViewProjectionMatrix(deltaTime: number) {
    const viewMatrix = camera.update(deltaTime, inputHandler());
    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
    return modelViewProjectionMatrix as Float32Array;
  }

  let lastFrameMS = Date.now();

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;
    const now = Date.now();
    const deltaTime = (now - lastFrameMS) / 1000;
    lastFrameMS = now;
    //TODO: how to bind weather Data per frame
    // Can pass it in another storage buffer with each terrain cell, because currently I have weather data per cell
    // I think our bindings can be like this:
    // 1. terrainCell storage buffer 1 
    // 2. terrainCell storage buffer 2 (for ping-ponging)
    // 2. weather storage buffer (separately, because at the moment this is calculated on CPU.
    // So this will need to be passed in every frame. I'll work on moving this to the compute shader later)

    let weatherData = getWeatherData(now, mesh.width, mesh.height);

    for (let i = 0; i < 200; i += 20) {
      console.log("Temperature: " + i + " " + weatherData.temperature[i]);
      console.log("Precipitation: " + i + " " + weatherData.precipitation[i]);
    }


    // Same as terrain cells; one weatherData for each cell - this mayyyy be very slow
    const weatherMapping = new Float32Array(2 * mesh.width * mesh.height);
    for (let i = 0; i < mesh.width * mesh.height; ++i) {
      weatherMapping.set([weatherData.temperature[i]], 2 * i);
      weatherMapping.set([weatherData.precipitation[i]], 2 * i + 1);
    }
    // I have not actually bound this yet
    device.queue.writeBuffer(
      weatherBuffer,
      0,
      weatherMapping.buffer,
      weatherMapping.byteOffset,
      weatherMapping.byteLength
    )

    if (now % 1000 > 998)
    {
      // let weatherData = await getWeatherData(now, mesh.width, mesh.height);
      
      // for (let i = 0; i < 10; i++) {
      //   console.log("now: " + now);
      //   console.log("day of year: " + getDayOfYear(now));
      //   console.log("weather for cell: " + (i * 20));
        // console.log("temperature: " + weatherData.temperature[i * 20]);
        // console.log("temperature: " + weatherData.temperature[20]);
      //   console.log("precipitation: " + weatherData.precipitation[i * 20]);
      // }
    }

    device.queue.writeBuffer(
      simulationUBOBuffer,
      0,
      new Float32Array([
        simulationParams.simulate ? simulationParams.deltaTime : 0.0,
        0.0,
        0.0,
        0.0, // padding
        Math.random() * 100,
        Math.random() * 100, // seed.xy
        1 + Math.random(),
        1 + Math.random(), // seed.zw
        weatherData.temperature[0], //TODO: how to bind weather Data per frame
        weatherData.precipitation[0], //TODO: how to bind weather Data per frame
        0.0,
        0.0,//padding
      ])
    );

    mat4.identity(view);
    mat4.translate(view, vec3.fromValues(0, 0, -3), view);
    mat4.rotateX(view, Math.PI * -0.2, view);
    mat4.multiply(projection, view, mvp);

    const cameraViewProj = getModelViewProjectionMatrix(deltaTime);
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      cameraViewProj.buffer,
      cameraViewProj.byteOffset,
      cameraViewProj.byteLength
    )

    // prettier-ignore
    device.queue.writeBuffer(
      uniformBuffer,
      64,
      new Float32Array([
        // modelViewProjectionMatrix
        // mvp[0], mvp[1], mvp[2], mvp[3],
        // mvp[4], mvp[5], mvp[6], mvp[7],
        // mvp[8], mvp[9], mvp[10], mvp[11],
        // mvp[12], mvp[13], mvp[14], mvp[15],

        view[0], view[4], view[8], // right

        0, // padding

        view[1], view[5], view[9], // up

        0, // padding
      ])
    );
    const swapChainTexture = context.getCurrentTexture();
    // prettier-ignore
    renderPassDescriptor.colorAttachments[0].view = swapChainTexture.createView();

    const commandEncoder = device.createCommandEncoder();
    {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, computeBindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(mesh.width / 8),Math.ceil(mesh.height / 8));
      passEncoder.end();
    }
    {
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setIndexBuffer(indexBuffer, 'uint16');
      passEncoder.drawIndexed(indexCount);
      passEncoder.end();
    }

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const Particles: () => JSX.Element = () =>
  makeSample({
    name: 'Particles',
    description:
      'This example demonstrates rendering of particles simulated with compute shaders.',
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './particle.wgsl',
        contents: particleWGSL,
        editable: true,
      },
      {
        name: './probabilityMap.wgsl',
        contents: probabilityMapWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default Particles;