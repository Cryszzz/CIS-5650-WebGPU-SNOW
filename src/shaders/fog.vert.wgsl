// Uniform buffer structure for matrices
struct Uniforms {
    modelMatrix : mat4x4<f32>,
    viewMatrix : mat4x4<f32>,
    projectionMatrix : mat4x4<f32>,
};

// Bind the uniform buffer to group 0 at binding 0
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexInput {
    @location(0) position : vec4<f32>;
};

struct VertexOutput {
    @builtin(position) clipPosition : vec4<f32>;
    @location(0) fragPos : vec3<f32>; // Position in camera space
};

@stage(vertex)
fn main(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;

    // Transform the vertex position to world space
    let worldPos = uniforms.modelMatrix * input.position;

    // Transform the world position to camera/view space
    let cameraSpacePos = uniforms.viewMatrix * worldPos;

    // Output the position in camera space
    output.fragPos = cameraSpacePos.xyz;

    // Transform the vertex position to clip space
    output.clipPosition = uniforms.projectionMatrix * cameraSpacePos;

    return output;
}
