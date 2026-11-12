const uniformNames = ["rect", "source", "viewport", "transform", "image", "color", "solid"] as const;

export type Uniforms = Record<(typeof uniformNames)[number], WebGLUniformLocation>;

const vertexSource = `#version 300 es
in vec2 position;

uniform vec4 rect;
uniform vec4 source;
uniform vec2 viewport;
uniform mat3 transform;

out vec2 textureUV;

void main() {
  vec2 point = rect.xy + position * rect.zw;
  vec3 screen = transform * vec3(point, 1.0);
  gl_Position = vec4(screen.x * 2.0 / viewport.x - 1.0, 1.0 - screen.y * 2.0 / viewport.y, 0.0, 1.0);
  textureUV = source.xy + position * source.zw;
}`;

const fragmentSource = `#version 300 es
precision mediump float;

in vec2 textureUV;

uniform sampler2D image;
uniform vec4 color;
uniform bool solid;

out vec4 outputColor;

void main() {
  outputColor = solid ? color : texture(image, textureUV) * color;
}`;

const vertices = new Float32Array([
  0, 0,
  1, 0,
  0, 1,
  1, 1
]);

export function createWebGLProgram(gl: WebGL2RenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram()!;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  const linkError = !gl.getProgramParameter(program, gl.LINK_STATUS) ?
    gl.getProgramInfoLog(program) ?? "WebGL program linking failed" :
    null;

  gl.detachShader(program, vertex);
  gl.detachShader(program, fragment);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (linkError != null) {
    gl.deleteProgram(program);
    throw new Error(linkError);
  }

  gl.useProgram(program);

  const uniforms = {} as Uniforms;

  for (const name of uniformNames) {
    uniforms[name] = gl.getUniformLocation(program, name)!;
  }

  gl.uniform1i(uniforms.image, 0);

  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 8, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return { program, buffer, uniforms };
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "WebGL shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}
