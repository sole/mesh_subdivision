window.onload = function() {
	init();
}

function init() {
	var canvas_w, canvas_h, scene, renderer,
		camera, cam_radius = 400, cam_target = new THREE.Vector3(0, 0, 0),
		axis,
		mesh,
		animating = false,
		last_time = Date.now(),
		mouse_x, mouse_y,
		rotation_x = 0, rotation_z = 0,
		spans = document.querySelectorAll('span,a'),
		scene_properties = {
			number_passes: 3,
			background_color: 0xbbbbbb,
			wireframe: false,
			wirewidth: 1,
			wirecolor: 0xFF0000,
			color_1: 0xFF0000,
			color_2: 0x00FF00,
			color_3: 0x0000FF,
			wobbly: false,
			wobbly_speed: 1,
			rotation_speed_x: 1,
			rotation_speed_z: 1,
			camera_x: 0,
			camera_y: 0,
			camera_z: 10,
			draw_axis: true
		};
	
	if ( ! Detector.webgl ) {
		Detector.addGetWebGLMessage();
		return;
	}

	if(window.location.hash) {
		initialiseWithHash(window.location.hash);
	}
	
	for(var i = 0; i < spans.length; i++) {
		spans[i].originalText = spans[i].textContent;
	}
	
	canvas_w = window.innerWidth;
	canvas_h = window.innerHeight;
	//http://code.google.com/p/chromium/issues/detail?id=82086
	renderer = new THREE.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
	renderer.setSize(canvas_w, canvas_h);
	renderer.setClearColor(scene_properties.background_color, 1);

	document.body.appendChild(renderer.domElement);


	setup();
	
	setupControls();
	
	animate();
	
	// ~~~
	
	function initialiseWithHash(hash) {
		
		try {
			var encoded = hash.substr(1),
				serialised = atob(encoded),
				unserialised = JSON.parse(serialised);
		
			scene_properties = unserialised;
		} catch(ohnoes) {
			// don't care!
			window.location = window.location.href.split('#')[0];
		}
	}
	
	function updateHash() {
		var serialised = JSON.stringify(scene_properties),
			hash = btoa(serialised);
		
		window.location.hash = hash;
	}
	
	function setup() {
		
		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 10000);
		scene.add(camera);
	
		axis = setupAxis(scene);
		setAxisVisible(scene_properties.draw_axis);
		
		mesh = setupMesh(300, scene_properties.number_passes, scene_properties.wireframe);
		scene.add(mesh);
		
		animating = true;
	}
	
	function setupAxis(scene) {
		var axis = [ 
			{ points: [ [0, 0, 0], [1000, 0, 0] ], color: 0xFF0000}, // +X
			{ points: [ [0, 0, 0], [-1000, 0, 0] ], color: 0x400000}, // -X
			{ points: [ [0, 0, 0], [0, 1000, 0] ], color: 0x00FF00}, // +Y
			{ points: [ [0, 0, 0], [0, -1000, 0] ], color: 0x004000}, // -Y
		]
		
		var axisObject = new THREE.Object3D();
		
		for(var m = 0; m < axis.length; m++) {
			var ax = axis[m],
				geom = new THREE.Geometry();
			for(var j = 0; j < ax.points.length; j++) {
				var p = ax.points[j];
				geom.vertices.push(new THREE.Vector3(p[0], p[1], p[2] ));
			}
			var mat = new THREE.LineBasicMaterial({color: ax.color, linewidth: 2 });
			var ax_line = new THREE.Line(geom, mat);
			ax_line.position.x = 0;
			ax_line.position.y = 0;
			ax_line.position.z = 0;
			axisObject.add(ax_line);
		}
		
		scene.add(axisObject);
		
		return axisObject;
	}
	
	function setupMesh(length, num_passes, wireframe) {
		
		var vertex_list = [],
			face_list = [];
		
		var vecs = [[ 1,  1,  1 ], [ -1, -1, 1 ], [ -1, 1, -1 ], [ 1, -1, -1 ]];
		vertex_list = [];
		vecs.forEach(function(v) {
			var vec3 = new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(length/2);
			vertex_list.push(vec3);
		});
		
		face_list.push( new THREE.Face3( 0, 1, 2) );
		face_list.push( new THREE.Face3( 0, 2, 3) );
		face_list.push( new THREE.Face3( 0, 3, 1) );
		face_list.push( new THREE.Face3( 3, 2, 1) );
		
	
		// subdivide
		var v1, v2, v3, v4,
			p1, p2, p3, p4,
			face, num_faces, face1, face2;

		for(var i = 0; i < num_passes; i++) {
			
			num_faces = face_list.length;
			
			for(var j = 0; j < num_faces; j++) {
				face = face_list[j];
				
				v1 = face.a;
				v2 = face.b;
				v3 = face.c;
				
				p1 = vertex_list[v1];
				p2 = vertex_list[v2];
				p3 = vertex_list[v3];
				
				p4 = new THREE.Vector3(
					(p1.x + p2.x + p3.x) / 3.0,
					(p1.y + p2.y + p3.y) / 3.0,
					(p1.z + p2.z + p3.z) / 3.0
				);
				
				vertex_list.push(p4);
				
				v4 = vertex_list.length - 1;
				
				face.a = v1;
				face.b = v4;
				face.c = v3;
				
				face1 = new THREE.Face3( v1, v2, v4 );
				face_list.push(face1);
				
				face2 = new THREE.Face3( v2, v3, v4 );
				face_list.push(face2);
			}
		}
		
		var colors = [ scene_properties.color_1, scene_properties.color_2, scene_properties.color_3 ],
			colors_list = [];
		
		for(var i = 0; i < vertex_list.length; i++) {
			var v = vertex_list[i],
				pos = v;

			v.originalPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
		}
		
		if(!wireframe) {
			for(var i = 0; i < face_list.length; i++) {
				var f = face_list[i];
				for(var j = 0; j < 3; j++) {
					f.vertexColors[j] = new THREE.Color( colors[j] );
				}
			}
		}
		
		var geometry = new THREE.Geometry();
		
		geometry.vertices = vertex_list;
		geometry.faces = face_list;
		
		geometry.dynamic = true;
		
		var mat;
		
		if(wireframe) {
			mat = new THREE.MeshBasicMaterial({ wireframeLinewidth: scene_properties.wirewidth, color: scene_properties.wirecolor, wireframe: true });
		} else {
			mat = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });
			geometry.vertexColors = colors_list;
		}
		
		var mesh = new THREE.Mesh(geometry, mat);
		mesh.doubleSided = true;
		
		return mesh;
	}
	
	function setupControls() {
		var gui = new dat.GUI(),
			updateListener = function() {
				animating = false;
				setup();
				updateHash();
			};
		
		
		// number passes
		gui.add(scene_properties, 'number_passes', 0, 8).step(1).onChange(updateListener);
		
		// background
		gui.addColor(scene_properties, 'background_color').onChange(function(v) {
			
			scene_properties.background_color = v;
			renderer.setClearColorHex(v, 1);
			updateHash();
		});
		
		// wireframe?
		gui.add(scene_properties, 'wireframe').onChange(updateListener);
		gui.add(scene_properties, 'wirewidth', 1, 10).step(1).onChange(updateListener);
		gui.addColor(scene_properties, 'wirecolor').onChange(updateListener);
		
		// face colors
		gui.addColor(scene_properties, 'color_1').onChange(updateListener);
		gui.addColor(scene_properties, 'color_2').onChange(updateListener);
		gui.addColor(scene_properties, 'color_3').onChange(updateListener);
		
		gui.add(scene_properties, 'wobbly').onChange(function(value) {
			scene_properties.wobbly = value;
			updateHash();
		});
		
		gui.add(scene_properties, 'wobbly_speed', 1, 10).onChange(function(value) {
			scene_properties.wobbly_speed = value;
			updateHash();
		});
		
		gui.add(scene_properties, 'rotation_speed_x', 1, 10).onChange(function(v) { updateHash(); });
		gui.add(scene_properties, 'rotation_speed_z', 1, 10).onChange(function(v) { updateHash(); });
		
		// camera position x, y, z
		var range = 200;
		gui.add(scene_properties, 'camera_x', -range, range).onChange(function(v) { updateHash(); });
		gui.add(scene_properties, 'camera_y', -range, range).onChange(function(v) { updateHash(); });
		gui.add(scene_properties, 'camera_z', -range, range).onChange(function(v) { updateHash(); });
		
		
		// axis
		gui.add(scene_properties, 'draw_axis').onChange(function(value) {
			scene_properties.draw_axis = value;
			setAxisVisible(value);
			updateHash();
		});
		
		// get screenshot
		scene_properties.screenshot = function() {
			var canvas = renderer.domElement;
			canvas.toBlob(function(blob) {
				var d = new Date();
				saveAs(blob, 'ms-' + d.toUTCString().replace(/( |\:|,)+/g, '_') + '.png');
			});
		}
		gui.add(scene_properties, 'screenshot');
	}
	
	function setAxisVisible(value) {
		/*THREE.SceneUtils.traverseHierarchy(axis, function(o) {
			o.visible = value;
		});*/
	}
	
	function animate() {
		render();
		if(animating) {
			requestAnimationFrame(animate);
		}
	}
	
	function render() {
		var t = Date.now(),
			elapsed = t - last_time,
			t2 = t * 0.1,
			t3 = t / 10000;
		
		var geometry = mesh.geometry,
			vertices = geometry.vertices;
			
		last_time = t;
		
		if(scene_properties.wobbly) {
			var speed = scene_properties.wobbly_speed;
			for(var i = 0 ; i < vertices.length; i++) {
				var v = vertices[i],
					ov = vertices[i].originalPosition,
					tt = (speed * t * 0.00005) + i;
				
				v.x = ov.x + 25 * Math.sin(tt);
				v.y = ov.y + 25 * Math.cos(tt*0.5);
				v.z = ov.z + 25 * (-Math.sin(v.x) );
			}
			geometry.verticesNeedUpdate = true;
		}
		
		
		var x_sign = mouse_x > window.innerHeight / 2 ? 1 : -1;
		var z_sign = mouse_y > window.innerWidth / 2 ? 1 : -1;
		rotation_x += elapsed * 0.0001 * scene_properties.rotation_speed_x * x_sign;
		rotation_z += elapsed * 0.0001 * scene_properties.rotation_speed_z * z_sign;
		
		mesh.rotation.x = rotation_x;
		mesh.rotation.z = rotation_z;
		
		camera.position.x = scene_properties.camera_x;
		camera.position.y = scene_properties.camera_y;
		camera.position.z = scene_properties.camera_z;
		
		camera.lookAt( cam_target );
		
		renderer.render(scene, camera);
		
		if(Math.random() > 0.9) {
			
			for(var i = 0; i < spans.length; i++) {
			
				var span = spans[i];
				
				if(Math.random() > 0.8) {
					for(var j = 0; j < Math.random() * 6; j++) {
						var text = span.textContent;
						//console.log(span, text);
						if(text === undefined) {
							break;
						}
						var pos = Math.floor(Math.random() * text.length);
						var replacement = Math.random() > 0.5 ? text[pos].toUpperCase() : String.fromCharCode(33 + (Math.random() * 50)>>0);
						span.textContent = text.substring(0, pos) + replacement + text.substring(pos + 1, text.length);
					}
				} else {
					span.textContent = span.originalText;
				}
				
			}
		}
	}
}

