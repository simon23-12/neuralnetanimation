import * as THREE from 'three';

// Neural Network Configuration
const CONFIG = {
    layers: [16, 10000, 10000, 10000, 25], // Input (4x4), 3 hidden layers, output (A-Z minus J = 25)
    layerSpacing: 2, // Reduced from 3 to bring layers closer together
    neuronSize: 0.05,
    hiddenNeuronSize: 0.02, // Even smaller for performance
    connectionOpacity: 0.08, // Darkened from 0.15 for subtler effect
    connectionSampleRate: 0.015, // Reduced to 1.5% for better performance
    // Performance settings
    neuronSegments: 3, // Further reduced for smoother rotation
    hiddenNeuronSegments: 3,
    colors: {
        inputNeuronOn: 0x333333, // Swapped: "1" = dark/black
        inputNeuronOff: 0xffffff, // Swapped: "0" = white
        hiddenNeurons: 0xffffff, // Changed from gray to white
        outputNeurons: 0xffffff, // Changed from cyan to white
        connections: 0x333333, // Darker gray for connections
        pulseColor: 0xffffff // White pulse color (was cyan)
    }
};

// Scene setup
let scene, camera, renderer;
let neuronMeshes = [];
let connectionLines = [];
let pulses = []; // Active pulses traveling through connections
let isRotating = true;
let showConnections = true;
let rotationSpeed = 0.003; // Smooth rotation speed

// Shared geometries and materials for performance
let sharedGeometries = {};
let sharedMaterials = {};

// Animation time
let animationTime = 0;
let lastPulseTime = 0;

// Camera control state - start closer to the model
let targetCameraDistance = 6; // Closer initial zoom (was ~11.5)
let currentCameraDistance = targetCameraDistance;

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
    // Start closer to the model
    const initialAngle = Math.PI / 4;
    camera.position.set(
        targetCameraDistance * Math.cos(initialAngle),
        3,
        targetCameraDistance * Math.sin(initialAngle)
    );
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
        emissiveIntensity: 0.2, // 1s are darker
        shininess: 30
    });

    sharedMaterials.inputOff = new THREE.MeshPhongMaterial({
        color: CONFIG.colors.inputNeuronOff,
        emissive: CONFIG.colors.inputNeuronOff,
        emissiveIntensity: 0.5, // 0s are brighter (white)
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

function createTextSprite(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;

    // Draw text
    context.fillStyle = color;
    context.font = 'Bold 100px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    return sprite;
}

function buildNeuralNetwork() {
    const totalLayers = CONFIG.layers.length;
    const startX = -(totalLayers - 1) * CONFIG.layerSpacing / 2;

    // Create neurons for each layer
    CONFIG.layers.forEach((neuronCount, layerIndex) => {
        const x = startX + layerIndex * CONFIG.layerSpacing;
        const neurons = createLayer(neuronCount, x, layerIndex);
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

function createLayer(neuronCount, x, layerIndex) {
    const neurons = [];

    // Input layer: 4x4 text grid with alternating 0s and 1s (no spheres)
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

            // Create text sprite for "0" or "1" (larger and brighter)
            const sprite = createTextSprite(isOne ? '1' : '0', isOne ? '#555555' : '#ffffff');
            sprite.position.set(x, y, z);
            sprite.scale.set(0.25, 0.25, 1); // Larger text
            sprite.userData.isInputNeuron = true;
            sprite.userData.isOne = isOne;
            sprite.userData.pulseIntensity = 0;
            sprite.userData.baseOpacity = 1.0;

            scene.add(sprite);
            neurons.push(sprite); // Store sprite instead of mesh
        }
    }
    // Hidden layers: uniform smaller neurons in perfect square grids
    else if (layerIndex < CONFIG.layers.length - 1) {
        // Reduce display count by 1/3 and ensure perfect square
        const displayCount = Math.min(neuronCount, 667); // ~1000 * 2/3
        const gridSize = Math.floor(Math.sqrt(displayCount)); // Perfect square
        const actualCount = gridSize * gridSize;

        const spacing = 0.1; // Reduced spacing for tighter grid

        for (let i = 0; i < actualCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            const y = (row - gridSize / 2) * spacing;
            const z = (col - gridSize / 2) * spacing;

            // Reuse shared geometry and material
            const neuron = new THREE.Mesh(sharedGeometries.hidden, sharedMaterials.hidden);
            neuron.position.set(x, y, z);
            neuron.userData.phaseOffset = i * 0.05 + layerIndex; // Pre-calculate phase offset
            neuron.userData.randomFactor = Math.random(); // For thinking animation
            neuron.userData.pulseIntensity = 0; // For pulse lighting

            scene.add(neuron);
            neurons.push(neuron);
        }
    }
    // Output layer: Alphabet A-Z (minus J) as text sprites - 5x5 grid
    else {
        const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // 25 letters (no J)
        const cols = 5; // 5 columns
        const rows = 5; // 5 rows (perfect square)
        const spacing = 0.35;

        for (let i = 0; i < alphabet.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;

            const y = (row - rows / 2 + 0.5) * spacing;
            const z = (col - cols / 2 + 0.5) * spacing;

            // Create text sprite for each letter
            const sprite = createTextSprite(alphabet[i], '#ffffff');
            sprite.position.set(x, y, z);
            sprite.scale.set(0.3, 0.3, 1); // Larger text for output
            sprite.userData.isOutputNeuron = true;
            sprite.userData.letter = alphabet[i];
            sprite.userData.pulseIntensity = 0;
            sprite.userData.baseOpacity = 0.6; // Dimmer by default

            scene.add(sprite);
            neurons.push(sprite);
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
        line.userData.fromNeuron = fromNeuron; // Store source neuron
        line.userData.toNeuron = toNeuron; // Store target neuron

        scene.add(line);
        connectionLines.push(line);
    }
}

function createPulse(connection) {
    // No mesh needed - pulse is represented by line brightness
    pulses.push({
        connection: connection,
        progress: 0,
        speed: 0.03 + Math.random() * 0.02 // Speed of pulse traveling through line
    });
}

function animate() {
    requestAnimationFrame(animate);

    // Increment animation time (more efficient than Date.now())
    animationTime += 0.016; // ~60fps

    // Smooth camera zoom interpolation
    currentCameraDistance += (targetCameraDistance - currentCameraDistance) * 0.1;

    // Rotate camera around the scene with smooth interpolated distance
    if (isRotating) {
        const angle = Math.atan2(camera.position.z, camera.position.x);
        const newAngle = angle + rotationSpeed;

        camera.position.x = currentCameraDistance * Math.cos(newAngle);
        camera.position.z = currentCameraDistance * Math.sin(newAngle);
        camera.lookAt(0, 0, 0);
    }

    // Create new pulses periodically - starting from input layer
    if (animationTime - lastPulseTime > 0.2) { // Create pulse every 0.2 seconds
        lastPulseTime = animationTime;

        // Start pulses from random input neurons
        if (neuronMeshes.length > 0 && connectionLines.length > 0) {
            const numPulses = Math.min(3, Math.floor(connectionLines.length / 100));

            for (let i = 0; i < numPulses; i++) {
                // Find connections that start from input layer
                const inputConnections = connectionLines.filter(conn =>
                    conn.userData.fromNeuron.userData.isInputNeuron
                );

                if (inputConnections.length > 0) {
                    const randomConnection = inputConnections[Math.floor(Math.random() * inputConnections.length)];
                    createPulse(randomConnection);
                }
            }
        }
    }

    // Update pulses - create traveling wave effect
    for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.progress += pulse.speed;

        const connection = pulse.connection;

        if (pulse.progress >= 1) {
            // Pulse completed - light up target neuron brightly and propagate
            connection.userData.toNeuron.userData.pulseIntensity = 2.0;

            // Propagate pulse to next layer
            const targetNeuron = connection.userData.toNeuron;
            const nextLayerConnections = connectionLines.filter(conn =>
                conn.userData.fromNeuron === targetNeuron
            );

            // Always propagate to next layer for continuous flow
            if (nextLayerConnections.length > 0) {
                // Propagate to 1-2 random connections in next layer
                const numPropagate = Math.min(2, nextLayerConnections.length);
                for (let j = 0; j < numPropagate; j++) {
                    const nextConnection = nextLayerConnections[Math.floor(Math.random() * nextLayerConnections.length)];
                    createPulse(nextConnection);
                }
            }

            // Remove pulse
            pulses.splice(i, 1);
        } else {
            // Create traveling wave effect along the line
            if (connection.visible) {
                const pulseWidth = 0.3; // Width of the bright pulse area
                const pulseCenter = pulse.progress;

                // Calculate intensity based on distance from pulse center
                // This creates a traveling "wave" effect
                const distanceFromPulse = Math.abs(0.5 - pulseCenter);
                const intensity = Math.max(0, 1 - distanceFromPulse / pulseWidth);

                // Make the line bright where the pulse is
                connection.material.opacity = CONFIG.connectionOpacity + intensity * 0.8;

                // Color transition from dark to bright white
                const brightWhite = new THREE.Color(CONFIG.colors.pulseColor);
                const darkGray = new THREE.Color(CONFIG.colors.connections);
                connection.material.color.copy(darkGray).lerp(brightWhite, intensity);

                // Light up the source neuron/text at start of pulse
                if (pulse.progress < 0.15) {
                    connection.userData.fromNeuron.userData.pulseIntensity = 2.5;
                }

                // Light up target neuron as pulse approaches
                if (pulse.progress > 0.85) {
                    const approachIntensity = (pulse.progress - 0.85) / 0.15;
                    connection.userData.toNeuron.userData.pulseIntensity = Math.max(
                        connection.userData.toNeuron.userData.pulseIntensity,
                        approachIntensity * 1.5
                    );
                }
            }
        }
    }

    // Pre-calculate common sin values
    const time2 = Math.sin(animationTime * 2);
    const time05 = Math.sin(animationTime * 0.5);

    // Periodic flashing effect for input text (alternating 0s and 1s)
    if (neuronMeshes.length > 0) {
        const inputLayer = neuronMeshes[0];
        for (let i = 0; i < inputLayer.length; i++) {
            const sprite = inputLayer[i];

            // Decay pulse intensity
            sprite.userData.pulseIntensity *= 0.85;

            // Text sprites use opacity for brightness
            const baseOpacity = sprite.userData.isOne
                ? time05 * 0.1 + 0.5  // "1" text (gray) - subtle pulse
                : (time2 * 0.2 + 0.8) * 1.0; // "0" text (white) - brighter

            // Add pulse glow effect
            const pulseGlow = sprite.userData.pulseIntensity;
            sprite.material.opacity = Math.min(1, baseOpacity + pulseGlow * 0.5);

            // Scale effect when pulsed
            const scaleBoost = 1 + pulseGlow * 0.3;
            sprite.scale.set(0.25 * scaleBoost, 0.25 * scaleBoost, 1);
        }
    }

    // "Thinking" effect on hidden neurons with pulse lighting
    for (let layerIndex = 1; layerIndex < neuronMeshes.length - 1; layerIndex++) {
        const layer = neuronMeshes[layerIndex];
        const layerTime = animationTime * (1 + layerIndex * 0.2);

        for (let i = 0; i < layer.length; i++) {
            const neuron = layer[i];

            // Decay pulse intensity
            neuron.userData.pulseIntensity *= 0.9;

            // Create wave patterns across the grid with random variations
            const wave1 = Math.sin(layerTime + neuron.userData.phaseOffset);
            const wave2 = Math.sin(layerTime * 1.5 + neuron.userData.randomFactor * 10);
            const randomPulse = Math.sin(layerTime * 2 + neuron.userData.randomFactor * 20);

            // Combine waves for complex "thinking" pattern
            const thinking = (wave1 * 0.4 + wave2 * 0.3 + randomPulse * 0.3);
            const baseIntensity = Math.max(0.05, thinking * 0.25 + 0.2);

            // Add pulse lighting
            neuron.material.emissiveIntensity = Math.min(0.9, baseIntensity + neuron.userData.pulseIntensity);
        }
    }

    // Output alphabet layer animation
    if (neuronMeshes.length > 0) {
        const outputLayer = neuronMeshes[neuronMeshes.length - 1];
        for (let i = 0; i < outputLayer.length; i++) {
            const sprite = outputLayer[i];

            // Decay pulse intensity
            sprite.userData.pulseIntensity *= 0.85;

            // Base subtle glow
            const baseOpacity = 0.5 + Math.sin(animationTime * 0.5 + i * 0.3) * 0.1;

            // Add pulse glow effect
            const pulseGlow = sprite.userData.pulseIntensity;
            sprite.material.opacity = Math.min(1, baseOpacity + pulseGlow * 0.6);

            // Scale effect when pulsed (letters grow when activated)
            const scaleBoost = 1 + pulseGlow * 0.4;
            sprite.scale.set(0.3 * scaleBoost, 0.3 * scaleBoost, 1);
        }
    }

    // Fade connections back to normal color and opacity
    for (let i = 0; i < connectionLines.length; i++) {
        const line = connectionLines[i];
        if (line.visible) {
            // Gradually fade back to dark gray
            const currentColor = line.material.color.getHex();
            if (currentColor !== CONFIG.colors.connections) {
                line.material.color.lerp(new THREE.Color(CONFIG.colors.connections), 0.15);
            }

            // Gradually fade opacity back to base
            if (line.material.opacity > CONFIG.connectionOpacity) {
                line.material.opacity += (CONFIG.connectionOpacity - line.material.opacity) * 0.15;
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
    music.play().catch(err => {
        console.log('Autoplay prevented by browser:', err);
        // Music will play when user clicks any control button
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

    // Mouse wheel zoom - smooth interpolation
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.15;
        const direction = e.deltaY > 0 ? 1 : -1;

        // Update target distance, actual distance will smoothly interpolate in animate()
        targetCameraDistance *= (1 + direction * zoomSpeed);

        // Clamp zoom distance to reasonable bounds
        targetCameraDistance = Math.max(3, Math.min(30, targetCameraDistance));
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
