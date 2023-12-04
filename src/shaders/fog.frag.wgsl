struct FragmentInput {
    @location(0) fragPos : vec3<f32>;
};

struct FogUniforms {
    cameraPos : vec3<f32>;
    fogDensity : f32;
    fogColor : vec3<f32>;
};

@group(1) @binding(0) var<uniform> fogUniforms : FogUniforms;

@stage(fragment)
fn main(input : FragmentInput) -> @location(0) vec4<f32> {
    // Original color calculation (this should be based on your texturing, lighting, etc.)
    let originalColor = vec3<f32>(1.0, 1.0, 1.0); // Placeholder for actual color calculation

    // Calculate the fog factor using exponential fog equation
    let distance = length(input.fragPos - fogUniforms.cameraPos);
    let fogFactor = exp(-pow(distance * fogUniforms.fogDensity, 2.0));

    // Mix the original color with the fog color based on the fog factor
    let finalColor = mix(originalColor, fogUniforms.fogColor, fogFactor);

    return vec4<f32>(finalColor, 1.0);
}
