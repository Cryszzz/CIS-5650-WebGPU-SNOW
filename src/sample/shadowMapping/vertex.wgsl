struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3<f32>,
  // time: f32,
}

struct Model {
  modelMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
  @location(0) shadowPos: vec3<f32>,
  @location(1) fragPos: vec3<f32>,
  @location(2) fragNorm: vec3<f32>,

  @builtin(position) Position: vec4<f32>,
}

fn random2(p: vec2<f32>) -> vec2<f32> {
    // A simple hash function for 2D points
    return fract(sin(vec2<f32>(dot(p, vec2<f32>(127.1, 311.7)),
                              dot(p, vec2<f32>(269.5, 183.3)))) * 43758.5453);
}

fn worley(p: vec2<f32>) -> f32 {
    var d = 1.0; // Initial distance set to a high value
    let frequency = 0.2; // Controls the density of the hills
    let scaled_p = p * frequency; // Create a new variable for scaled coordinates

    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let neighbor = vec2<f32>(f32(x), f32(y));
            let point = random2(floor(scaled_p) + neighbor);
            let diff = neighbor + point - fract(scaled_p);
            let dist = length(diff); // Use length instead of dot for true distance
            d = min(d, dist);
        }
    }
    
    // Invert and smooth the noise to create hills
    d = 1.0 - d;
    d = smoothstep(0.0, 1.0, d);

    return d; // Return the smoothed distance
}

fn cos_time(time: f32) -> f32 {
  return cos(time);
}


@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>
) -> VertexOutput {
  var output : VertexOutput;


 
  let update=3.0*sin(position.x/500*3.14)*sin(position.z/500*3.14);
  let newposition=-vec3(position.x,update*40*worley( vec2(position.x,position.z)),position.z);
  // let test_position : vec4<f32> = clamp(vec4(position.x, position.y * sin_time(scene.time), position.z, 1), vec4(0, 0, 0, 1), vec4(position, 1));
  // let test_position : vec4<f32> = clamp(vec4(position.x, position.y * sin_time(scene.time), position.z, 1), vec4(0, 0, 0, 1), vec4(position, 1));
  // let test_position : vec4<f32> = vec4(position.x, position.y * cos_time(scene.time), position.z, 1);
  // var output_position : vec4<f32> = scene.cameraViewProjMatrix * model.modelMatrix * test_position;
  
    // XY is in (-1, 1) space, Z is in (0, 1) space
  // let posFromLight = model.modelMatrix * test_position;
  let posFromLight = model.modelMatrix * vec4(position, 1.0);
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  output.shadowPos = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );
  
  // var output_position : vec4<f32> = scene.cameraViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  output.Position = scene.cameraViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  // output.Position = output_position;  
  output.fragPos = output.Position.xyz;
  output.fragNorm = normal;
  return output;
}



