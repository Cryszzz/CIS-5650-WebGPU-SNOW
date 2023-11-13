import {createCamera} from '3d-view-controls';
import {vec3, mat4} from 'gl-matrix';

export class camera {
 
  projectionMatrix= mat4.create();
  viewMatrix = mat4.create();
  fovy = 45;
  aspectRatio = 1;
  near = 0.1;
  far= 1000;
  position = vec3.create();
  direction = vec3.create();
  target= vec3.create();
  up= vec3.create();
  controls;

  constructor(position, target) {
    this.controls = createCamera(document.getElementById('canvas'), {
      eye: position,
      center: target,
    });
    vec3.add(this.target, this.position, this.direction);
    mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.controls.up);
  }

  setAspectRatio(aspectRatio) {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fovy, this.aspectRatio, this.near, this.far);
  }

  update() {
    this.controls.tick();
    vec3.add(this.target, this.position, this.direction);
    mat4.lookAt(this.viewMatrix, this.controls.eye, this.controls.center, this.controls.up);
  }
};
