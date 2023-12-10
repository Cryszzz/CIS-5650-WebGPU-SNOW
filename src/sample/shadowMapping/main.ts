import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
//import { renderSkybox } from './skyboxPipeline';
import { cubeVertexArray, cubeVertexSize, cubeUVOffset, cubePositionOffset, cubeVertexCount } from '../../meshes/cube';
import basicVertWGSL from '../../shaders/basic.vert.wgsl';


import particleWGSL from './particle.wgsl';
import probabilityMapWGSL from './probabilityMap.wgsl';
import { getTerrainMesh, getTerrainCells } from '../../meshes/terrain';
import { getSquareMesh} from '../../meshes/square';
import { WASDCamera, cameraSourceInfo } from './camera';
import { createInputHandler, inputSourceInfo } from './input';
import { getWeatherData } from './weather';
import { getDayOfYear, getHourOfDay,degreesToRadians, timeToDays, timeToHours, getNumHoursPassed, getNumDaysPassed} from '../../meshes/utils';
import { computeSnowCPU } from './snowCompute';
import { max } from 'wgpu-matrix/dist/2.x/vec2-impl';
import { getHeightData, numberArray } from '../../meshes/geotiff-utils';


/*async function createSkyboxPipeline(device, presentationFormat)  {
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
async function loadCubemapTexture(device) {
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
*/
const numParticles = 0;
const particlePositionOffset = 0;
const particleColorOffset = 4 * 4;
const particleInstanceByteSize =
  3 * 4 + // position
  1 * 4 + // lifetime
  4 * 4 + // color
  3 * 4 + // velocity
  1 * 4 + // padding
  0;

const cellInstanceByteSize =
  11 * 4 + // data
  1 * 4 + // padding
  0;

const cameraDefaults = {
  position: vec3.create(0, 300, -80),
  target: vec3.create(0, 0, 0),
  // position: vec3.create(0, 5, -5),
  // target: vec3.create(0, 0, 0),
};


function setCamera(position?, target?)
{
  const initialCameraPosition = position ? position : cameraDefaults.position;
  const initialCameraTarget = target ? target : cameraDefaults.target;
  return new WASDCamera({ position: initialCameraPosition, target: initialCameraTarget });
}

//let skyboxPipeline, skyboxVerticesBuffer, skyboxUniformBuffer, skyboxUniformBindGroup;
const init: SampleInit = async ({ canvas, pageState, gui, stats }) => {
 
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  stats.showPanel(0);
 
  // The input handler
  const inputHandler = createInputHandler(window, canvas);

  // Camera initialization
  let camera = setCamera();
  let guiTemperature = 0.0;
  let guiPrecipitation = 0.0;

  const cameraParams = 
  {
    resetCamera() {
      camera = setCamera();
    }
  };

  const weatherParams = 
  {
    guiTemperature: guiTemperature,
    guiPrecipitation: guiPrecipitation,
    useGuiWeather: true,
  }

  const statsParams =
  {
    showStats: true,
    showMemoryUsage: false,
  }

  gui.add(cameraParams, 'resetCamera').name("Reset Camera");
  gui.add(weatherParams, 'guiTemperature', -50.0, 70.0).name("Temperature");
  let precipController = gui.add(weatherParams, 'guiPrecipitation', 0.0, 2.5).name("Precipitation");
  gui.add(weatherParams, 'useGuiWeather').name("Use Gui Weather");
  precipController = precipController.step(0.1);

  gui.add(statsParams, 'showStats').name("Show Stats");
  gui.add(statsParams, 'showMemoryUsage').name("Memory Usage");

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  
  // Setup skybox pipeline here
  //skyboxPipeline = await createSkyboxPipeline(device, presentationFormat);
  // Initialize the skybox pipeline
  //const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  /*
    // Initialize the skybox pipeline
    const skyboxPipeline = await createSkyboxPipeline(device, presentationFormat);

    // Initialize the vertex buffer for the skybox
    console.log("binding for skybox vertex buffer");
    const skyboxVerticesBuffer = device.createBuffer({
      size: cubeVertexArray.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(skyboxVerticesBuffer.getMappedRange()).set(cubeVertexArray);
    skyboxVerticesBuffer.unmap();
    console.log("done for binding for skybox vertex buffer");
    // Initialize the uniform buffer for the skybox
    const skyboxUniformBuffer = device.createBuffer({
      size: 16 * 4,  // Size for 2 4x4 matrices (view and projection)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  
    // Load the cubemap texture for the skybox
    const cubemapTexture = await loadCubemapTexture(device);
  
    // Create a sampler for the cubemap texture
    const cubemapSampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      addressModeW: 'clamp-to-edge',
    });
  
    // Initialize the uniform bind group for the skybox
    const skyboxUniformBindGroup = device.createBindGroup({
      layout: skyboxPipeline.getBindGroupLayout(0),
      label: "skybox group",
      entries: [
        { binding: 0, resource: { buffer: skyboxUniformBuffer,size: 4*16,} },
        { binding: 1, resource: cubemapSampler },
        { binding: 2, resource: cubemapTexture.createView({
          dimension: 'cube',
        }) },
      ],
    });
    console.log(skyboxUniformBindGroup);
  */

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
  const smesh=await getSquareMesh();
  const terrainCells = await getTerrainCells(mesh);
  console.log(terrainCells.Size);
  
  const terrainCellsDebugIndex = [11 * mesh.width + 6, 11 * mesh.width + 7, 9 * mesh.width + 15,
                                  9 * mesh.width + 16, 9 * mesh.width + 17, 9 * mesh.width + 18,
                                  11 * mesh.height + 6, 11 * mesh.height + 7, 9 * mesh.height + 15,
                                  9 * mesh.height + 16, 9 * mesh.height + 17, 9 * mesh.height + 18,]

  // for (let i = 0; i < 580; i += 20) {
  for (let i = 0; i < terrainCellsDebugIndex.length; i++) {
    const currIndex = terrainCellsDebugIndex[i];
    console.log("Terrain Cell: " + currIndex)
    // console.log("P0: " + i + " " + terrainCells.P0[i]);
    // console.log("P1: " + i + " " + terrainCells.P1[i]);
    // console.log("P2: " + i + " " + terrainCells.P2[i]);
    // console.log("P3: " + i + " " + terrainCells.P3[i]);
    console.log("Aspect: " + " " + terrainCells.Aspect[currIndex]);
    console.log("Inclination: " + " " + terrainCells.Inclination[currIndex]);
    console.log("Altitude: " + " " + terrainCells.Altitude[currIndex]);
    // console.log("Latitude: " + i + " " + terrainCells.Latitude[i]);
    console.log("Area: " + " " + terrainCells.Area[currIndex]);
    console.log("AreaXZ: " + " " + terrainCells.AreaXZ[currIndex]);
    // console.log("SnowWaterEquivalent: " + i + " " + terrainCells.SnowWaterEquivalent[i]);
    // console.log("InterpolatedSWE: " + i + " " + terrainCells.InterpolatedSWE[i]);
    // console.log("SnowAlbedo: " + i + " " + terrainCells.SnowAlbedo[i]);
    // console.log("DaysSinceLastSnowfall: " + i + " " + terrainCells.DaysSinceLastSnowfall[i]);
    // console.log("Curvature: " + i + " " + terrainCells.Curvature[i]);
  // }
  }
  const cellBuffer = device.createBuffer({
    size: terrainCells.Size * cellInstanceByteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  {
    const mapping = new Float32Array(cellBuffer.getMappedRange());
    for (let i = 0; i < terrainCells.Size; i++){
      mapping.set([
        terrainCells.Aspect[i],
        terrainCells.Inclination[i],
        terrainCells.Altitude[i],
        terrainCells.Latitude[i],
        terrainCells.Area[i],
        terrainCells.AreaXZ[i],
        terrainCells.SnowWaterEquivalent[i],
        terrainCells.InterpolatedSWE[i],
        terrainCells.SnowAlbedo[i],
        terrainCells.DaysSinceLastSnowfall[i],
        terrainCells.Curvature[i],
        0.0,
      ],i*12);
    }
    cellBuffer.unmap();
  }
      
    const maxBuffer = device.createBuffer({
      size: 4 * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      // mappedAtCreation: true,
    });
    // {
    //   const mapping = new Int32Array(maxBuffer.getMappedRange());
    //   mapping.set([0,0,0,0]);
    //   maxBuffer.unmap();
    // }
  
  
  /*const indexCount = smesh.triangles.length * 3;
  console.log("buffer size"+indexCount * Uint16Array.BYTES_PER_ELEMENT);
  console.log("mesh.triangles.length: " + smesh.triangles.length)*/
  /*const indexBuffer = device.createBuffer({
    label: "index buffer",
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < smesh.triangles.length; ++i) {
      mapping.set(smesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
  }*/
  const vertexBuffer = device.createBuffer({
    label: "vertex buffer",
    size: smesh.positions.length * 6 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < smesh.positions.length; ++i) {
      mapping.set(smesh.positions[i], 6 * i);
      mapping.set(smesh.normals[i], 6 * i + 3);
      mapping.set(smesh.uvs[i], 6 * i+4);
    }
    vertexBuffer.unmap();
  }
  const vertexBuffers: Iterable<GPUVertexBufferLayout> = [
    {
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 6,
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
          format: 'float32',
        },
        {
          // uv
          shaderLocation: 2,
          offset: Float32Array.BYTES_PER_ELEMENT * 4,
          format: 'float32x2',
        },
      ],
    },
  ];

  // not needed
  // const renderPipelineBindGroupLayout = device.createBindGroupLayout({
  //   entries: [
  //     {
  //       binding: 0,
  //       visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
  //       buffer : {}
  //     },
  //     {
  //       binding: 1,
  //       visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
  //       texture: {}
  //     },
  //     {
  //       binding: 2,
  //       visibility: GPUShaderStage.FRAGMENT,
  //       texture: {}
  //     },
  //     {
  //       binding: 3,
  //       visibility: GPUShaderStage.FRAGMENT,
  //       buffer: {}
  //     },
  //   ],
  // });

  // const renderPipelineLayout = device.createPipelineLayout({
  //   bindGroupLayouts: [
  //     renderPipelineBindGroupLayout, // @group(0)
  //   ]
  // });

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
    size: [mesh.width-1, mesh.height-1, 1],
    format: 'rgba32float', // Adjust based on your requirements
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
  let cubeTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/file/k2-t.png');
    //const response = await fetch('../assets/img/Di-3d.png');
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
  /*let heightTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/file/height1.png');
    //const response = await fetch('../assets/img/Di-3d.png');
    const imageBitmap = await createImageBitmap(await response.blob());

    heightTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: heightTexture },
      [imageBitmap.width, imageBitmap.height]
    );
  }*/
  
  let heightTexture: GPUTexture;
  {
    //const response = await fetch('../assets/img/file/k2-h.tif');
    //const response = await fetch('../assets/img/Di-3d.png');
    //const url = '../assets/img/file/everest.tif';
    const url = '../assets/img/file/k2-h.tif';
    const heightData = await getHeightData(url);
    
    heightTexture = device.createTexture({
      size: [numberArray[0], numberArray[1],1],
      format: "r32float",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const arrayBuffer = new Float32Array(heightData);
    device.queue.writeTexture(
      { texture: heightTexture },
      heightData,
      {bytesPerRow:numberArray[0]*4},
      { width: numberArray[0], height: numberArray[1] }
    );
  }
  console.log("amount of mesh:"+(heightTexture.width-1)*(heightTexture.height-1));
  //heightTexture=cubeTexture;
  const uniformArray = new Float32Array([0.1, 0.1]);
  const gridBuffer = device.createBuffer({
    label: "Grid Uniforms",
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(gridBuffer, 0, uniformArray);
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
      {
        binding: 2,
        resource: cubeTexture.createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: gridBuffer,
        }
      },
      {
        binding: 4,
        resource: heightTexture.createView(),
      },
      {
        binding: 5,
        resource: {
          buffer: maxBuffer,
        }
      }
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

  /*Object.keys(simulationParams).forEach((k) => {
    gui.add(simulationParams, k);
  });*/

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
          buffer: cellBuffer,
          offset: 0,
          size: terrainCells.Size * cellInstanceByteSize,
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
            format: 'rgba32float',
            dimension: '2d',
          }
        ),
      },
      {
        binding: 4,
        resource: {
          buffer: maxBuffer,
        }
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
    5000.0
  );

  const modelViewProjectionMatrix = mat4.create();

  function getModelViewProjectionMatrix(deltaTime: number) {
    const viewMatrix = camera.update(deltaTime, inputHandler());
    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
    return modelViewProjectionMatrix as Float32Array;
  }

  let lastFrameMS = Date.now();
  let lastDayMS = Date.now()
  let weatherData = getWeatherData(lastFrameMS, 2, 2);

  function frame() {
    // Sample is no longer the active page.
    // console.log("loading");
    if (!pageState.active) return;
    const now = Date.now();
    const deltaTime = (now - lastFrameMS) / 1000;
    const deltaTimeFull = now - lastDayMS;
    lastFrameMS = now;
    if (statsParams.showStats)
    {
      if (statsParams.showMemoryUsage)
      {
        stats.showPanel(2);
      }
      else
      {
        stats.showPanel(0);
      }
    }
    else
    {
      stats.showPanel(3)
    }


    // Update camera
    const viewMatrix = camera.update(deltaTime, inputHandler());

    // Render skybox
    const skyboxViewMatrix = mat4.clone(viewMatrix);
    skyboxViewMatrix[12] = 0; // Remove translation component
    skyboxViewMatrix[13] = 0;
    skyboxViewMatrix[14] = 0;
    

    //const viewMatrix = camera.update(deltaTime, inputHandler());
    // Render the skybox
    //renderSkybox(device, canvas, viewMatrix, projectionMatrix);
    //TODO: how to bind weather Data per frame
    if (getNumDaysPassed(deltaTimeFull) >= 1 && !weatherParams.useGuiWeather)
    {
      console.log("day of year: " + getDayOfYear(now));
      lastDayMS = now;
      weatherData = getWeatherData(now, mesh.width, mesh.height);
      console.log("weatherData: " + weatherData.temperature[0] + " : " + weatherData.precipitation[0]);

    }

    if (now % 1000 > 998)
    {
      // weatherData = getWeatherData(now, mesh.width, mesh.height);
      
      // for (let i = 0; i < 10; i++) {
      //   console.log("now: " + now);
      //   console.log("day of year: " + getDayOfYear(now));
      //   console.lSog("weather for cell: " + (i * 20));
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
        weatherParams.useGuiWeather ? weatherParams.guiTemperature : weatherData.temperature[0], //TODO: bind weather Data temperature per frame
        weatherParams.useGuiWeather ? weatherParams.guiPrecipitation : weatherData.precipitation[0], //TODO: bind weather Data percipitation per frame
        //getHourOfDay(now),//padding
        //getDayOfYear(now),
        0.0,
        0.0,
      ])
    );
    // if (now % 1000 > 998)
    // {
    //   if (weatherParams.useGuiWeather)
    //   {
    //     console.log("use gui weather");
    //     computeSnowCPU(terrainCells, weatherParams.guiTemperature, weatherParams.guiPrecipitation)
    //   }
    //   else
    //   {
    //     computeSnowCPU(terrainCells);
    //   }
    // }

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

    let maxArray = new Uint32Array([0,0,0,0]);

    device.queue.writeBuffer(
      maxBuffer,
      0,
      maxArray.buffer,
      maxArray.byteOffset,
      maxArray.byteLength
    );
    
    const swapChainTexture = context.getCurrentTexture();
    // prettier-ignore
    renderPassDescriptor.colorAttachments[0].view = swapChainTexture.createView();
    
    if (statsParams.showStats) {
      stats.begin();
    }

      
    const commandEncoder = device.createCommandEncoder();
    
    {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, computeBindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil((mesh.width-1) / 8),Math.ceil((mesh.height-1) / 8));
      passEncoder.end();
    }
    {
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      //passEncoder.setIndexBuffer(indexBuffer, 'uint16');
      passEncoder.draw(6,(heightTexture.width-1)*(heightTexture.height-1));//(heightTexture.width-1)*(heightTexture.height-1)
      // passEncoder.setIndexBuffer(indexBuffer, 'uint16');
      // passEncoder.drawIndexed(indexCount);
      //renderSkybox(device, skyboxPipeline, skyboxVerticesBuffer, skyboxUniformBuffer, skyboxUniformBindGroup,passEncoder,cameraViewProj);
      passEncoder.end();
    }
    
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
    if (statsParams.showStats) {
      stats.end()
    }
  }
  requestAnimationFrame(frame);
};

const Particles: () => JSX.Element = () =>
  makeSample({
    name: 'Particles',
    description:
      'This example demonstrates rendering of particles simulated with compute shaders.',
    gui: true,
    stats: true,
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