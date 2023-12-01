const PI:f32=3.1415926;

//this is some constants values
struct SimulationCS {
    MeasurementAltitude: f32,
    TSnowA:f32,
    TSnowB:f32,
    TMeltA:f32,
    TMeltB:f32,
    k_e:f32,
    k_m:f32,
};


const SimulationCSConstants: SimulationCS = SimulationCS(0.0,0.0,0.0,2.0,-5.0,-2.0,0.2,4.0);

//this is time variables
struct SimulationCSVar {
    Timesteps: i32,
    CurrentSimulationStep: i32,
    HourOfDay:i32,
    DayOfYear:i32,
};

const SimulationCSVariables: SimulationCSVar = SimulationCSVar(0,0,0,0);
//const SimulationCSVariables={};
struct WeatherData
{
	Temperature:f32,
	Precipitation:f32,
};

const WeatherDataBuffer: WeatherData = WeatherData(0.0,0.0);

struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3<f32>,
}

struct Model {
  modelMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

fn Func2(L: f32, D: f32) -> f32 {
    return acos(clamp(-tan(L) * tan(D), -1.0, 1.0));
}

fn Func3(V: f32, W: f32, X: f32, Y: f32, R1: f32, D: f32) -> f32 {
    return R1 * (sin(D) * sin(W) * (X - Y) * (12.0 / PI) +
                 cos(D) * cos(W) * (sin(X + V) - sin(Y + V)) * (12.0 / PI));
}

fn SolarRadiationIndex(I: f32, A: f32, L0: f32, J: f32) -> vec2<f32> {
    var L1: f32 = acos(cos(I) * sin(L0) + sin(I) * cos(L0) * cos(A));
    var D1: f32 = cos(I) * cos(L0) - sin(I) * sin(L0) * cos(A);
    var L2: f32 = atan(sin(I) * sin(A) / (cos(I) * cos(L0) - sin(I) * sin(L0) * cos(A)));

    var D: f32 = 0.007 - 0.4067 * cos((J + 10.0) * 0.0172);
    var E: f32 = 1.0 - 0.0167 * cos((J - 3.0) * 0.0172);

    let R0: f32 = 1.95;
    var R1: f32 = 60.0 * R0 / (E * E);

    var T: f32;
    T = Func2(L1, D);
    var T7: f32 = T - L2;
    var T6: f32 = -T - L2;
    T = Func2(L0, D);
    var T1: f32 = T;
    var T0: f32 = -T;
    var T3: f32 = min(T7, T1);
    var T2: f32 = max(T6, T0);

    var T4: f32 = T2 * (12.0 / PI);
    var T5: f32 = T3 * (12.0 / PI);

    if (T3 < T2) {
        T2 = 0.0;
        T3 = 0.0;
    }

    T6 = T6 + PI * 2.0;

    var R4: f32;
    if (T6 < T1) {
        var T8: f32 = T6;
        var T9: f32 = T1;
        R4 = Func3(L2, L1, T3, T2, R1, D) + Func3(L2, L1, T9, T8, R1, D);
    } else {
        T7 = T7 - PI * 2.0;

        if (T7 > T0) {
            var T8: f32 = T0;
            var T9: f32 = T0;
            R4 = Func3(L2, L1, T3, T2, R1, D) + Func3(L2, L1, T9, T8, R1, D);
        } else {
            R4 = Func3(L2, L1, T3, T2, R1, D);
        }
    }

    var R3: f32 = Func3(0.0, L0, T1, T0, R1, D);

    return vec2<f32>(R4 / R3, 0.0);
}

@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uvs: vec2<f32>,
  @location(3) Aspect: f32,
  @location(4) Inclination: f32,
  @location(5) Altitude: f32,
  @location(6) Latitude: f32,
  @location(7) Area: f32,
  @location(8) AreaXY: f32,
  @location(9) SnowWaterEquivalent: f32,
  @location(10) InterpolatedSWE: f32,
  @location(11) SnowAlbedo: f32,
  @location(12) DaysSinceLastSnowfall: f32,
  @location(13) Curvature: f32,
) -> @builtin(position) vec4<f32> {
  var areaSquareMeters:f32 = AreaXY / (100 * 100); // m^2

  //for (var time:i32 = 0; time < SimulationCSVariables.Timesteps; time=time+1) {
      var stationAltitudeOffset:f32 = Altitude - SimulationCSConstants.MeasurementAltitude;
      var temperatureLapse:f32 = - (0.5 * stationAltitudeOffset) / (100 * 100);

      var tAir:f32= WeatherDataBuffer.Temperature + temperatureLapse; // degree Celsius

      var precipitationLapse:f32= 10.0 / 24.0 * stationAltitudeOffset / (100 * 1000);
      // const precipitationLapse: number = 0;
      var precipitation:f32 = WeatherDataBuffer.Precipitation;

      DaysSinceLastSnowfall += 1.0 / 24.0;

      // Apply precipitation
      if (precipitation > 0) {
          precipitation += precipitationLapse;
          DaysSinceLastSnowfall = 0;

          // New snow/rainfall
          let rain: boolean = tAir > SimulationCSConstants.TSnowB;

          if (tAir > SimulationCSConstants.TSnowB) {
              SnowAlbedo = 0.4; // New rain drops the albedo to 0.4
          } else {
              // Variable lapse rate as described in "A variable lapse rate snowline model for the Remarkables, Central Otago, New Zealand"
              let snowRate= max(0, 1 - (tAir - SimulationCSConstants.TSnowA) / (SimulationCSConstants.TSnowB - SimulationCSConstants.TSnowA));

              SnowWaterEquivalent += (precipitation * areaSquareMeters * snowRate); // l/m^2 * m^2 = l
              SnowAlbedo = 0.8; // New snow sets the albedo to 0.8
          }
      }
      
      // Apply melt
      if (SnowWaterEquivalent > 0) {
          if (DaysSinceLastSnowfall >= 0) {
              // @TODO is time T the degree-days or the time since the last snowfall?
              SnowAlbedo = 0.4 * (1 + exp(-SimulationCSConstants.k_e * DaysSinceLastSnowfall));
          }

          // Temperature higher than melt threshold and cell contains snow
          if (tAir > SimulationCSConstants.TMeltA) {
              let dayNormalization: number = 1.0 / 24.0; // day

              let T4: number;
              let T5: number;

              // Radiation Index
              let r_i: number = SolarRadiationIndex(Inclination, Aspect, Latitude, SimulationCSVariables.DayOfYear, T4, T5); // 1

              // Diurnal approximation
              let t: number = SimulationCSVariables.HourOfDay;
              let D: number = abs(T4) + abs(T5);
              let r_i_t: number = max(PI * r_i / 2 * sin(PI * t / D - abs(T4) / PI), 0);

              // Melt factor
              // @TODO melt factor test
              let vegetationDensity: number = 0;
              let k_v: number = exp(-4 * vegetationDensity); // 1
              let c_m: number = SimulationCSConstants.k_m * k_v * r_i_t * (1 - SnowAlbedo) * dayNormalization * areaSquareMeters; // l/m^2/C�/day * day * m^2 = l/m^2 * 1/day * day * m^2 = l/C�
              let meltFactor: number = tAir < SimulationCSConstants.TMeltB ?
                  (tAir - SimulationCSConstants.TMeltA) * (tAir - SimulationCSConstants.TMeltA) / (SimulationCSConstants.TMeltB - SimulationCSConstants.TMeltA) :
                  (tAir - SimulationCSConstants.TMeltA);

              let m: number = c_m * meltFactor; // l/C� * C� = l

              // Apply melt
              SnowWaterEquivalent -= m;
            SnowWaterEquivalent = max(0.0, SnowWaterEquivalent);
        }
      }
  //}
  
  return vec4(position, 1.0);

  //return scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  //return model.modelMatrix * vec4(position, 1.0);
}
