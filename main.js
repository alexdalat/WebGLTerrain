var cubeRotation = 0.0;


const grid_size = 15;
const tile_size = 1;
const max_y = 5;

var blocks = [[]];

const LEFT = glMatrix.vec3.fromValues(-1, 0, 0);
const RIGHT = glMatrix.vec3.fromValues(1, 0, 0);
const FRONT = glMatrix.vec3.fromValues(0, 0, 1);
const BACK = glMatrix.vec3.fromValues(0, 0, -1);
const OVER = glMatrix.vec3.fromValues(0, 1, 0);
const UNDER = glMatrix.vec3.fromValues(0, -1, 0);

const BLOCK_NEIGHBORS = [LEFT, OVER, FRONT, BACK, RIGHT];

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
	  
	const buffers = initBuffers(gl);
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
	
	const positions = [
		/*// Top face
		-1.0,  0.0, -1.0,
		-1.0,  0.0,  1.0,
		 1.0,  0.0,  1.0,
		 1.0,  0.0, -1.0,*/
	];

	const indices = [
		//0,  1,  2,     0,  2, 3,   // top
	];

	const faceColors = [
		//[0.0, 1.0, 0.0, 1.0],
	];

	noise.seed(Math.random());

	for(let x = 0; x < grid_size*2; x++) {
		blocks.push([]);
		for(let z = 0; z < grid_size*2; z++) {
			blocks[x].push([]);
			for(let y = 0; y < max_y*2; y++) {
				blocks[x][z].push(BLOCKTYPES.air);
			}
		}
	}

	for(let x = -grid_size; x < grid_size; x++) {
		for(let z = -grid_size; z < grid_size; z++) {
			var nx = x+grid_size;
			var nz = z+grid_size;
			var y = Math.round((noise.perlin2(nx*10/100, z*10/100)+1)*max_y);
			var xyz = glMatrix.vec3.fromValues(nx, y, nz);
			blocks[nx][nz][y] = BLOCKTYPES.default;
		}
	}
	console.log(blocks) // x z y  format

	var idx = 0;
	for(let x = -grid_size; x < grid_size; x++) {
		for(let z = -grid_size; z < grid_size; z++) {
			for(let y = -max_y; y < max_y; y++) {
				if(blocks[x+grid_size][y+max_y][z+grid_size] === BLOCKTYPES.air)continue;

				for(let f = 0; f < BLOCK_NEIGHBORS.length; f++) { // cube neighbors/faces
					var xyz = glMatrix.vec3.fromValues(x+grid_size, y+max_y, z+grid_size);
					var block = blocks[x+grid_size][y+max_y][z+grid_size];
					var bni = glMatrix.vec3.create(); // block neighbor index
					glMatrix.vec3.add(bni, xyz, BLOCK_NEIGHBORS[f]); // xyz + block neighbor constant = block neighbor

					if(bni[0] < 0 || bni[1] < 0 || bni[0] >= grid_size*2 || bni[1] >= grid_size*2 || bni[2] > max_y*2 || bni[2] < 0) continue;
					var nblock = blocks[bni[0]][bni[2]][bni[1]];
					if(nblock === BLOCKTYPES.air && BLOCK_NEIGHBORS[f] !== OVER && BLOCK_NEIGHBORS[f] !== UNDER)continue; // if y is the same, dont' show side faces
					addFace(positions, (xyz[0]-grid_size)*tile_size, (xyz[2]-max_y)*tile_size, (xyz[1]-grid_size)*tile_size, BLOCK_NEIGHBORS[f]);
				
					indices.push(idx, idx+1, idx+2,   idx, idx+2, idx+3);
						
					var c = [xyz[0]/grid_size/tile_size, xyz[1]/max_y/tile_size, xyz[2]/grid_size/tile_size, 1.0];
					//if(BLOCK_NEIGHBORS[f] === OVER)c = [0.0, 1.0, 0.0, 1.0];
					faceColors.push(c);
					
					idx += 4;
				}
			}
		}
	}

	/*print3Array(positions);
	console.log("----")
	print3Array(indices);*/
	
	gl.bufferData(gl.ARRAY_BUFFER,
				new Float32Array(positions),
				gl.STATIC_DRAW);

	const indexBuffer = gl.createBuffer(); // indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices), 
		gl.STATIC_DRAW);


	var colors = [];
	for (var j = 0; j < faceColors.length; ++j) {
		var c = faceColors[j];
		colors = colors.concat(c, c, c, c);
	}

	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  
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
		[grid_size*tile_size*2, grid_size*tile_size, grid_size*tile_size*2]);  // amount to translate*/
	//cameraViewMatrix = glMatrix.mat4.invert(cameraViewMatrix, cameraViewMatrix);
	cameraPosition = glMatrix.vec3.fromValues(cameraViewMatrix[12], cameraViewMatrix[13], cameraViewMatrix[14])
	lookAt = [modelViewMatrix[12], modelViewMatrix[13], modelViewMatrix[14]];
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

function addFace(positions, x, y, z, side) {
	switch(side) {
		case RIGHT:
			positions.push(x+tile_size, y, z);
			positions.push(x+tile_size, y, z+tile_size);
			positions.push(x+tile_size, y+tile_size, z+tile_size);
			positions.push(x+tile_size, y+tile_size, z);
			return true;
		case LEFT:
			positions.push(x, y, z);
			positions.push(x, y+tile_size, z);
			positions.push(x, y+tile_size, z+tile_size);
			positions.push(x, y, z+tile_size);
			return true;
		case FRONT:
			positions.push(x, y, z+tile_size);
			positions.push(x+tile_size, y, z+tile_size);
			positions.push(x+tile_size, y+tile_size, z+tile_size);
			positions.push(x, y+tile_size, z+tile_size);
			return true;
		case BACK:
			positions.push(x, y, z);
			positions.push(x, y+tile_size, z);
			positions.push(x+tile_size, y+tile_size, z);
			positions.push(x+tile_size, y, z);
			return true;
		case OVER:
			positions.push(x, y+tile_size, z);
			positions.push(x, y+tile_size, z+tile_size);
			positions.push(x+tile_size, y+tile_size, z+tile_size);
			positions.push(x+tile_size, y+tile_size, z);
			return true;
		default:
			return false;
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