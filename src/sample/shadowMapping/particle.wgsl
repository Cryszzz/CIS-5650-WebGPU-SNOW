////////////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////////////
var<private> rand_seed : vec2<f32>;
const albedo = vec3<f32>(0.9,0.7,0.4);
const PI:f32=3.1416926535928;
struct SimulationCS {
    MeasurementAltitude: f32,
    TSnowA:f32,
    TSnowB:f32,
    TMeltA:f32,
    TMeltB:f32,
    k_e:f32,
    k_m:f32,
};
const SimulationCSConstants: SimulationCS = SimulationCS(0.0,0.0,2.0,-5.0,-2.0,0.2,4.0);



fn init_rand(invocation_id : u32, seed : vec4<f32>) {
  rand_seed = seed.xz;
  rand_seed = fract(rand_seed * cos(35.456+f32(invocation_id) * seed.yw));
  rand_seed = fract(rand_seed * cos(41.235+f32(invocation_id) * seed.xw));
}

fn rand() -> f32 {
  rand_seed.x = fract(cos(dot(rand_seed, vec2<f32>(23.14077926, 232.61690225))) * 136.8168);
  rand_seed.y = fract(cos(dot(rand_seed, vec2<f32>(54.47856553, 345.84153136))) * 534.7645);
  return rand_seed.y;
}

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

////////////////////////////////////////////////////////////////////////////////
// Vertex shader
////////////////////////////////////////////////////////////////////////////////
struct RenderParams {
  modelViewProjectionMatrix : mat4x4<f32>,
  right : vec3<f32>,
  up : vec3<f32>
}
@binding(0) @group(0) var<uniform> render_params : RenderParams;
@binding(1) @group(0) var fragtexture : texture_2d<f32>;

struct VertexInput {
  @location(0) position : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) uv: vec2<f32>, // -1..+1
}

struct VertexOutput {
  @location(0) position: vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) uv : vec2<f32>, // -1..+1

  @builtin(position) Position : vec4<f32>,
}

@vertex
fn vs_main(in : VertexInput) -> VertexOutput {
  //var quad_pos = mat2x3<f32>(render_params.right, render_params.up) * in.quad_pos;
  //var position = in.position;
  var out : VertexOutput;
  out.Position = render_params.modelViewProjectionMatrix * vec4<f32>(in.position, 1.0);
  out.position=in.position;
  out.normal = in.normal;
  out.uv = in.uv;
  return out;
}

/*
@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uvs: vec2<f32>,
) -> VertexOutput {
  var output : VertexOutput;

  //output.position = render_params.modelViewProjectionMatrix * vec4(position, 1.0);
  output.position = vec4(position, 1.0);
  //output.fragPos = output.Position.xyz;
  //output.fragNorm = normal;
  //output.fragUV=uvs;
  return output;
}*/

////////////////////////////////////////////////////////////////////////////////
// Fragment shader
////////////////////////////////////////////////////////////////////////////////

const lightPos : vec3<f32>= vec3<f32> (50.0, 100.0, -100.0);
const lightDir : vec3<f32>= vec3<f32> (1.0, -1.0, 0.0);
const ambientFactor = 0.2;


@fragment
fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
  var test=render_params.modelViewProjectionMatrix;
  var textDim=vec2<f32>(textureDimensions(fragtexture).xy);
  var coord : vec2<i32>=vec2<i32>(0,0);
  coord.x=i32(in.uv.x*textDim.x);
  coord.y=i32(in.uv.x*textDim.x);//i32(in.uv.y*textDim.y);
  var testcolor = textureLoad(fragtexture, coord.xy, 0);
  
  let lambertFactor = max(dot(normalize(-lightDir), in.normal), 0.0);
  let lightingFactor = min(ambientFactor + lambertFactor, 1.0);
  var color = vec4(lightingFactor*testcolor.xyz,1.0);
  // Apply a circular particle alpha mask
  //color.a = color.a * max(1.0 - length(in.quad_pos), 0.0);
  return color;
}

////////////////////////////////////////////////////////////////////////////////
// Simulation Compute shader
////////////////////////////////////////////////////////////////////////////////
struct SimulationParams {
  deltaTime : f32,
  seed : vec4<f32>,
  weather: WeatherData,
}

struct Particle {
  position : vec3<f32>,
  lifetime : f32,
  color    : vec4<f32>,
  velocity : vec3<f32>,
}
struct Particles {
  particles : array<Particle>,
}
/*
Aspect: number[],
Inclination: number[],
Altitude: number[],
Latitude: number[],
Area: number[],
AreaXZ: number[],
SnowWaterEquivalent: number[],
InterpolatedSWE: number[],
SnowAlbedo: number[],
DaysSinceLastSnowfall: number[],
Curvature: number[],*/
struct Cell {
  Aspect: f32,
  Inclination: f32,
  Altitude: f32,
  Latitude: f32,
  Area: f32,
  AreaXY: f32,
  SnowWaterEquivalent: f32,
  InterpolatedSWE: f32,
  SnowAlbedo: f32,
  DaysSinceLastSnowfall: f32,
  Curvature: f32,
}
struct Cells {
  cells : array<Cell>,
}

struct WeatherData
{
	Temperature:f32,
	Precipitation:f32,
};

@binding(0) @group(0) var<uniform> sim_params : SimulationParams;
@binding(1) @group(0) var<storage, read_write> data : Cells;
@binding(2) @group(0) var texture : texture_2d<f32>;
@binding(3) @group(0) var texture2 : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8,8)
fn simulate(@builtin(global_invocation_id) global_invocation_id : vec3<u32>) {
  let idx = global_invocation_id.x;
  var textDim=vec2<i32>(textureDimensions(texture).xy);
  var text2Dim=vec2<i32>(textureDimensions(texture2).xy);
  var coord : vec2<i32>=vec2<i32>(global_invocation_id.xy);

  init_rand(idx, sim_params.seed);
  var loadcoord : vec2<i32>=vec2<i32>(0,0);
  loadcoord.x=i32(coord.x/text2Dim.x*textDim.x);
  loadcoord.y=i32(coord.y/text2Dim.y*textDim.y);
  var color = textureLoad(texture, loadcoord, 0);
  
  textureStore(texture2, vec2<i32>(coord.xy), vec4<f32>(color.xyz,1.0));
  var particle = data.cells[idx];


  // Apply gravity
  /*particle.velocity.z = particle.velocity.z - sim_params.deltaTime * 0.5;

  // Basic velocity integration
  particle.position = particle.position + sim_params.deltaTime * particle.velocity;

  // Age each particle. Fade out before vanishing.
  particle.lifetime = particle.lifetime - sim_params.deltaTime;
  particle.color.a = smoothstep(0.0, 0.5, particle.lifetime);

  // If the lifetime has gone negative, then the particle is dead and should be
  // respawned.
  if (particle.lifetime < 0.0) {
    // Use the probability map to find where the particle should be spawned.
    // Starting with the 1x1 mip level.
    
    for (var level = u32(textureNumLevels(texture) - 1); level > 0; level--) {
      // Load the probability value from the mip-level
      // Generate a random number and using the probabilty values, pick the
      // next texel in the next largest mip level:
      //
      // 0.0    probabilites.r    probabilites.g    probabilites.b   1.0
      //  |              |              |              |              |
      //  |   TOP-LEFT   |  TOP-RIGHT   | BOTTOM-LEFT  | BOTTOM_RIGHT |
      //
      let probabilites = textureLoad(texture, coord, level);
      let value = vec4<f32>(rand());
      let mask = (value >= vec4<f32>(0.0, probabilites.xyz)) & (value < probabilites);
      coord = coord * 2;
      coord.x = coord.x + select(0, 1, any(mask.yw)); // x  y
      coord.y = coord.y + select(0, 1, any(mask.zw)); // z  w
    }
    let uv = vec2<f32>(coord) / vec2<f32>(textureDimensions(texture));
    particle.position = vec3<f32>((uv - 0.5) * 3.0 * vec2<f32>(1.0, -1.0), 0.0);
    particle.color = textureLoad(texture, coord, 0);
    textureStore(texture2, vec2<i32>(coord.xy), vec4<f32>(0.0,0.0,0.0,0.0));
    particle.velocity.x = (rand() - 0.5) * 0.1;
    particle.velocity.y = (rand() - 0.5) * 0.1;
    particle.velocity.z = rand() * 0.3;
    particle.lifetime = 0.5 + rand() * 3.0;
  }*/

  // Store the new particle value
  //data.particles[idx] = particle;
}