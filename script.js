// Neural Network Configuration
const CONFIG = {
    layers: [784, 10000, 10000, 10000, 10], // Input, hidden layers, output
    layerSpacing: 3,
    neuronSize: 0.05,
    connectionOpacity: 0.15,
    connectionSampleRate: 0.02, // 2% of connections shown
    colors: {
        inputNeurons: 0xffffff,
        hiddenNeurons: 0x888888,
        outputNeurons: 0x0088ff,
        connections: 0x00ffff
    }
};

// Scene setup
let scene, camera, renderer;
let neuronMeshes = [];
let connectionLines = [];
let isRotating = true;
let showConnections = true;
let rotationSpeed = 0.0005;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);

    // Camera
    const container = document.getElementById('canvas-container');
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(8, 3, 8);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0088ff, 0.5, 100);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Build neural network
    buildNeuralNetwork();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    setupControls();

    // Start animation
    animate();
}

function buildNeuralNetwork() {
    const totalLayers = CONFIG.layers.length;
    const startX = -(totalLayers - 1) * CONFIG.layerSpacing / 2;

    // Create neurons for each layer
    CONFIG.layers.forEach((neuronCount, layerIndex) => {
        const x = startX + layerIndex * CONFIG.layerSpacing;
        const neurons = createLayer(neuronCount, x, layerIndex, totalLayers);
        neuronMeshes.push(neurons);

        // Create connections to previous layer
        if (layerIndex > 0) {
            createConnections(
                neuronMeshes[layerIndex - 1],
                neurons,
                CONFIG.connectionSampleRate
            );
        }
    });
}

function createLayer(neuronCount, x, layerIndex, totalLayers) {
    const neurons = [];
    let color;

    // Determine neuron color based on layer type
    if (layerIndex === 0) {
        color = CONFIG.colors.inputNeurons;
    } else if (layerIndex === totalLayers - 1) {
        color = CONFIG.colors.outputNeurons;
    } else {
        color = CONFIG.colors.hiddenNeurons;
    }

    // For large layers, use instanced rendering for better performance
    const displayCount = Math.min(neuronCount, 1000); // Limit visual neurons
    const spacing = Math.sqrt(displayCount) * 0.15;
    const gridSize = Math.ceil(Math.sqrt(displayCount));

    for (let i = 0; i < displayCount; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        const y = (row - gridSize / 2) * 0.15 + (Math.random() - 0.5) * 0.05;
        const z = (col - gridSize / 2) * 0.15 + (Math.random() - 0.5) * 0.05;

        const geometry = new THREE.SphereGeometry(CONFIG.neuronSize, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 30
        });

        const neuron = new THREE.Mesh(geometry, material);
        neuron.position.set(x, y, z);

        scene.add(neuron);
        neurons.push(neuron);
    }

    return neurons;
}

function createConnections(fromLayer, toLayer, sampleRate) {
    const connectionCount = Math.floor(fromLayer.length * toLayer.length * sampleRate);

    for (let i = 0; i < connectionCount; i++) {
        const fromNeuron = fromLayer[Math.floor(Math.random() * fromLayer.length)];
        const toNeuron = toLayer[Math.floor(Math.random() * toLayer.length)];

        const points = [
            fromNeuron.position,
            toNeuron.position
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: CONFIG.colors.connections,
            opacity: CONFIG.connectionOpacity,
            transparent: true
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);
        connectionLines.push(line);
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Rotate camera around the scene
    if (isRotating) {
        const radius = Math.sqrt(
            camera.position.x ** 2 + camera.position.z ** 2
        );
        const angle = Math.atan2(camera.position.z, camera.position.x);
        const newAngle = angle + rotationSpeed;

        camera.position.x = radius * Math.cos(newAngle);
        camera.position.z = radius * Math.sin(newAngle);
        camera.lookAt(0, 0, 0);
    }

    // Subtle pulsing effect on neurons
    const time = Date.now() * 0.001;
    neuronMeshes.forEach((layer, layerIndex) => {
        layer.forEach((neuron, neuronIndex) => {
            const pulse = Math.sin(time + neuronIndex * 0.1 + layerIndex) * 0.3 + 0.7;
            neuron.material.emissiveIntensity = pulse * 0.3;
        });
    });

    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function setupControls() {
    // Toggle rotation
    document.getElementById('toggleRotation').addEventListener('click', () => {
        isRotating = !isRotating;
        document.getElementById('toggleRotation').textContent =
            isRotating ? 'Pause Rotation' : 'Resume Rotation';
    });

    // Reset camera
    document.getElementById('resetCamera').addEventListener('click', () => {
        camera.position.set(8, 3, 8);
        camera.lookAt(0, 0, 0);
    });

    // Toggle connections
    document.getElementById('toggleConnections').addEventListener('click', () => {
        showConnections = !showConnections;
        connectionLines.forEach(line => {
            line.visible = showConnections;
        });
    });

    // Mouse interaction for manual rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            const radius = Math.sqrt(
                camera.position.x ** 2 + camera.position.z ** 2
            );
            const angle = Math.atan2(camera.position.z, camera.position.x);
            const newAngle = angle + deltaX * 0.01;

            camera.position.x = radius * Math.cos(newAngle);
            camera.position.z = radius * Math.sin(newAngle);
            camera.position.y += deltaY * 0.01;
            camera.lookAt(0, 0, 0);

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Mouse wheel zoom
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const direction = e.deltaY > 0 ? 1 : -1;

        camera.position.multiplyScalar(1 + direction * zoomSpeed);
        camera.lookAt(0, 0, 0);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
