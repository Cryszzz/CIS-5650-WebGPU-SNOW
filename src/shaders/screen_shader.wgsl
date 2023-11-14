struct Uniforms {     // 4x4 transform matrices
    transform : mat4x4<f32>;    // translate AND rotate
    rotate : mat4x4<f32>;       // rotate only
};

struct Camera {     // 4x4 transform matrix
    matrix : mat4x4<f32>;
};

// bind model/camera buffers
@group(0) @binding(0) var<uniform> modelTransform    : Uniforms;
@group(0) @binding(1) var<uniform> cameraTransform   : Camera;
@group(0) @binding(2) var heightTexture: texture_2d<f32>;

// output struct of this vertex shader
struct VertexOutput {
    @builtin(position) Position : vec4<f32>;

    @location(0) heightFactor: f32;
};

// input struct according to vertex buffer stride
struct VertexInput {
    @location(0) position : vec3<f32>;
    @location(1) norm : vec3<f32>;
    @location(2) uv : vec2<f32>;
};

@stage(vertex)
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var inputPos: vec3<f32> = input.position;
    var d : vec2<i32> = textureDimensions(heightTexture);
    var heightPixel: vec4<f32> = textureLoad(heightTexture, vec2<i32>( i32(input.uv.x * f32(d.x)), i32(input.uv.y * f32(d.y)) ), 0);
    var height: f32 = (heightPixel.x + heightPixel.y + heightPixel.z) / 3.0;
    inputPos = inputPos + input.norm * height * 10.0;

    var transformedPosition: vec4<f32> = modelTransform.transform * vec4<f32>(inputPos, 1.0);

    output.Position = cameraTransform.matrix * transformedPosition;            
    output.heightFactor = height;
    return output;
}

struct FragmentInput {
    @location(0) heightFactor: f32;
};

@stage(fragment)
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    return vec4<f32>( vec3<f32>(1.0 * input.heightFactor, 0.2, 0.2).xyz, 1.0);
}