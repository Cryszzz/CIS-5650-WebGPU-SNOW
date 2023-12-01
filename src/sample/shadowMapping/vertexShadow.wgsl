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
@group(2) @binding(0) var texture: texture_2d<f32>;
@group(2) @binding(1) var texture2: texture_storage_2d<rgba8unorm, write>;

@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uvs: vec2<f32>,
) -> @builtin(position) vec4<f32> {

  return vec4(position, 1.0);

  //return scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  //return model.modelMatrix * vec4(position, 1.0);
}
