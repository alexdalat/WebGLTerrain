var cubeRotation = 0.0;

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
	uniform mat4 uProjectionMatrix;
	
	varying lowp vec4 vColor;

    void main() {
		gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
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

	const grid_size = 3;
	const tile_size = 1;
	var idx = 0;
	for(let x = 0; x < grid_size*tile_size; x+=tile_size) {
		for(let z = 0; z < grid_size*tile_size; z+=tile_size) {
			positions.push(x+tile_size, 0.0, z+tile_size);
			positions.push(x, 0.0, z+tile_size);
			positions.push(x, 0.0, z);
			positions.push(x+tile_size, 0.0, z);

			indices.push(idx, idx+1, idx+2,   idx, idx+2, idx+3);
			
			var c = [0.0, 1.0, 0.0, 1.0];
			faceColors.push(c);
			
			idx += 4;
		}
	}

	print3Array(positions);
	console.log("----")
	print3Array(indices);

	for (i = 30; i < indices.length; i++)
  		console.log(indices[i])
	
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
		if(j == 5)c = [1.0, 0.0, 0.0, 0.0];
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
	gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
	gl.clearDepth(1.0);                 // Clear everything
	gl.enable(gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
	const fieldOfView = 45 * Math.PI / 180;   // in radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = glMatrix.mat4.create();
  
	glMatrix.mat4.perspective(projectionMatrix,
					fieldOfView,
					aspect,
					zNear,
					zFar);
  
	const modelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(modelViewMatrix,     // destination matrix
		modelViewMatrix,     // matrix to translate
		[-1.5, -1.0, -6.0]);  // amount to translate
	/*glMatrix.mat4.rotate(modelViewMatrix,  // destination matrix
		modelViewMatrix,  // matrix to rotate
		cubeRotation * .7,// amount to rotate in radians
		[0, 1, 0]);       // axis to rotate around (X)*/
  
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
		programInfo.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix);
  
	{
		const vertexCount = programInfo.numVertex;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		// Drawing types: TRIANGLES = normal fill, LINE_LOOP = wireframe
		gl.drawElements(gl.LINE_LOOP, vertexCount, type, offset);
	}

	cubeRotation += deltaTime;
}

function print3Array(array) {
	str = "";
	for(let i = 0; i < array.length; i+=3) {
		nstr = array[i] + " " + array[i+1] + " " + array[i+2] + "\n";
		str += nstr;
	}
	console.log(str)
}