var cubeRotation = 1.0;
var rotationEnabled = false;
var showProbeMove = false;
var focusedSolutionIndex = -1;
var movesPerFrame = 10;

var theEnd = false;
var totalTimeSpent = 0;

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
    }`;

    // Fragment shader program
    const fsSource = `
    varying lowp vec4 vColor;
    varying highp vec3 vLighting;

    void main(void) {
      gl_FragColor = vec4(vColor.rgb * vLighting, 1.0);
    }`;

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

    const focusedSolutionIndexInput = document.getElementById("focusedSolutionIndex");
    focusedSolutionIndexInput.value = focusedSolutionIndex;
    focusedSolutionIndexInput.oninput = function(event) {
        if (event.target.value != '') {
            focusedSolutionIndex = parseInt(event.target.value);
        }
    }

    const movesPerFrameInput = document.getElementById("movesPerFrame");
    movesPerFrameInput.value = movesPerFrame;
    movesPerFrameInput.oninput = function(event) {
        if (event.target.value != '') {
            movesPerFrame = parseInt(event.target.value);
        }
    }

    var then = 0;

    // Draw the scene repeatedly
    function render(now) {
        updateTimeSpentAndFPS(now, then);

        const deltaTime = now - then;
        then = now;

        if (!theEnd) {
            for (var i = 0; i < movesPerFrame; ++i) {
                if (!nextMove()) {
                    theEnd = true;
                    break;
                }
            }
        }
        drawScene(gl, programInfo, buffers, deltaTime * 0.001);

        updateCountersText();
        requestAnimationFrame(render);
    }

    preCalculatePieceRotations();
    takeNextUnusedPiece();
    requestAnimationFrame(render);
}

function updateCountersText() {
    document.getElementById("uniqueSolutionsCount").innerText = solutions.length - 1;
    //document.getElementById("totalSolutionsCount").innerText = totalSolutions;
    document.getElementById("totalMovesCount").innerText = totalMoves;
}

function updateTimeSpentAndFPS(now, then) {
    if (!theEnd) {
        totalTimeSpent = now;
    }
    document.getElementById("totalTimeSpent").innerText =
        formatTimeInterval(totalTimeSpent) + (theEnd ? " (END)" : "");

    document.getElementById("nFPS").innerText = Math.round(1000.0 / (now - then));
}

function timePart00(x) {
    return (x < 10 ? "0" : "") + x.toString()
}

function formatTimeInterval(millis) {
    const seconds = Math.floor(millis / 1000.0);
    const minutes = Math.floor(seconds / 60);
    const ss = timePart00(seconds % 60);
    const mm = timePart00(minutes % 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}:${mm}:${ss}`;
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

    function rad(grad) {
        return grad * Math.PI / 180;
    }
    const fieldOfView = rad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 200.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    // set the projection matrix once
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    var modelViewMatrix = mat4.create();

    function updateModelView() {
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        // update the normal matrix with every update of the model view
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

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    function drawCubelet(colorIndex) {
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
            const offset = (colorIndex - 1) * numFaces * verticesPerFace * numComponents * bytesPerFloat;
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
        }
        // now draw the cubelet using triangles
        {
            const vertexCount = 36;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    function drawCube(cube) {
        for (var z = 0; z < 3; ++z) {
            for (var y = 0; y < 3; ++y) {
                for (var x = 0; x < 3; ++x) {
                    const c = cube[z][y][x];
                    if (c != 0) {
                        translateView([2*x, 2*y, 2*z]);
                        drawCubelet(c);
                        translateView([-2*x, -2*y, -2*z]);
                    }
                }
            }
        }
    }

    // solutions carousell
    const sols = solutions.length;
    const focusIndex = (focusedSolutionIndex % sols + sols) % sols;
    const solsPerLevel = Math.sqrt(sols);
    const sector = rad(360.0/solsPerLevel);
    const levelStep = 10.0/solsPerLevel;
    const radius = 6*(solsPerLevel + 1) / Math.PI;
    for (var i = 0; i < sols; ++i) {
        modelViewMatrix = mat4.create();
        translateView([0.0, 0.0, -(14.0 + radius)]);
        rotateView(sector*(i - focusIndex), [0, 1, 0]);
        translateView([0.0, levelStep*(i - focusIndex), radius]);

        const r = 1;
        rotateView(r,        [0, 0, 1]);
        rotateView(r * 0.5,  [0, 1, 0]);
        rotateView(r * 0.66, [1, 0, 0]);

        translateView([-2, -2, -2]);
        drawCube(solutions[i]);
    }

    function drawPiece(piece, color, pos) {
        for (var z = 0; z < piece.length; ++z) {
            for (var y = 0; y < piece[0].length; ++y) {
                for (var x = 0; x < piece[0][0].length; ++x) {
                    if (piece[z][y][x] != 0) {
                        const px = pos[0] + x;
                        const py = pos[1] + y;
                        const pz = pos[2] + z;
                        translateView([2*px, 2*py, 2*pz]);
                        drawCubelet(color);
                        translateView([-2*px, -2*py, -2*pz]);
                    }
                }
            }
        }
    }
    if (showProbeMove && moves.length > 0) {
        const move = moves[moves.length - 1];
        drawPiece(move.piece, move.color, move.pos);
        /*
        // debug piece rotation
        translateView([10, 0, 0]);
        const rot = move.rot;
        rotateView(rad(90*rot[0]), [1, 0, 0]);
        rotateView(rad(90*rot[1]), [0, 1, 0]);
        rotateView(rad(90*rot[2]), [0, 0, 1]);
        drawPiece(pieces[move.color], move.color, move.pos);
        translateView([-10, 0, 0]);
        */
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

