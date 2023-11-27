class TerrainCell {
  Aspect: number = 0;
  Inclination: number = 0;
  Altitude: number = 0;
  Latitude: number = 0;
  Area: number = 0;
  AreaXY: number = 0;
  SnowWaterEquivalent: number = 0;
  InterpolatedSWE: number = 0;
  SnowAlbedo: number = 0;
  DaysSinceLastSnowfall: number = 0;
  Curvature: number = 0;

  constructor(data?: {
      Aspect?: number;
      Inclination?: number;
      Altitude?: number;
      Latitude?: number;
      Area?: number;
      AreaXY?: number;
      SnowWaterEquivalent?: number;
      InterpolatedSWE?: number;
      SnowAlbedo?: number;
      DaysSinceLastSnowfall?: number;
      Curvature?: number;
  }) {
      if (data) {
          // If data is provided, initialize properties with provided values
          this.Aspect = data.Aspect ?? 0;
          this.Inclination = data.Inclination ?? 0;
          this.Altitude = data.Altitude ?? 0;
          this.Latitude = data.Latitude ?? 0;
          this.Area = data.Area ?? 0;
          this.AreaXY = data.AreaXY ?? 0;
          this.SnowWaterEquivalent = data.SnowWaterEquivalent ?? 0;
          this.InterpolatedSWE = data.InterpolatedSWE ?? 0;
          this.SnowAlbedo = data.SnowAlbedo ?? 0;
          this.DaysSinceLastSnowfall = data.DaysSinceLastSnowfall ?? 0;
          this.Curvature = data.Curvature ?? 0;
      }
  }
}

export class TerrainCellArray {
  private cells: TerrainCell[] = [];

  constructor(size: number);
  constructor(data: TerrainCell[]);
  constructor(size: number | TerrainCell[]) {
    // Initialize TerrainCellArray with size TerrainCell objects, all values set to 0
    if (typeof size === 'number') {
        this.cells = new Array(size).fill(undefined).map(() => new TerrainCell());
    }
    // Initialize TerrainCellArray with provided data
    else {
        this.cells = size;
    }
  }

  getLength(): number {
    return this.cells.length;
  }

  getByteLength(): number {
      const elementSize = Float32Array.BYTES_PER_ELEMENT * Object.keys(new TerrainCell()).length;
      return this.cells.length * elementSize;
  }

  getBuffer(): Float32Array {
    const buffer = new Float32Array(this.getByteLength() / Float32Array.BYTES_PER_ELEMENT);
    let offset = 0;

    for (const cell of this.cells) {
        // Iterate over each numeric property and set it in the buffer
        for (const key in cell) {
            if (typeof cell[key] === 'number') {
                buffer[offset++] = cell[key];
            }
        }
    }
    return buffer;
  }
}

class WeatherData {
  Temperature: number = 0;
  Precipitation: number = 0;

  constructor(data?: { Temperature?: number; Precipitation?: number }) {
    if (data) {
      // If data is provided, initialize properties with provided values
      this.Temperature = data.Temperature ?? 0;
      this.Precipitation = data.Precipitation ?? 0;
    } 
  }
}

export class WeatherDataArray {
  private data: WeatherData[] = [];

  constructor(size: number);
  constructor(data: WeatherData[]);
  constructor(size: number | WeatherData[]) {
      // Initialize WeatherDataArray with size WeatherData objects, all values set to 0
      if (typeof size === 'number') {
          this.data = new Array(size).fill(undefined).map(() => new WeatherData());
      }
      // Initialize WeatherDataArray with provided data
      else {
          this.data = size;
      }
  }

  getLength(): number {
      return this.data.length;
  }

  getByteLength(): number {
      const elementSize = Float32Array.BYTES_PER_ELEMENT * Object.keys(new WeatherData()).length;
      return this.data.length * elementSize;
  }

  getBuffer(): Float32Array {
    const buffer = new Float32Array(this.getByteLength() / Float32Array.BYTES_PER_ELEMENT);
    let offset = 0;

    for (const data of this.data) {
        // Iterate over each numeric property and set it in the buffer
        for (const key in data) {
            if (typeof data[key] === 'number') {
                buffer[offset++] = data[key];
            }
        }
    }
    return buffer;
  }
}

export class SolarRadiation {
  sunrise: number;
  sunset: number;
  ri: number;

  constructor();
  constructor(data: { sunrise: number; sunset: number; ri: number });
  constructor(data?: { sunrise: number; sunset: number; ri: number }) {
      this.sunrise = data?.sunrise ?? 0;
      this.sunset = data?.sunset ?? 0;
      this.ri = data?.ri ?? 0;
  }

  static getPropertyCount(): number {
    return Object.keys(new SolarRadiation()).length;
  }

  getByteLength(): number {
      const elementSize = Float32Array.BYTES_PER_ELEMENT * SolarRadiation.getPropertyCount();
      return elementSize;
  }
}