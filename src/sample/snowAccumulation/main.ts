import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { renderSkybox } from './skyboxPipeline';
import { cubeVertexArray, cubeVertexSize, cubeUVOffset, cubePositionOffset, cubeVertexCount } from '../../meshes/cube';
import { createSkyboxPipeline, loadCubemapTexture } from './skyboxPipeline';


import particleWGSL from './particle.wgsl';
import { getTerrainMesh, getTerrainCells } from '../../meshes/terrain';
import { getSquareMesh} from '../../meshes/square';
import { WASDCamera, cameraSourceInfo } from './camera';
import { createInputHandler, inputSourceInfo } from './input';
import { getWeatherData } from './weather';
import { getDayOfYear, getHourOfDay,degreesToRadians, timeToDays, timeToHours, getNumHoursPassed, getNumDaysPassed, getMin} from '../../meshes/utils';
import { computeSnowCPU } from './snowCompute';
import { max } from 'wgpu-matrix/dist/2.x/vec2-impl';
import { getHeightData, numberArray } from '../../meshes/geotiff-utils';

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
  position: vec3.create(-70, 300, -80),
  target: vec3.create(-160, 340, -100),
  // position: vec3.create(0, 5, -5),
  // target: vec3.create(0, 0, 0),
};


function setCamera(position?, target?)
{
  const initialCameraPosition = position ? position : cameraDefaults.position;
  const initialCameraTarget = target ? target : cameraDefaults.target;
  return new WASDCamera({ position: initialCameraPosition, target: initialCameraTarget });
}

function resetTerrainBufferMapping(device, cellArray, cellBuffer)
{
  device.queue.writeBuffer(
    cellBuffer,
    0,
    cellArray.buffer,
    cellArray.byteOffset,
    cellArray.byteLength
  );
}


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
  let guiPrecipitation = 0.0;

  const resetParams: any = 
  {
    resetCamera() {
      camera = setCamera();
    },
  };

  const terrainOptions = {
    k2Terrain: {
      name: "K2",
      terrainFilename: "../assets/img/file/k2-h.tif",
      textureFilename: "../assets/img/file/k2-t.png",
      configurationParams: {
        posNormalizeFactor: 5000000.0, //done
        posMax: 150.0, //done
        colorMaxScaleFactor: 0.64, //done
        areaScaleFactor: 100.0, //done
        r_i_tScaleFactor: 0.82, //done
        k_mScaleFactor: 2.5, //done
        meltFactor: 5.5, //done
        maxSWE: 250000.0, //done
        temperatureLapseNormalizeFactor: 20.0, //done
        precipitationLapseNormalizeFactor: 20.0, //done
        heightMul: 0.05, //done
        gridSize: 0.3, //done
        terrainSkip: 3, //done
        terrainDataNormalizeFactor: 10.0, //done
        defaultTemperature: 8.0, //done
      }
    },
    everestTerrain: {
      name: "Everest",
      terrainFilename: "../assets/img/file/everest.tif",
      textureFilename: "../assets/img/file/rock.png",
      configurationParams: {
        posNormalizeFactor: 5000000.0,
        posMax: 150.0,
        colorMaxScaleFactor: 0.64,
        areaScaleFactor: 100.0,
        r_i_tScaleFactor: 0.82,
        k_mScaleFactor: 2.0,
        meltFactor: 6.1,
        maxSWE: 250000.0,
        temperatureLapseNormalizeFactor: 20.0,
        precipitationLapseNormalizeFactor: 20.0,
        heightMul: 0.01, 
        gridSize: 0.1, 
        terrainSkip: 3,
        terrainDataNormalizeFactor: 10.0,
        defaultTemperature: 8.0,
      }
    },
  };

  const terrainParams = {
    terrain: terrainOptions.k2Terrain,
  }

  const weatherParams = 
  {
    guiTemperature: terrainParams.terrain.configurationParams.defaultTemperature,
    guiPrecipitation: guiPrecipitation,
    useGuiWeather: true,
  }

  const statsParams =
  {
    showStats: true,
    showMemoryUsage: false,
  }

  const constantsParams = 
  {
    measurementAltitude: 0.0,
    tSnowA: 0.0,
    tSnowB: 2.0,
    tMeltA: -5.0,
    tMeltB: -2.0,
    k_e: 0.2,
    k_m: terrainParams.terrain.configurationParams.k_mScaleFactor,
    meltFactor: terrainParams.terrain.configurationParams.meltFactor,
    timesteps: 0.0,
    currentSimulationStep: 0.0,
    hourOfDay: 12.0,
    dayOfYear: 251.0, // TODO: pre-defined weather values for a year simulation
  }

  const sizeParams = 
  {
    heightMul: terrainParams.terrain.configurationParams.heightMul,
    gridSize: terrainParams.terrain.configurationParams.gridSize,
  }

  let activeTerrain = terrainOptions.k2Terrain;


  var resetFolder = gui.addFolder('Reset');
  resetFolder.open();
  resetFolder.add(resetParams, 'resetCamera').name("Reset Camera");

  var terrainFolder = gui.addFolder('Terrain');
  terrainFolder.open();


  var weatherFolder = gui.addFolder('Weather');
  weatherFolder.open();
  let temperatureController = weatherFolder.add(weatherParams, 'guiTemperature', -10.0, 30.0).name("Temperature");
  let precipController = weatherFolder.add(weatherParams, 'guiPrecipitation', 0.0, 1.5).name("Precipitation").step(0.01);
  weatherFolder.add(weatherParams, 'useGuiWeather').name("Use Gui Weather");
  // precipController = precipController.step(0.1);

  var statsFolder = gui.addFolder('Stats');
  statsFolder.open();
  statsFolder.add(statsParams, 'showStats').name("Show Stats");
  statsFolder.add(statsParams, 'showMemoryUsage').name("Memory Usage");

  var constantsFolder = gui.addFolder('Simulation Constants');
  constantsFolder.open();
  constantsFolder.add(constantsParams, 'measurementAltitude', 0.0, 10000.0).name("Measurement Altitude");
  constantsFolder.add(constantsParams, 'tSnowA', -5.0, 5.0).name("Temp Snow A").step(0.5);
  constantsFolder.add(constantsParams, 'tSnowB', -5.0, 5.0).name("Temp Snow B").step(0.5);
  constantsFolder.add(constantsParams, 'tMeltA', -10.0, 5.0).name("Temp Melt A").step(0.5);
  constantsFolder.add(constantsParams, 'tMeltB', -10.0, 5.0).name("Temp Melt B").step(0.5);
  constantsFolder.add(constantsParams, 'k_e', 0.0, 1.0).name("k_e").step(0.1);
  constantsFolder.add(constantsParams, 'k_m', 0.0, 10.0).name("k_m").step(0.5);
  constantsFolder.add(constantsParams, 'meltFactor', 0.0, 10.0).name("Melt Factor").step(0.1);
  constantsFolder.add(constantsParams, 'timesteps', 0.0, 100.0).name("Timesteps").step(1.0);
  constantsFolder.add(constantsParams, 'currentSimulationStep', 0.0, 100.0).name("Curr Step").step(1.0);
  constantsFolder.add(constantsParams, 'hourOfDay', 0.0, 24.0).name("Hour of Day").step(0.5);
  constantsFolder.add(constantsParams, 'dayOfYear', 0.0, 365.0).name("Day of Year").step(1.0);

  var sizeFolder = gui.addFolder('Size');
  sizeFolder.open();
  sizeFolder.add(sizeParams, 'heightMul', 0.0, 0.1).name("Height Multiplier").step(0.002);
  sizeFolder.add(sizeParams, 'gridSize', 0.0, 1.0).name("Grid Size").step(0.01);


  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  
  // Setup skybox pipeline here
  //skyboxPipeline = await createSkyboxPipeline(device, presentationFormat);
  // Initialize the skybox pipeline
  //const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  
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
  
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const particlesBuffer = device.createBuffer({
    size: numParticles * particleInstanceByteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
  });

  

  let mesh=await getTerrainMesh(terrainParams.terrain.terrainFilename, terrainParams.terrain.configurationParams.terrainSkip, terrainParams.terrain.configurationParams.terrainDataNormalizeFactor);
  const smesh=await getSquareMesh();
  let terrainCells = await getTerrainCells(mesh);
  console.log(terrainCells.Size);


  // TODO: replace with a value in terrain mesh itself
  const minAltitude = getMin(terrainCells.Altitude);

  const terrainCellsDebugIndex = [11 * mesh.width + 6, 11 * mesh.width + 7, 9 * mesh.width + 15,
                                  9 * mesh.width + 16, 9 * mesh.width + 17, 9 * mesh.width + 18,
                                  110 * mesh.height + 60, 11 * mesh.height + 7, 9 * mesh.height + 15,
                                  9 * mesh.height + 16, 9 * mesh.height + 17, 9 * mesh.height + 18,
                                  30851, 30852, 30853]

  // // for (let i = 0; i < 580; i += 20) {
  for (let i = 0; i < terrainCellsDebugIndex.length; i++) {
    const currIndex = terrainCellsDebugIndex[i];
  //   console.log("Terrain Cell: " + currIndex)
  //   console.log("P0: " + " " + terrainCells.P0[currIndex]);
  //   console.log("P1: " + " " + terrainCells.P1[currIndex]);
  //   console.log("P2: " + " " + terrainCells.P2[currIndex]);
  //   console.log("P3: " + " " + terrainCells.P3[currIndex]);
  //   console.log("Aspect: " + " " + terrainCells.Aspect[currIndex]);
    console.log("Inclination: " + " " + terrainCells.Inclination[currIndex]);
  //   console.log("Altitude: " + " " + terrainCells.Altitude[currIndex]);
  //   // console.log("Latitude: " + i + " " + terrainCells.Latitude[i]);
  //   console.log("Area: " + " " + terrainCells.Area[currIndex]);
    console.log("AreaXZ: " + " " + terrainCells.AreaXZ[currIndex] * 100);
  //   // console.log("SnowWaterEquivalent: " + i + " " + terrainCells.SnowWaterEquivalent[i]);
  //   // console.log("InterpolatedSWE: " + i + " " + terrainCells.InterpolatedSWE[i]);
  //   // console.log("SnowAlbedo: " + i + " " + terrainCells.SnowAlbedo[i]);
  //   // console.log("DaysSinceLastSnowfall: " + i + " " + terrainCells.DaysSinceLastSnowfall[i]);
  //   console.log("Curvature: " + " " + terrainCells.Curvature[currIndex]);
  // // }
  }
  const cellBuffer = device.createBuffer({
    size: terrainCells.Size * cellInstanceByteSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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

  const cellArray = new Float32Array(terrainCells.Size * cellInstanceByteSize / 4);
  for (let i = 0; i < terrainCells.Size; i++){
    cellArray.set([
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

  resetParams.resetSimulation = function() {
    weatherParams.guiPrecipitation = 0.0;
    weatherParams.guiTemperature = terrainParams.terrain.configurationParams.defaultTemperature;
    precipController.updateDisplay();
    temperatureController.updateDisplay();
    resetTerrainBufferMapping(device, cellArray, cellBuffer);
  };
  resetFolder.add(resetParams, 'resetSimulation').name("Reset Simulation");

  const maxBuffer = device.createBuffer({
    size: 4 * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  
  
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
  console.log("writableTexture width: " + (mesh.width - 1) + " height: " + (mesh.height - 1));
  const uniformBufferSize =
    4 * 4 * 4 + // modelViewProjectionMatrix : mat4x4<f32>
    3 * 4 + // right : vec3<f32>
    4 + // padding
    3 * 4 + // up : vec3<f32>
    4 + // heightMul
    8 * 4 + //configurationCS
    0;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });



  // let cubeTexture: GPUTexture;
  // {
  //   const response = await fetch('../assets/img/file/k2-t.png');
  //   // const response = await fetch('../assets/img/Di-3d.png');
  //   const imageBitmap = await createImageBitmap(await response.blob());

  //   cubeTexture = device.createTexture({
  //     size: [imageBitmap.width, imageBitmap.height, 1],
  //     format: 'rgba8unorm',
  //     usage:
  //       GPUTextureUsage.TEXTURE_BINDING |
  //       GPUTextureUsage.COPY_DST |
  //       GPUTextureUsage.RENDER_ATTACHMENT,
  //   });
  //   device.queue.copyExternalImageToTexture(
  //     { source: imageBitmap },
  //     { texture: cubeTexture },
  //     [imageBitmap.width, imageBitmap.height]
  //   );
  // }
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
  async function setColorTexture(filename)
  {
    const response = await fetch(filename);
    const imageBitmap = await createImageBitmap(await response.blob());

    let cubeTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return { texture: cubeTexture, image: imageBitmap };
  }

  async function setHeightTexture(filename)
  {
    // const url = '../assets/img/file/k2-h.tif';
    const heightData = await getHeightData(filename);
    
    console.log("heightdata test");
    console.log("heightData: " + heightData[0]);

    let heightTextureSet = device.createTexture({
      size: [numberArray[0], numberArray[1],1],
      format: "r32float",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    // const arrayBuffer = new Float32Array(heightData);
    return { texture: heightTextureSet, data: heightData};
  }
  
  // let heightTexture: GPUTexture;
  // {

  let color = await setColorTexture('../assets/img/file/k2-t.png');
  device.queue.copyExternalImageToTexture(
    { source: color.image },
    { texture: color.texture },
    [color.image.width, color.image.height]
  );


  let height = await setHeightTexture('../assets/img/file/k2-h.tif');
  device.queue.writeTexture(
    { texture: height.texture },
    height.data,
    {bytesPerRow:numberArray[0]*4},
    { width: numberArray[0], height: numberArray[1] }
  );

  let heightChanged = false;
  let colorChanged = false;
  terrainFolder.add(terrainParams, 'terrain',Object.values(terrainOptions).map(option => option.name)).name("Select Terrain")
  .setValue(terrainOptions.k2Terrain.name)
  .onChange(async function (value) {
     terrainParams.terrain = Object.values(terrainOptions).find(option => option.name === value);
     mesh = await getTerrainMesh(terrainParams.terrain.terrainFilename, terrainParams.terrain.configurationParams.terrainSkip, terrainParams.terrain.configurationParams.terrainDataNormalizeFactor);
     terrainCells = await getTerrainCells(mesh);
     height = await setHeightTexture(terrainParams.terrain.terrainFilename);
     heightChanged = true;
     color = await setColorTexture(terrainParams.terrain.textureFilename);
     colorChanged = true;
     resetParams.resetSimulation();
    });
  // Can't get this to be set by default so doing it here
  terrainParams.terrain = terrainOptions.k2Terrain;

    // //const response = await fetch('../assets/img/file/k2-h.tif');
    // //const response = await fetch('../assets/img/Di-3d.png');
    // //const url = '../assets/img/file/everest.tif';
    // const url = '../assets/img/file/k2-h.tif';
    // const heightData = await getHeightData(url);
    
    // console.log("heightdata test");
    // console.log("heightData: " + heightData[0]);

    // heightTexture = device.createTexture({
    //   size: [numberArray[0], numberArray[1],1],
    //   format: "r32float",
    //   usage:
    //     GPUTextureUsage.TEXTURE_BINDING |
    //     GPUTextureUsage.COPY_DST |
    //     GPUTextureUsage.RENDER_ATTACHMENT,
    // });
    // const arrayBuffer = new Float32Array(heightData);
    // device.queue.writeTexture(
    //   { texture: heightTexture },
    //   heightData,
    //   {bytesPerRow:numberArray[0]*4},
    //   { width: numberArray[0], height: numberArray[1] }
    // );
  // }
  console.log("amount of mesh:"+(height.texture.width-1)*(height.texture.height-1));
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
        resource: color.texture.createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: gridBuffer,
        }
      },
      {
        binding: 4,
        resource: height.texture.createView(),
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
  // Simulation compute pipeline
  //////////////////////////////////////////////////////////////////////////////
  const simulationParams = {
    simulate: true,
    deltaTime: 0.04,
  };

  const simulationUBOBufferSize =
    7 * 4 + // simulationCS
    1 * 4 + // padding
    4 * 4 + // simulationCSVar
    8 * 4 + // configurationCS
    2 * 4 + // weatherData: temp+perci
    2 * 4 + // padding
    0;
  const simulationUBOBuffer = device.createBuffer({
    size: simulationUBOBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // let simulationFolder = gui.addFolder('Simulation');
  // Object.keys(simulationParams).forEach((k) => {
  //   simulationFolder.add(simulationParams, k);
  // });

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
        resource: color.texture.createView(),
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
    if (heightChanged)
    {
      device.queue.writeTexture(
        { texture: height.texture },
        height.data,
        {bytesPerRow:numberArray[0]*4},
        { width: numberArray[0], height: numberArray[1] }
      );
      heightChanged = false;
    }

    if (colorChanged)
    {
      device.queue.copyExternalImageToTexture(
        { source: color.image },
        { texture: color.texture },
        [color.image.width, color.image.height]
      );
      colorChanged = false;
    }

    device.queue.writeBuffer(
      simulationUBOBuffer,
      0,
      new Float32Array([
        minAltitude,
        constantsParams.tSnowA,
        constantsParams.tSnowB,
        constantsParams.tMeltA,
        constantsParams.tMeltB,
        constantsParams.k_e,
        constantsParams.k_m,
        constantsParams.meltFactor,
        constantsParams.timesteps,
        constantsParams.currentSimulationStep,
        constantsParams.hourOfDay,
        constantsParams.dayOfYear,
        terrainParams.terrain.configurationParams.posNormalizeFactor,
        terrainParams.terrain.configurationParams.posMax,
        terrainParams.terrain.configurationParams.colorMaxScaleFactor,
        terrainParams.terrain.configurationParams.areaScaleFactor,
        terrainParams.terrain.configurationParams.r_i_tScaleFactor,
        terrainParams.terrain.configurationParams.maxSWE,
        terrainParams.terrain.configurationParams.temperatureLapseNormalizeFactor,
        terrainParams.terrain.configurationParams.precipitationLapseNormalizeFactor,
        weatherParams.useGuiWeather ? weatherParams.guiTemperature : weatherData.temperature[0], //TODO: bind weather Data temperature per frame
        weatherParams.useGuiWeather ? weatherParams.guiPrecipitation : weatherData.precipitation[0], //TODO: bind weather Data percipitation per frame
        0.0,
        0.0,
      ])
    );
    // if (now % 1000 > 998)
    // {
    //   if (weatherParams.useGuiWeather)
    //   {
    //     console.log("use gui weather");
    //     computeSnowCPU(terrainCells, constantsParams, weatherParams.guiTemperature, weatherParams.guiPrecipitation);
    //   }
    //   else
    //   {
    //     computeSnowCPU(terrainCells, constantsParams);
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
        view[0], view[4], view[8], // right
        0, // padding
        view[1], view[5], view[9], // up
        sizeParams.heightMul, // heightMul
        terrainParams.terrain.configurationParams.posNormalizeFactor,
        terrainParams.terrain.configurationParams.posMax,
        terrainParams.terrain.configurationParams.colorMaxScaleFactor,
        terrainParams.terrain.configurationParams.areaScaleFactor,
        terrainParams.terrain.configurationParams.r_i_tScaleFactor,
        terrainParams.terrain.configurationParams.maxSWE,
        terrainParams.terrain.configurationParams.temperatureLapseNormalizeFactor,
        terrainParams.terrain.configurationParams.precipitationLapseNormalizeFactor,
      ])
    );

    device.queue.writeBuffer(gridBuffer, 0, new Float32Array([sizeParams.gridSize, sizeParams.gridSize]));


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
      passEncoder.draw(6,(height.texture.width-1)*(height.texture.height-1));//(heightTexture.width-1)*(heightTexture.height-1)
      renderSkybox(device, skyboxPipeline, skyboxVerticesBuffer, skyboxUniformBuffer, skyboxUniformBindGroup,passEncoder,cameraViewProj);
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
    name: 'snowAccmulation',
    description:
      'This is real-time snow accumulation on terrein based on real data',
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
    ],
    filename: __filename,
  });

export default Particles;