import * as THREE from 'three';

// Neural Network Configuration
const CONFIG = {
    layers: [16, 10000, 10000, 10000, 10], // Input (4x4), hidden layers, output
    layerSpacing: 3,
    neuronSize: 0.05,
    hiddenNeuronSize: 0.03, // Smaller uniform size for hidden layers
    connectionOpacity: 0.15,
    connectionSampleRate: 0.02, // 2% of connections shown
    // Performance settings
    neuronSegments: 4, // Low-poly spheres for better performance (was 8)
    hiddenNeuronSegments: 3, // Even lower for hidden neurons (was 6)
    colors: {
        inputNeuronOn: 0xffffff,
        inputNeuronOff: 0x333333,
        hiddenNeurons: 0x888888,
        outputNeurons: 0x0088ff,
        connections: 0x666666 // Gray color for connections
    }
};

// Scene setup
let scene, camera, renderer;
let neuronMeshes = [];
let connectionLines = [];
let isRotating = true;
let showConnections = true;
let rotationSpeed = 0.002; // 4x faster (was 0.0005)

// Shared geometries and materials for performance
let sharedGeometries = {};
let sharedMaterials = {};

// Animation time
let animationTime = 0;

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
    renderer = new THREE.WebGLRenderer({
        antialias: false, // Disable for better performance
        powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
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

    // Create shared geometries and materials
    createSharedResources();

    // Build neural network
    buildNeuralNetwork();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    setupControls();

    // Start animation
    animate();
}

function createSharedResources() {
    // Shared geometries (reused across all neurons of same type)
    sharedGeometries.input = new THREE.SphereGeometry(CONFIG.neuronSize, CONFIG.neuronSegments, CONFIG.neuronSegments);
    sharedGeometries.hidden = new THREE.SphereGeometry(CONFIG.hiddenNeuronSize, CONFIG.hiddenNeuronSegments, CONFIG.hiddenNeuronSegments);
    sharedGeometries.output = new THREE.SphereGeometry(CONFIG.neuronSize, CONFIG.neuronSegments, CONFIG.neuronSegments);

    // Shared materials
    sharedMaterials.inputOn = new THREE.MeshPhongMaterial({
        color: CONFIG.colors.inputNeuronOn,
        emissive: CONFIG.colors.inputNeuronOn,
        emissiveIntensity: 0.5,
        shininess: 30
    });

    sharedMaterials.inputOff = new THREE.MeshPhongMaterial({
        color: CONFIG.colors.inputNeuronOff,
        emissive: CONFIG.colors.inputNeuronOff,
        emissiveIntensity: 0.1,
        shininess: 30
    });

    sharedMaterials.hidden = new THREE.MeshPhongMaterial({
        color: CONFIG.colors.hiddenNeurons,
        emissive: CONFIG.colors.hiddenNeurons,
        emissiveIntensity: 0.2,
        shininess: 30
    });

    sharedMaterials.output = new THREE.MeshPhongMaterial({
        color: CONFIG.colors.outputNeurons,
        emissive: CONFIG.colors.outputNeurons,
        emissiveIntensity: 0.3,
        shininess: 30
    });

    sharedMaterials.connection = new THREE.LineBasicMaterial({
        color: CONFIG.colors.connections,
        opacity: CONFIG.connectionOpacity,
        transparent: true
    });
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

    // Input layer: 4x4 grid with alternating 0s and 1s
    if (layerIndex === 0) {
        const gridSize = 4;
        const spacing = 0.3;

        for (let i = 0; i < 16; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            // Checkerboard pattern for 0s and 1s
            const isOne = (row + col) % 2 === 0;

            const y = (row - gridSize / 2 + 0.5) * spacing;
            const z = (col - gridSize / 2 + 0.5) * spacing;

            // Reuse shared geometry and material
            const neuron = new THREE.Mesh(
                sharedGeometries.input,
                isOne ? sharedMaterials.inputOn : sharedMaterials.inputOff
            );
            neuron.position.set(x, y, z);
            neuron.userData.isInputNeuron = true;
            neuron.userData.isOne = isOne;
            neuron.userData.baseIntensity = isOne ? 0.5 : 0.1;

            scene.add(neuron);
            neurons.push(neuron);
        }
    }
    // Hidden layers: uniform smaller neurons
    else if (layerIndex < totalLayers - 1) {
        const displayCount = Math.min(neuronCount, 1000);
        const gridSize = Math.ceil(Math.sqrt(displayCount));

        for (let i = 0; i < displayCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            const y = (row - gridSize / 2) * 0.15;
            const z = (col - gridSize / 2) * 0.15;

            // Reuse shared geometry and material
            const neuron = new THREE.Mesh(sharedGeometries.hidden, sharedMaterials.hidden);
            neuron.position.set(x, y, z);
            neuron.userData.phaseOffset = i * 0.1 + layerIndex; // Pre-calculate phase offset

            scene.add(neuron);
            neurons.push(neuron);
        }
    }
    // Output layer
    else {
        const spacing = 0.2;
        for (let i = 0; i < neuronCount; i++) {
            const y = (i - neuronCount / 2 + 0.5) * spacing;

            // Reuse shared geometry and material
            const neuron = new THREE.Mesh(sharedGeometries.output, sharedMaterials.output);
            neuron.position.set(x, y, 0);
            neuron.userData.phaseOffset = i * 0.1 + layerIndex; // Pre-calculate phase offset

            scene.add(neuron);
            neurons.push(neuron);
        }
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

        // Clone shared material for individual opacity control
        const material = sharedMaterials.connection.clone();

        const line = new THREE.Line(geometry, material);
        line.userData.baseOpacity = CONFIG.connectionOpacity;
        line.userData.flashOffset = Math.random() * Math.PI * 2; // Random phase for flashing

        scene.add(line);
        connectionLines.push(line);
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Increment animation time (more efficient than Date.now())
    animationTime += 0.016; // ~60fps

    // Rotate camera around the scene (always active, regardless of connection visibility)
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

    // Pre-calculate common sin values
    const time2 = Math.sin(animationTime * 2);
    const time05 = Math.sin(animationTime * 0.5);

    // Periodic flashing effect for input neurons (alternating 0s and 1s)
    if (neuronMeshes.length > 0) {
        const inputLayer = neuronMeshes[0];
        for (let i = 0; i < inputLayer.length; i++) {
            const neuron = inputLayer[i];
            if (neuron.userData.isOne) {
                // "1" neurons flash periodically
                neuron.material.emissiveIntensity = (time2 * 0.3 + 0.7) * 0.6;
            } else {
                // "0" neurons stay dim with subtle pulse
                neuron.material.emissiveIntensity = time05 * 0.05 + 0.1;
            }
        }
    }

    // Subtle pulsing effect on hidden and output neurons
    for (let layerIndex = 1; layerIndex < neuronMeshes.length; layerIndex++) {
        const layer = neuronMeshes[layerIndex];
        for (let i = 0; i < layer.length; i++) {
            const neuron = layer[i];
            // Use pre-calculated phase offset from userData
            const pulse = Math.sin(animationTime + neuron.userData.phaseOffset) * 0.15 + 0.2;
            neuron.material.emissiveIntensity = pulse;
        }
    }

    // Optimize connection flashing - only update visible connections, skip every other frame
    if (Math.floor(animationTime * 60) % 2 === 0) {
        const flashSpeed = 3;
        for (let i = 0; i < connectionLines.length; i++) {
            const line = connectionLines[i];
            if (line.visible) {
                const flash = Math.sin(animationTime * flashSpeed + line.userData.flashOffset);
                // Only some connections flash at a time (creates wave effect)
                line.material.opacity = flash > 0.7
                    ? CONFIG.connectionOpacity + (flash - 0.7) * 0.5
                    : CONFIG.connectionOpacity;
            }
        }
    }

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

    // Toggle music
    const music = document.getElementById('background-music');
    document.getElementById('toggleMusic').addEventListener('click', () => {
        if (music.paused) {
            music.play();
            document.getElementById('toggleMusic').textContent = 'Mute Music';
        } else {
            music.pause();
            document.getElementById('toggleMusic').textContent = 'Play Music';
        }
    });

    // Auto-play music (some browsers require user interaction)
    music.volume = 0.5; // Set volume to 50%

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
