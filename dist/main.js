/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _renderer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./renderer */ \"./src/renderer.ts\");\n\nconst canvas = document.getElementById(\"gfx-main\");\nconst renderer = new _renderer__WEBPACK_IMPORTED_MODULE_0__.Renderer(canvas);\nrenderer.Initialize();\n\n\n//# sourceURL=webpack://npm-test/./src/main.ts?");

/***/ }),

/***/ "./src/renderer.ts":
/*!*************************!*\
  !*** ./src/renderer.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Renderer: () => (/* binding */ Renderer)\n/* harmony export */ });\n/* harmony import */ var _shaders_raytracer_kernel_wgsl__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./shaders/raytracer_kernel.wgsl */ \"./src/shaders/raytracer_kernel.wgsl\");\n/* harmony import */ var _shaders_screen_shader_wgsl__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./shaders/screen_shader.wgsl */ \"./src/shaders/screen_shader.wgsl\");\nvar __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\n\n\nclass Renderer {\n    constructor(canvas) {\n        this.render = () => {\n            this.canvas.width = window.innerWidth;\n            this.canvas.height = window.innerHeight;\n            const commandEncoder = this.device.createCommandEncoder();\n            const ray_trace_pass = commandEncoder.beginComputePass();\n            ray_trace_pass.setPipeline(this.ray_tracing_pipeline);\n            ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group);\n            ray_trace_pass.dispatchWorkgroups(Math.floor((this.canvas.width + 7) / 8), Math.floor((this.canvas.height + 7) / 8), 1);\n            ray_trace_pass.end();\n            const textureView = this.context.getCurrentTexture().createView();\n            const renderpass = commandEncoder.beginRenderPass({\n                colorAttachments: [{\n                        view: textureView,\n                        clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },\n                        loadOp: \"clear\",\n                        storeOp: \"store\"\n                    }]\n            });\n            renderpass.setPipeline(this.screen_pipeline);\n            renderpass.setBindGroup(0, this.screen_bind_group);\n            renderpass.draw(6, 1, 0, 0);\n            renderpass.end();\n            this.device.queue.submit([commandEncoder.finish()]);\n            requestAnimationFrame(this.render);\n        };\n        this.canvas = canvas;\n        this.canvas.width = window.innerWidth;\n        this.canvas.height = window.innerHeight;\n    }\n    Initialize() {\n        return __awaiter(this, void 0, void 0, function* () {\n            yield this.setupDevice();\n            yield this.createAssets();\n            yield this.makePipeline();\n            this.render();\n        });\n    }\n    setupDevice() {\n        var _a, _b;\n        return __awaiter(this, void 0, void 0, function* () {\n            //adapter: wrapper around (physical) GPU.\n            //Describes features and limits\n            this.adapter = (yield ((_a = navigator.gpu) === null || _a === void 0 ? void 0 : _a.requestAdapter()));\n            //device: wrapper around GPU functionality\n            //Function calls are made through the device\n            this.device = (yield ((_b = this.adapter) === null || _b === void 0 ? void 0 : _b.requestDevice()));\n            //context: similar to vulkan instance (or OpenGL context)\n            this.context = this.canvas.getContext(\"webgpu\");\n            this.format = \"bgra8unorm\";\n            this.context.configure({\n                device: this.device,\n                format: this.format,\n                alphaMode: \"opaque\"\n            });\n        });\n    }\n    makePipeline() {\n        return __awaiter(this, void 0, void 0, function* () {\n            const ray_tracing_bind_group_layout = this.device.createBindGroupLayout({\n                entries: [\n                    {\n                        binding: 0,\n                        visibility: GPUShaderStage.COMPUTE,\n                        storageTexture: {\n                            access: \"write-only\",\n                            format: \"rgba8unorm\",\n                            viewDimension: \"2d\"\n                        }\n                    },\n                ]\n            });\n            this.ray_tracing_bind_group = this.device.createBindGroup({\n                layout: ray_tracing_bind_group_layout,\n                entries: [\n                    {\n                        binding: 0,\n                        resource: this.color_buffer_view\n                    }\n                ]\n            });\n            const ray_tracing_pipeline_layout = this.device.createPipelineLayout({\n                bindGroupLayouts: [ray_tracing_bind_group_layout]\n            });\n            this.ray_tracing_pipeline = this.device.createComputePipeline({\n                layout: ray_tracing_pipeline_layout,\n                compute: {\n                    module: this.device.createShaderModule({\n                        code: _shaders_raytracer_kernel_wgsl__WEBPACK_IMPORTED_MODULE_0__[\"default\"],\n                    }),\n                    entryPoint: 'main',\n                },\n            });\n            const screen_bind_group_layout = this.device.createBindGroupLayout({\n                entries: [\n                    {\n                        binding: 0,\n                        visibility: GPUShaderStage.FRAGMENT,\n                        sampler: {}\n                    },\n                    {\n                        binding: 1,\n                        visibility: GPUShaderStage.FRAGMENT,\n                        texture: {}\n                    },\n                ]\n            });\n            this.screen_bind_group = this.device.createBindGroup({\n                layout: screen_bind_group_layout,\n                entries: [\n                    {\n                        binding: 0,\n                        resource: this.sampler\n                    },\n                    {\n                        binding: 1,\n                        resource: this.color_buffer_view\n                    }\n                ]\n            });\n            const screen_pipeline_layout = this.device.createPipelineLayout({\n                bindGroupLayouts: [screen_bind_group_layout]\n            });\n            this.screen_pipeline = this.device.createRenderPipeline({\n                layout: screen_pipeline_layout,\n                vertex: {\n                    module: this.device.createShaderModule({\n                        code: _shaders_screen_shader_wgsl__WEBPACK_IMPORTED_MODULE_1__[\"default\"],\n                    }),\n                    entryPoint: 'vert_main',\n                },\n                fragment: {\n                    module: this.device.createShaderModule({\n                        code: _shaders_screen_shader_wgsl__WEBPACK_IMPORTED_MODULE_1__[\"default\"],\n                    }),\n                    entryPoint: 'frag_main',\n                    targets: [\n                        {\n                            format: \"bgra8unorm\"\n                        }\n                    ]\n                },\n                primitive: {\n                    topology: \"triangle-list\"\n                }\n            });\n        });\n    }\n    createAssets() {\n        return __awaiter(this, void 0, void 0, function* () {\n            this.color_buffer = this.device.createTexture({\n                size: {\n                    width: this.canvas.width,\n                    height: this.canvas.height,\n                },\n                format: \"rgba8unorm\",\n                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING\n            });\n            this.color_buffer_view = this.color_buffer.createView();\n            const samplerDescriptor = {\n                addressModeU: \"repeat\",\n                addressModeV: \"repeat\",\n                magFilter: \"linear\",\n                minFilter: \"nearest\",\n                mipmapFilter: \"nearest\",\n                maxAnisotropy: 1\n            };\n            this.sampler = this.device.createSampler(samplerDescriptor);\n        });\n    }\n}\n\n\n//# sourceURL=webpack://npm-test/./src/renderer.ts?");

/***/ }),

/***/ "./src/shaders/raytracer_kernel.wgsl":
/*!*******************************************!*\
  !*** ./src/shaders/raytracer_kernel.wgsl ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (\"\\r\\n\\r\\n@compute @workgroup_size(8,8,1)\\r\\nfn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {\\r\\n    \\r\\n}\\r\\n\");\n\n//# sourceURL=webpack://npm-test/./src/shaders/raytracer_kernel.wgsl?");

/***/ }),

/***/ "./src/shaders/screen_shader.wgsl":
/*!****************************************!*\
  !*** ./src/shaders/screen_shader.wgsl ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (\"struct Uniforms {     // 4x4 transform matrices\\r\\n    transform : mat4x4<f32>;    // translate AND rotate\\r\\n    rotate : mat4x4<f32>;       // rotate only\\r\\n};\\r\\n\\r\\nstruct Camera {     // 4x4 transform matrix\\r\\n    matrix : mat4x4<f32>;\\r\\n};\\r\\n\\r\\n// bind model/camera buffers\\r\\n@group(0) @binding(0) var<uniform> modelTransform    : Uniforms;\\r\\n@group(0) @binding(1) var<uniform> cameraTransform   : Camera;\\r\\n@group(0) @binding(2) var heightTexture: texture_2d<f32>;\\r\\n\\r\\n// output struct of this vertex shader\\r\\nstruct VertexOutput {\\r\\n    @builtin(position) Position : vec4<f32>;\\r\\n\\r\\n    @location(0) heightFactor: f32;\\r\\n};\\r\\n\\r\\n// input struct according to vertex buffer stride\\r\\nstruct VertexInput {\\r\\n    @location(0) position : vec3<f32>;\\r\\n    @location(1) norm : vec3<f32>;\\r\\n    @location(2) uv : vec2<f32>;\\r\\n};\\r\\n\\r\\n@stage(vertex)\\r\\nfn main(input: VertexInput) -> VertexOutput {\\r\\n    var output: VertexOutput;\\r\\n    var inputPos: vec3<f32> = input.position;\\r\\n    var d : vec2<i32> = textureDimensions(heightTexture);\\r\\n    var heightPixel: vec4<f32> = textureLoad(heightTexture, vec2<i32>( i32(input.uv.x * f32(d.x)), i32(input.uv.y * f32(d.y)) ), 0);\\r\\n    var height: f32 = (heightPixel.x + heightPixel.y + heightPixel.z) / 3.0;\\r\\n    inputPos = inputPos + input.norm * height * 10.0;\\r\\n\\r\\n    var transformedPosition: vec4<f32> = modelTransform.transform * vec4<f32>(inputPos, 1.0);\\r\\n\\r\\n    output.Position = cameraTransform.matrix * transformedPosition;            \\r\\n    output.heightFactor = height;\\r\\n    return output;\\r\\n}\\r\\n\\r\\nstruct FragmentInput {\\r\\n    @location(0) heightFactor: f32;\\r\\n};\\r\\n\\r\\n@stage(fragment)\\r\\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\\r\\n    return vec4<f32>( vec3<f32>(1.0 * input.heightFactor, 0.2, 0.2).xyz, 1.0);\\r\\n}\");\n\n//# sourceURL=webpack://npm-test/./src/shaders/screen_shader.wgsl?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	
/******/ })()
;