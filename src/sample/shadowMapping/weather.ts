import { createNoise2D } from 'simplex-noise'
import { timeToHours, getDayOfYear } from '../../meshes/utils'
// import alea from 'alea'

const probabilities = {
  p_ww: 0.75, // Probability of a wet 
  p_wd: 0.1,
  p_i_w: 0.6,
};

// const resolution = 10;
const noise = createNoise2D();
var Alea = require('alea')

let currTime = -1;
let currState = '';

const day = 2000;
const hour = day / 24;

// export async function getWeatherData(time: number, width: number, height: number) {
export const getWeatherData = (time: number, width: number, height: number) => {
  let deltaTime = (currTime === -1) ? hour : (time - currTime);
  currTime = time;
  if (currState === '') {
    var state = Math.random() < probabilities.p_i_w ? 'wet' : 'dry';
  } else {
    var state = currState;
  }

  const temperatureNoiseScale = 0.01;
  let temperatureNoise: number[][] = [];
  for (let x = 0; x < width - 1; x++) {
    temperatureNoise[x] = [];
    for (let z = 0; z < height - 1; z++) {
      const noise_xz = 1 + noise(x * temperatureNoiseScale, z * temperatureNoiseScale);
      temperatureNoise[x][z] = noise_xz;
    }
  }

  console.log("weather point 1");

  let deltaTimeHours = Math.floor(timeToHours(deltaTime));
  let weatherData : {
    temperature: number[],
    precipitation: number[],
  } = {
    temperature: [],
    precipitation: [],
  };

  // this double loop was inside if (state === 'wet')
  let noiseMeasurement: number[][] = [];
  const precipitationNoiseScale = 0.01;
  for (let noiseX = 0; noiseX < width; noiseX++) {
    noiseMeasurement[noiseX] = [];
    for (let noiseY = 0; noiseY < height; noiseY++) {
      const precipitationNoise = createNoise2D(new Alea(time));
      const noise_xy = Math.max(0.9 * (1 + precipitationNoise(noiseX * precipitationNoiseScale, noiseY * precipitationNoiseScale)) + 0.2, 0);
      noiseMeasurement[noiseX][noiseY] = noise_xy;
    }
  }

  // there should be another loop here but its already horribly inefficient..
  // for (let hour = 0; hour < deltaTimeHours; hour++) 
  for (let x = 0; x < width - 1; x++) {
    for (let z = 0; z < height - 1; z++) {
      let precipitation = 0;
      if (x === 0 && z === 0 || x == width - 2 && z == height - 2)
      {
        console.log("weather point 2");
      }

      // calculate precipitation
      if (state === 'wet') {
        // double loop was here before
        const rainFallMM = 2.5 * Math.exp(2.5 * Math.random()) / 24;
        precipitation = rainFallMM * noiseMeasurement[x][z];
      }

      if (x === 0 && z === 0 && x == width - 2 && z == height - 2)
      {
        console.log("weather point 3");
      }

      // calculate temperature
      let seasonalOffset = -Math.cos(getDayOfYear(time) * 2 * Math.PI / 365) * 9 + (Math.random() - 0.5);
      const baseTemperature = 10;
      const overcastTemperatureOffset = state === 'wet' ? -8 : 0;
      const temperature = baseTemperature + seasonalOffset + overcastTemperatureOffset + temperatureNoise[x][z];

      weatherData.temperature[x * height + z] = temperature;
      weatherData.precipitation[x * height + z] = precipitation;
    }
  }

  if (state === 'wet') {
    currState = (Math.random() < probabilities.p_ww) ? 'wet' : 'dry';
  } else if (state === 'dry') {
    currState = (Math.random() < probabilities.p_wd) ? 'wet' : 'dry';
  } else {
    currState = 'dry';
  }

  return weatherData;
}


// class TerrainCell {
//   P0: [number, number, number] = [0, 0, 0];
//   P1: [number, number, number] = [0, 0, 0];
//   P2: [number, number, number] = [0, 0, 0];
//   P3: [number, number, number] = [0, 0, 0];
//   Aspect: number = 0;
//   Inclination: number = 0;
//   Altitude: number = 0;
//   Latitude: number = 0;
//   Area: number = 0;
//   AreaXY: number = 0;
//   SnowWaterEquivalent: number = 0;
//   InterpolatedSWE: number = 0;
//   SnowAlbedo: number = 0;
//   DaysSinceLastSnowfall: number = 0;
//   Curvature: number = 0;

//   constructor(data?: {
//       P1?: [number, number, number];
//       P2?: [number, number, number];
//       P3?: [number, number, number];
//       P4?: [number, number, number];
//       Aspect?: number;
//       Inclination?: number;
//       Altitude?: number;
//       Latitude?: number;
//       Area?: number;
//       AreaXY?: number;
//       SnowWaterEquivalent?: number;
//       InterpolatedSWE?: number;
//       SnowAlbedo?: number;
//       DaysSinceLastSnowfall?: number;
//       Curvature?: number;
//   }) {
//       if (data) {
//           // If data is provided, initialize properties with provided values
//           this.P0 = data.P1 ?? [0, 0, 0];
//           this.P1 = data.P2 ?? [0, 0, 0];
//           this.P2 = data.P3 ?? [0, 0, 0];
//           this.P3 = data.P4 ?? [0, 0, 0];
//           this.Aspect = data.Aspect ?? 0;
//           this.Inclination = data.Inclination ?? 0;
//           this.Altitude = data.Altitude ?? 0;
//           this.Latitude = data.Latitude ?? 0;
//           this.Area = data.Area ?? 0;
//           this.AreaXY = data.AreaXY ?? 0;
//           this.SnowWaterEquivalent = data.SnowWaterEquivalent ?? 0;
//           this.InterpolatedSWE = data.InterpolatedSWE ?? 0;
//           this.SnowAlbedo = data.SnowAlbedo ?? 0;
//           this.DaysSinceLastSnowfall = data.DaysSinceLastSnowfall ?? 0;
//           this.Curvature = data.Curvature ?? 0;
//       }
//   }
// }

// // class TerrainCellArray {
// //   private cells: TerrainCell[] = [];

// //   constructor(size: number);
// //   constructor(data: TerrainCell[]);
// //   constructor(size: number | TerrainCell[]) {
// //     // Initialize TerrainCellArray with size TerrainCell objects, all values set to 0
// //     if (typeof size === 'number') {
// //       this.cells = new Array(size).fill(undefined).map(() => new TerrainCell());
// //     }
// //     // Initialize TerrainCellArray with provided data
// //     else {
// //       this.cells = size;
// //     }
// //   }

// //   getLength(): number {
// //     return this.cells.length;
// //   }

// //   getByteLength(): number {
// //     const elementSize = Float32Array.BYTES_PER_ELEMENT * Object.keys(new TerrainCell()).length;
// //     return this.cells.length * elementSize;
// //   }

// //   getCell(index: number): TerrainCell | undefined {
// //     return this.cells[index];
// //   }
// // }

// class WeatherData {
//   Temperature: number;
//   Precipitation: number;

//   constructor(data?: { Temperature?: number; Precipitation?: number }) {
//     if (data) {
//       // If data is provided, initialize properties with provided values
//       this.Temperature = data.Temperature ?? 0;
//       this.Precipitation = data.Precipitation ?? 0;
//     } 
//   }
// }

// class WeatherDataArray {
//   private data: WeatherData[] = [];

//   constructor(size: number);
//   constructor(data: WeatherData[]);
//   constructor(arg: number | WeatherData[]) {
//       // Initialize WeatherDataArray with size WeatherData objects, all values set to 0
//       if (typeof arg === 'number') {
//           this.data = new Array(arg).fill(undefined).map(() => new WeatherData());
//       }
//       // Initialize WeatherDataArray with provided data
//       else {
//           this.data = arg;
//       }
//   }

//   getLength(): number {
//       return this.data.length;
//   }

//   getByteLength(): number {
//       const elementSize = Float32Array.BYTES_PER_ELEMENT * Object.keys(new WeatherData()).length;
//       return this.data.length * elementSize;
//   }
// }

// class SolarRadiation {
//   sunrise: number;
//   sunset: number;
//   ri: number;

//   constructor();
//   constructor(data: { sunrise: number; sunset: number; ri: number });
//   constructor(data?: { sunrise: number; sunset: number; ri: number }) {
//       this.sunrise = data?.sunrise ?? 0;
//       this.sunset = data?.sunset ?? 0;
//       this.ri = data?.ri ?? 0;
//   }

//   static getPropertyCount(): number {
//     return Object.keys(new SolarRadiation()).length;
//   }

//   getByteLength(): number {
//       const elementSize = Float32Array.BYTES_PER_ELEMENT * SolarRadiation.getPropertyCount();
//       return elementSize;
//   }
// }