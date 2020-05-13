var cubeRotation = 0.0;


const grid_size = 25;
const tile_size = 1.2;
const max_y = 10;

var blocks = [[]];

const LEFT = glMatrix.vec3.fromValues(-1, 0, 0);
const RIGHT = glMatrix.vec3.fromValues(1, 0, 0);
const FRONT = glMatrix.vec3.fromValues(0, 0, 1);
const BACK = glMatrix.vec3.fromValues(0, 0, -1);
const OVER = glMatrix.vec3.fromValues(0, 1, 0);
const UNDER = glMatrix.vec3.fromValues(0, -1, 0);

const BLOCK_NEIGHBORS = [OVER, RIGHT, LEFT, FRONT, BACK, UNDER];

const BLOCKTYPES = {
	air: 0,
	default: 1,
}

main();

function main() {
	const canvas = document.querySelector("#canvas");
	const gl = canvas.getContext("webgl");

	if (gl === null) {
		alert("Unable to initialize WebGL. Your browser or machine may not support it.");
		return;
	}

	const vsSource = `
	attribute vec4 aVertexPosition;
	attribute vec4 aVertexColor;

	uniform mat4 uModelViewMatrix;
	uniform mat4 uCameraViewMatrix;
	uniform mat4 uProjectionMatrix;
	
	varying lowp vec4 vColor;

    void main() {
		gl_Position = uProjectionMatrix * uCameraViewMatrix * uModelViewMatrix * aVertexPosition;
		vColor = aVertexColor;
	}
	`;

	const fsSource = `
	varying lowp vec4 vColor;
	
    void main() {
    	gl_FragColor = vColor;
    }
	`;
	  
	var t0 = performance.now();
	const buffers = initBuffers(gl);
	var t1 = performance.now();
	console.log("Generation time took " + (t1 - t0) + " milliseconds.");

	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			cameraViewMatrix: gl.getUniformLocation(shaderProgram, 'uCameraViewMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
		},
		numVertex: buffers.indices_array.length,
	};

	var then = 0;
	function render(now) {
	  now *= 0.001;  // convert to seconds
	  const deltaTime = now - then;
	  then = now;
  
	  drawScene(gl, programInfo, buffers, deltaTime);
  
	  requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}
function initBuffers(gl) {
	const positionBuffer = gl.createBuffer(); // positions
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	
	const positions = [];
	const positionsvec3 = [];

	const indices = [
		//0,  1,  2,     0,  2, 3,   // top
	];

	var colors = [];
	const faceColors = [
		//[0.0, 1.0, 0.0, 1.0],
	];

	noise.seed(Math.random());
	//noise.seed(0.3);

	var t0 = performance.now();
	for(let x = 0; x < grid_size*2; x++) {
		blocks.push([]);
		for(let z = 0; z < grid_size*2; z++) {
			blocks[x].push([]);
			for(let y = 0; y < max_y*2; y++) {
				blocks[x][z].push(BLOCKTYPES.air);
			}
		}
	}
	var t1 = performance.now();
	console.log("Array fill time took " + (t1 - t0) + " milliseconds.");

	var t0 = performance.now();
	for(let x = -grid_size; x < grid_size; x++) {
		for(let z = -grid_size; z < grid_size; z++) {
			var nx = x+grid_size;
			var nz = z+grid_size;
			var ny = Math.round((noise.perlin2(nx*10/100, z*10/100)+1)*max_y);
			for(let y = 0; y < ny; y++) {
				blocks[nx][nz][y] = BLOCKTYPES.default;
			}
		}
	}
	var t1 = performance.now();
	console.log("Perlin noise generation time took " + (t1 - t0) + " milliseconds.");
	//console.log(blocks) // x z y  format

	var t0 = performance.now();
	var idx = 0;
	for(let x = -grid_size; x < grid_size; x++) {
		for(let z = -grid_size; z < grid_size; z++) {
			for(let y = max_y*2-1; y > 0; y--) {

				var block = blocks[x+grid_size][z+grid_size][y];
				if(block === BLOCKTYPES.air)continue;
				var xyz = glMatrix.vec3.fromValues(x+grid_size, y, z+grid_size);

				for(let f = 0; f < BLOCK_NEIGHBORS.length; f++) { // cube neighbors/faces
					var bni = glMatrix.vec3.create(); // block neighbor index
					glMatrix.vec3.add(bni, xyz, BLOCK_NEIGHBORS[f]); // xyz + block neighbor constant = block neighbor

					if(bni[0] < 0 || bni[1] < 0 || bni[2] < 0 || bni[0] >= grid_size*2 || bni[1] >= max_y*2 || bni[2] >= grid_size*2) continue;
					var bnblock = blocks[bni[0]][bni[2]][bni[1]];
					if(bnblock !== BLOCKTYPES.air) continue;

					var fxyz = glMatrix.vec3.fromValues((xyz[0]-grid_size)*tile_size, (xyz[1])*tile_size, (xyz[2]-grid_size)*tile_size);
					addFace(positions, positionsvec3, indices, fxyz[0], fxyz[1], fxyz[2], BLOCK_NEIGHBORS[f]);
					
					var c = [0, 0, 0, 1]
					c = [1-xyz[1]/max_y/2, xyz[1]/max_y/2, 0.0, 1.0];
					//c = [0.0, 1.0, 0.0, 1.0];
					colors = colors.concat(c, c, c, c);
					
					idx += 1;
				}
			}
		}
	}
	var t1 = performance.now();
	console.log("Triangle generation time took " + (t1 - t0) + " milliseconds.");

	console.log("positions length: "+positions.length)
	console.log("positionsvec3 length: "+positionsvec3.length)
	console.log("indices length: "+indices.length)
	/*print3Array(positions);
	console.log("----")
	print3Array(indices);*/
	
	var t0 = performance.now();
	gl.bufferData(gl.ARRAY_BUFFER,
				new Float32Array(positions),
				gl.STATIC_DRAW);

	const indexBuffer = gl.createBuffer(); // indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices), 
		gl.STATIC_DRAW);


	/*
	for (var j = 0; j < faceColors.length; ++j) {
		var c = faceColors[j];
		colors = colors.concat(c, c, c, c);
	}*/
	//print3Array(colors)

	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

	var t1 = performance.now();
	console.log("Other stuff took " + (t1 - t0) + " milliseconds.");
  
	return {
		position: positionBuffer,
		color: colorBuffer,
		indices: indexBuffer,

		position_array: positions,
		color_array: colors,
		indices_array: indices
	};
}

function drawScene(gl, programInfo, buffers, deltaTime) {
	resize(gl);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
	const fieldOfView = 45 * Math.PI / 180;   // in radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 1000.0;
	const projectionMatrix = glMatrix.mat4.create();
  
	glMatrix.mat4.perspective(projectionMatrix,
					fieldOfView,
					aspect,
					zNear,
					zFar);
  
	const modelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(modelViewMatrix,     // destination matrix
		modelViewMatrix,     // matrix to translate
		[0, 0, 0]);  // amount to translate
	glMatrix.mat4.rotate(modelViewMatrix,  // destination matrix
		modelViewMatrix,  // matrix to rotate
		cubeRotation * .7,// amount to rotate in radians
		[0, 1, 0]);       // axis to rotate around (X)*/

	var cameraViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(cameraViewMatrix,     // destination matrix
		cameraViewMatrix,     // matrix to translate
		[grid_size*2, grid_size*2, grid_size*2]);  // amount to translate*/
	//cameraViewMatrix = glMatrix.mat4.invert(cameraViewMatrix, cameraViewMatrix);
	cameraPosition = glMatrix.vec3.fromValues(cameraViewMatrix[12], cameraViewMatrix[13], cameraViewMatrix[14])
	lookAt = [modelViewMatrix[12], modelViewMatrix[13]+max_y*tile_size/2, modelViewMatrix[14]];
	cameraViewMatrix = glMatrix.mat4.lookAt(cameraViewMatrix, cameraPosition, lookAt, [0, 1, 0]);
  
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
		gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
	}

	{
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexColor,
			numComponents,
			type,
			normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
	  }
  
	gl.useProgram(programInfo.program);
	// Set the shader uniforms
  
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.projectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.cameraViewMatrix,
		false,
		cameraViewMatrix);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix);
  
	{
		const vertexCount = programInfo.numVertex;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		// Drawing types: TRIANGLES = normal fill, LINE_STRIP = wireframe
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}

	cubeRotation += deltaTime/2;
}

function addFace(positions, positionsvec3, indices, x, y, z, side) {
	var xyz1;
	var xyz2;
	var xyz3;
	var xyz4;
	switch(side) {
		case RIGHT:
			xyz1 = glMatrix.vec3.fromValues(x+tile_size, y, z);
			xyz2 = glMatrix.vec3.fromValues(x+tile_size, y, z+tile_size);
			xyz3 = glMatrix.vec3.fromValues(x+tile_size, y+tile_size, z+tile_size);
			xyz4 = glMatrix.vec3.fromValues(x+tile_size, y+tile_size, z);
			break;
		case LEFT:
			xyz1 = glMatrix.vec3.fromValues(x, y, z);
			xyz2 = glMatrix.vec3.fromValues(x, y+tile_size, z);
			xyz3 = glMatrix.vec3.fromValues(x, y+tile_size, z+tile_size);
			xyz4 = glMatrix.vec3.fromValues(x, y, z+tile_size);
			break;
		case FRONT:
			xyz1 = glMatrix.vec3.fromValues(x, y, z+tile_size);
			xyz2 = glMatrix.vec3.fromValues(x+tile_size, y, z+tile_size);
			xyz3 = glMatrix.vec3.fromValues(x+tile_size, y+tile_size, z+tile_size);
			xyz4 = glMatrix.vec3.fromValues(x, y+tile_size, z+tile_size);
			break;
		case BACK:
			xyz1 = glMatrix.vec3.fromValues(x, y, z);
			xyz2 = glMatrix.vec3.fromValues(x, y+tile_size, z);
			xyz3 = glMatrix.vec3.fromValues(x+tile_size, y+tile_size, z);
			xyz4 = glMatrix.vec3.fromValues(x+tile_size, y, z);
			break;
		case OVER:
			xyz1 = glMatrix.vec3.fromValues(x, y+tile_size, z);
			xyz2 = glMatrix.vec3.fromValues(x, y+tile_size, z+tile_size);
			xyz3 = glMatrix.vec3.fromValues(x+tile_size, y+tile_size, z+tile_size);
			xyz4 = glMatrix.vec3.fromValues(x+tile_size, y+tile_size, z);
			break;
		case UNDER:
			xyz1 = glMatrix.vec3.fromValues(x, y, z);
			xyz2 = glMatrix.vec3.fromValues(x+tile_size, y, z);
			xyz3 = glMatrix.vec3.fromValues(x+tile_size, y, z+tile_size);
			xyz4 = glMatrix.vec3.fromValues(x, y, z+tile_size);
			break;
		default:
			return false;
	}

	positions.push(xyz1[0], xyz1[1], xyz1[2]); 
	positions.push(xyz2[0], xyz2[1], xyz2[2]); 
	positions.push(xyz3[0], xyz3[1], xyz3[2]);
	positions.push(xyz4[0], xyz4[1], xyz4[2]);
	var idx = positions.length/3;
	indices.push(idx, idx+1, idx+2,   idx, idx+2, idx+3);

	/*pushPos(positions, positionsvec3, indices, xyz1[0], xyz1[1], xyz1[2]);
	pushPos(positions, positionsvec3, indices, xyz2[0], xyz2[1], xyz2[2]);
	pushPos(positions, positionsvec3, indices, xyz3[0], xyz3[1], xyz3[2]);

	pushPos(positions, positionsvec3, indices, xyz1[0], xyz1[1], xyz1[2]);
	pushPos(positions, positionsvec3, indices, xyz3[0], xyz3[1], xyz3[2]);
	pushPos(positions, positionsvec3, indices, xyz4[0], xyz4[1], xyz4[2]);*/
}
function pushPos(positions, positionsvec3, indices, x, y, z) {
	var nidx = isVec3InArray(positionsvec3, [x, y, z]);
	if(nidx !== -1) { // vector already exists
		indices.push(nidx);
	} else { // new vector
		indices.push(positions.length/3);
		positions.push(x, y, z);
		positionsvec3.push([x, y, z]);
	}
}
function print3Array(array) {
	str = "";
	for(let i = 0; i < array.length; i+=3) {
		nstr = array[i] + " " + array[i+1] + " " + array[i+2] + "\n";
		str += nstr;
	}
	console.log(str)
}

function resize(gl) {
	var realToCSSPixels = window.devicePixelRatio;
  
	// Lookup the size the browser is displaying the canvas in CSS pixels
	// and compute a size needed to make our drawingbuffer match it in
	// device pixels.
	var displayWidth  = Math.floor(gl.canvas.clientWidth  * realToCSSPixels);
	var displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);
  
	// Check if the canvas is not the same size.
	if (gl.canvas.width  !== displayWidth ||
		gl.canvas.height !== displayHeight) {
  
	  // Make the canvas the same size
	  gl.canvas.width  = displayWidth;
	  gl.canvas.height = displayHeight;
	}
}

function isVec3InArray(array, item) {
    for (var i = 0; i < array.length; i++) {
        // This if statement depends on the format of your array
        if (array[i][0] == item[0] && array[i][1] == item[1] && array[i][2] == item[2]) {
            return i;   // Found it
        }
    }
    return -1;   // Not found
}