var cubeRotation = 1.0;
var rotationEnabled = true;
var cube = [
  [[null, null, null],
   [null, null, null],
   [null, null, null],],
  [[null, null, null],
   [null, null, null],
   [null, null, null],],
  [[null, null, null],
   [null, null, null],
   [null, null, null],],
];

const pieces = [
    // red
    [[[1, 1, 1],
      [0, 1, 0]]],
    // orange
    [[[1, 1],
      [1, 0]],
     [[1, 0],
      [0, 0]]],
    // yellow
    [[[1, 1],
      [1, 0]]],
    // green
    [[[0, 1, 1],
      [1, 1, 0]]],
    // cyan
    [[[1, 1],
      [1, 0]],
     [[0, 0],
      [1, 0]]],
    // blue
    [[[1, 1],
      [1, 0]],
     [[0, 1],
      [0, 0]]],
    // pink
    [[[1, 1, 1],
      [1, 0, 0]]],
];

var unusedPieceColors = [0, 1, 2, 3, 4, 5, 6].reverse();
var moves = [];

var theEnd = false;

main();

//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program
  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec4 aVertexColor;

    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;
    varying highp vec3 vLighting;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;

      highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
      highp vec3 directionalLightColor = vec3(1, 1, 1);
      highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

      highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);
    }
  `;

  // Fragment shader program
  const fsSource = `
    varying lowp vec4 vColor;
    varying highp vec3 vLighting;

    void main(void) {
      gl_FragColor = vec4(vColor.rgb * vLighting, 1.0);
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVevrtexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
    }
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  var then = 0;

  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    nextMove();
    drawScene(gl, programInfo, buffers, deltaTime);

    if (!theEnd) {
        requestAnimationFrame(render);
    }
  }
  takeNextUnusedPiece();
  requestAnimationFrame(render);
}

function takeNextUnusedPiece() {
    var c = unusedPieceColors.pop();
    if (c != undefined) {
        moves.push({
            color: c,
            piece: pieces[c],
            stage: "probe",
            pos: [0, 0, 0],
            rot: [0, 0, 0]
        });
        return true;
    } else {
        return false;
    }
}

function nextMove() {
    if (moves.length == 0) {
        console.log("END");
        theEnd = true;
        return;
    }
    var move = moves[moves.length - 1];
    if (move.stage == "probe") {
        if (makeMove(move)) {
            move.stage = "put";
            makeMove(move);
            if (!takeNextUnusedPiece()) {
                console.log("SOLVED!!! " + cube);
            }
        } else {
            advanceMove(move);
        }
    } else {
        move.stage = "del";
        makeMove(move);
        move.stage = "probe";
        advanceMove(move);
    }
}

function advanceMove(move) {
    if (!advancePieceRotation(move)) {
        if (!advanceProbePosition(move.pos)) {
            moves.pop();
            unusedPieceColors.push(move.color);
        }
    }
}

function advanceProbePosition(pos) {
    if (pos[0] < 2) {
        ++pos[0];
    } else {
        pos[0] = 0;
        if (pos[1] < 2) {
            ++pos[1];
        } else {
            pos[1] = 0;
            if (pos[2] < 2) {
                ++pos[2];
            } else {
                return false;
            }
        }
    }
    return true;
}

function advancePieceRotation(move) {
    var rot = move.rot;
    move.piece = rotatedPieceX(move.piece);
    if (rot[0] < 2) {
        ++rot[0];
    } else {
        rot[0] = 0;
        move.piece = rotatedPieceY(move.piece);
        if (rot[1] < 3) {
            ++rot[1];
        } else {
            rot[1] = 0;
            move.piece = rotatedPieceZ(move.piece);
            if (rot[2] < 3) {
                ++rot[2];
            } else {
                rot[2] = 0;
                return false;
            }
        }
    }
    return true;
}

/*
    // red
    [[[1, 0],
      [1, 1],
      [1, 0]]] 
*/
function rotatedPieceZ(p) {
    const zr = p.length;
    const yr = p[0][0].length;
    const xr = p[0].length;
    var r = new Array(zr);
    for (var z = 0; z < zr; ++z) {
        r[z] = new Array(yr);
        for (var y = 0; y < yr; ++y) {
            r[z][y] = new Array(xr);
            for (var x = 0; x < xr; ++x) {
                r[z][y][x] = p[z][x][(yr-1) - y];
            }
        }
    }
    return r;
}

/*
    // red
    [[[1],[0]],
     [[1],[1]],
     [[1],[0]]]
*/
function rotatedPieceY(p) {
    const zr = p[0][0].length;
    const yr = p[0].length;
    const xr = p.length;
    var r = new Array(zr);
    for (var z = 0; z < zr; ++z) {
        r[z] = new Array(yr);
        for (var y = 0; y < yr; ++y) {
            r[z][y] = new Array(xr);
            for (var x = 0; x < xr; ++x) {
                r[z][y][x] = p[(xr-1) - x][y][z];
            }
        }
    }
    return r;
}

/*
    // red
    [[[1, 1, 1],
      [0, 1, 0]]],

    [[[1, 1, 1]],
     [[0, 1, 0]]]
*/
function rotatedPieceX(p) {
    const zr = p[0].length;
    const yr = p.length;
    const xr = p[0][0].length;
    var r = new Array(zr);
    for (var z = 0; z < zr; ++z) {
        r[z] = new Array(yr);
        for (var y = 0; y < yr; ++y) {
            r[z][y] = new Array(xr);
            for (var x = 0; x < xr; ++x) {
                r[z][y][x] = p[y][(zr-1) - z][x];
            }
        }
    }
    return r;
}

function makeMove(move) {
    const pos = move.pos;
    for (var z = 0; z < move.piece.length; ++z) {
        const cz = pos[2] + z;
        if (cz >= 3)
            return false;
        const zp = move.piece[z];
        for (var y = 0; y < zp.length; ++y) {
            const cy = pos[1] + y;
            if (cy >= 3)
                return false;
            const yp = zp[y];
            for (var x = 0; x < yp.length; ++x) {
                const cx = pos[0] + x;
                if (cx >= 3)
                    return false;
                if (yp[x] != 0) {
                    if (move.stage == "del") {
                        cube[cz][cy][cx] = null;
                    } else {
                        if (cube[cz][cy][cx] != null)
                            return false;
                        if (move.stage == "put") {
                            cube[cz][cy][cx] = move.color;
                        }
                    }
                }
            }
        }
    }
    return true;
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple three-dimensional cube.
//
function initBuffers(gl) {

  // Create a buffer for the cube's vertex positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the cube.

  const positions = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Now set up the colors for the faces. We'll use solid colors
  // for each face.
  const plasticColors = [
    [1.0, 0.0, 0.0, 1.0],
    [1.0, 160.0/255, 43.0/255, 1.0],
    [1.0, 1.0, 0.0, 1.0],
    [41.0/255, 1.0, 76.0/255, 1.0],
    [66.0/255, 210.0/255, 1.0, 1.0],
    [129.0/255, 66.0/255, 210.0/255, 1.0],
    [1.0, 0.0, 1.0, 1.0]
  ];

  var colors = [];
  for (var j = 0; j < plasticColors.length; ++j) {
    const c = plasticColors[j];
    // Repeat each color four times for the four vertices of the face, times
    // the six faces of a cube.
    for (var i = 0; i < 24; ++i) {
        colors = colors.concat(c);
    }
  }

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex arrays for each face's vertices.

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const indices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23,   // left
  ];

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

  const vertexNormals = [
    // Front
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,

    // Back
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,

    // Top
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,

    // Bottom
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,

    // Right
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,

    // Left
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals),
                gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    normal: normalBuffer,
    color: colorBuffer,
    indices: indexBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, deltaTime) {
  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  function rad(grad) {
    return grad * Math.PI / 180;
  }
  const fieldOfView = rad(60);
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  function updateModelView() {
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix);
  }
  function translateView(v) {
    mat4.translate(modelViewMatrix, modelViewMatrix, v);
    updateModelView();
  }
  function rotateView(a, v) {
    mat4.rotate(modelViewMatrix, modelViewMatrix, a, v);
    updateModelView();
  }

  translateView([0.0, 0.0, -14.0]);
  rotateView(cubeRotation, [0, 0, 1]);
  rotateView(cubeRotation * 0.5, [0, 1, 0]);
  rotateView(cubeRotation * 0.66, [1, 0, 0]);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);

  function drawCube(colorIndex) {
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
      const numComponents = 4;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const bytesPerFloat = 4;
      const numFaces = 6;
      const verticesPerFace = 4;
      const offset = colorIndex * numFaces * verticesPerFace * numComponents * bytesPerFloat;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexColor,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL how to pull out the normals from
    // the normal buffer into the vertexNormal attribute.
    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
      gl.vertexAttribPointer(
          programInfo.attribLocations.vertexNormal,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          programInfo.attribLocations.vertexNormal);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    {
      const vertexCount = 36;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  }

  translateView([-2, -2, -2]);

  for (var z = 0; z < 3; ++z) {
    for (var y = 0; y < 3; ++y) {
      for (var x = 0; x < 3; ++x) {
        const c = cube[z][y][x];
        if (c != null) {
          translateView([2*x, 2*y, 2*z]);
          drawCube(c);
          translateView([-2*x, -2*y, -2*z]);
        }
      }
    }
  }

  // Update the rotation for the next draw
  if (rotationEnabled) {
    cubeRotation += deltaTime;
  }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

