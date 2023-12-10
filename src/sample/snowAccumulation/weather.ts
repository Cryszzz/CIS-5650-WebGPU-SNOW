import { createNoise2D } from 'simplex-noise';
import { timeToHours, getDayOfYear } from '../../meshes/utils';
// import alea from 'alea'

const probabilities = {
  p_ww: 0.75, // Probability of a wet after wet day
  p_wd: 0.4, // Probability of a wet after dry day
  p_i_w: 0.6, // Probability of initial wet day
};

// const resolution = 10;
const noise = createNoise2D();
let Alea = require('alea');

let currTime = -1;
let currState = '';

const day = 1000;
const hour = day * 24;

// export async function getWeatherData(time: number, width: number, height: number) {
export const getWeatherData = (time: number, width: number, height: number) => {
  const deltaTime = (currTime === -1) ? hour : (time - currTime);
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

  //console.log("weather point 1");

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
        //console.log("weather point 2");
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

