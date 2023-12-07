struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@binding(1) @group(0) var mySampler: sampler;
@binding(2) @group(0) var myTexture: texture_cube<f32>;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn vs_main(
  @location(0) position : vec4<f32>,
  @location(1) uv : vec2<f32>
) -> VertexOutput {
  var output : VertexOutput;
  var cam=uniforms.modelViewProjectionMatrix;
  output.Position =  uniforms.modelViewProjectionMatrix*vec4<f32>(position.xyz*1000.0,1.0);
  output.fragUV = uv;
  output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
  return output;
}

@fragment
fn fs_main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  var cubemapVec = fragPosition.xyz - vec3(0.5);
  var color=textureSample(myTexture, mySampler, cubemapVec);
  return color;
}