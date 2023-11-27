const WORKGROUP_SIZE = 8;
const TEMP_RAIN = 32.0;
const TEMP_MELT = 45.0;
const MAX_SNOW_VALUE = 250.0;

struct TerrainCell
{
  aspect: f32,
  inclination: f32,
  altitude: f32,
  latitude: f32,
  area: f32,
  area_xy: f32,
  snow_water_equivalent: f32,
  interpolated_swe: f32,
  snow_albedo: f32,
  days_since_last_snowfall: f32,
  curvature: f32
}

struct SolarRadiation
{
  sunrise: f32,
  sunset: f32,
  ri: f32
}

struct WeatherData
{
  temperature: f32,
  precipitation: f32
}

@group(0) @binding(0) var<uniform> grid_size: vec2f;

@group(0) @binding(1) var<storage> terrain_in: array<TerrainCell>;
@group(0) @binding(2) var<uniform> weather_data_in: array<WeatherData>;
@group(0) @binding(3) var<uniform> solar_radiation_in: SolarRadiation;

@group(0) @binding(4) var<storage, read_write> terrain_out: array<TerrainCell>;
@group(0) @binding(5) var texture_out: texture_storage_2d<rgba32f, read_write>;

fn temp_solar_radiation(altitude: f32, latitude: f32, day: f32) -> SolarRadiation {
  let declination = 23.45 * sin(2 * PI * (day + 10) / 365);
  let sunrise = 12 - acos(-tan(declination) * tan(latitude)) / (2 * PI) * 24;
  let sunset = 12 + acos(-tan(declination) * tan(latitude)) / (2 * PI) * 24;
  let ri = (sunset - sunrise) / 12;
  return SolarRadiation(sunrise, sunset, ri);
}

fn temp_simple_solar_radiation() ->SolarRadiation {
  return SolarRadiation(6.0, 18.0, 0.5);
}

fn interpolate_swe(swe: f32, curvature: f32) -> f32 {
  let f = inclination < 15 ? 0.0 : (inclination / 60);
  let a3 = 50.0;
  return max(0.0f, swe * (1 - f) * (1 + a3 * curvature));
}

fn cell_index(cell: vec2u) -> u32 {
  return cell.y * u32(grid_size.x) + cell.x;
}

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn compute_main(@builtin(global_invocation_id) cell: vec3u)
{
  let cell_index = cell_index(cell.xy);
  if (cell_index >= terrain_in.size()) {
    return;
  }

  let cell_in = terrain_in[cell_index];
  let cell_out = terrain_out[cell_index];
  let weather_data_cell = weather_data[cell_index];
  let tex_coord: vec2u = global_invocation_id.xy * workgroup_size.xy;

  if (weather_data_cell.precipitation > 0.0)
  {
    cell_out.days_since_last_snowfall = 0.0;
    if (weather_data_cell.temperature > TEMP_RAIN)
    {
      cell_out.snow_albedo = 0.4;
      cell_out.snow_water_equivalent = terrain_in.snow_water_equivalent;
    }
    else
    {
      cell_out.snow_albedo = terrain_in.snow_albedo; //unsure if needed
      cell_out.snow_water_equivalent = terrain_in.snow_water_equivalent 
                                      + weather_data_cell.precipitation * cell_in.area_xy;
    }
  }
  else
  {
    cell_out.snow_water_equivalent = cell_in.snow_water_equivalent;
    cell_out.days_since_last_snowfall = cell_in.days_since_last_snowfall + 1.0;
  }

  if (cell_out.snow_water_equivalent > 0.0)
  {
    if (cell_in.days_since_last_snowfall > 0.0)
    {
      cell_out.snow_albedo = 0.4 * (1 * exp(0.2 * cell_in.days_since_last_snowfall));
    }
    else
    {
      cell_out.snow_albedo = cell_in.snow_albedo;
    }

    if (weather_data_cell.temperature > TEMP_MELT)
    {
      let degree_day_factor = solar_radiation_in.ri * (1 - cell_in.snow_albedo);
      let snowmelt = degree_day_factor * (weather_data_cell.temperature - TEMP_MELT);
      cell_out.snow_water_equivalent = cell_in.snow_water_equivalent - snowmelt;
      cell_out.snow_water_equivalent = interpolate_swe(cell_in.snow_water_equivalent, cell_in.curvature);
    }
    else
    {
      cell_out.snow_water_equivalent = cell_in.snow_water_equivalent;
    }
  }

  let texture_value_swe = clamp(cell_out.snow_water_equivalent / MAX_SNOW_VALUE, 0.0, 1.0);
  let texture_value = vec4<f32>(texture_value_swe, texture_value_swe, texture_value_swe, 1.0);
  textureStore(texture_out, tex_coord, texture_value);
}

// // Binding for the input texture
// @binding(0) var inputTexture: texture_storage_2d<rgba8unorm, read>;

// // Binding for the output texture
// @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

// // Workgroup size
// @workgroup_size(8, 8, 1) var workgroupSize: vec3<u32>;

// // Compute shader entry point
// @compute
// fn main(
//     // Built-in variable for global invocation ID
//     @builtin(global_invocation_id) gid: vec3<u32>
// ) {
//     // Calculate the coordinate within the texture
//     let texCoord: vec2<u32> = gid.xy * workgroupSize.xy;

//     // Read from the input texture
//     let inputColor: vec4<f32> = textureLoad(inputTexture, texCoord);

//     // Perform some computation (e.g., invert colors)
//     let outputColor: vec4<f32> = vec4<f32>(1.0) - inputColor;

//     // Write to the output texture
//     textureStore(outputTexture, texCoord, outputColor);
// }