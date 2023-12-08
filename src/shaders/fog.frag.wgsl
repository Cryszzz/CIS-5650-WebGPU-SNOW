struct FragmentInput {
    @location(0) fragPos : vec3<f32>;
    @location(1) uv : vec2<f32>; // UV coordinates
};

struct FogUniforms {
    cameraPos : vec3<f32>;
    fogDensity : f32;
    fogColor : vec3<f32>;
};

@group(1) @binding(0) var<uniform> fogUniforms : FogUniforms;
@group(2) @binding(0) var myTexture : texture_2d<f32>; // Texture binding
@group(2) @binding(1) var mySampler : sampler; // Sampler binding

@stage(fragment)
fn main(input : FragmentInput) -> @location(0) vec4<f32> {
    // Sample the texture color
    let textureColor = textureSample(myTexture, mySampler, input.uv);

    // Combine the texture color with lighting effects to get the original color
    let originalColor = textureColor.rgb; // Placeholder for combined color calculation

    // Fog calculations
    let distance = length(input.fragPos);
    let fogFactor = exp(-pow(distance * fogUniforms.fogDensity, 2.0));

    // Mix the original color with the fog color based on the fog factor
    let finalColor = mix(originalColor, fogUniforms.fogColor, fogFactor);

    return vec4<f32>(finalColor, 1.0);
}
