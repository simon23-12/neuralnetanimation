# Neural Network 3D Visualization

Eine interaktive 3D-Visualisierung eines neuronalen Netzwerks mit Three.js, inspiriert von klassischen ML-Perceptron-Darstellungen.

## Features

- Interaktive 3D-Darstellung mit automatischer Kamera-Rotation
- Visualisierung mehrerer Layer (Input, Hidden, Output)
- Synapsen-Verbindungen zwischen Neuronen (2% Sample-Rate für Performance)
- Pulsierender Effekt auf Neuronen
- Manuelle Kamera-Steuerung per Maus
- Zoom-Funktion mit Mausrad
- Steuerungselemente zum Pausieren der Rotation und Ein-/Ausblenden von Verbindungen

## Installation

Keine Installation notwendig - einfach die `index.html` in einem modernen Browser öffnen.

## Verwendung

### Steuerelemente

- **Pause/Resume Rotation**: Stoppt oder startet die automatische Kamera-Rotation
- **Reset Camera**: Setzt die Kamera auf die Standardposition zurück
- **Toggle Connections**: Blendet die Synapsen-Verbindungen ein/aus

### Maus-Interaktion

- **Linke Maustaste + Ziehen**: Manuelle Rotation der Kamera
- **Mausrad**: Zoom in/out

## Anpassung

Du kannst die Visualisierung in der `script.js` anpassen:

```javascript
const CONFIG = {
    layers: [784, 10000, 10000, 10000, 10],  // Anzahl Neuronen pro Layer
    layerSpacing: 3,                          // Abstand zwischen Layern
    neuronSize: 0.05,                         // Größe der Neuronen
    connectionOpacity: 0.15,                  // Transparenz der Verbindungen
    connectionSampleRate: 0.02,               // Prozentsatz angezeigter Verbindungen
    colors: {
        inputNeurons: 0xffffff,               // Farbe Input-Layer
        hiddenNeurons: 0x888888,              // Farbe Hidden-Layer
        outputNeurons: 0x0088ff,              // Farbe Output-Layer
        connections: 0x00ffff                 // Farbe Verbindungen
    }
};
```

### Beispiele für verschiedene Netzwerk-Architekturen

#### Kleines Netzwerk (schnell)
```javascript
layers: [100, 50, 25, 10]
```

#### Klassisches MNIST
```javascript
layers: [784, 128, 64, 10]
```

#### Tiefes Netzwerk
```javascript
layers: [784, 512, 256, 128, 64, 10]
```

## Performance-Optimierung

- Die Anzahl der visuell dargestellten Neuronen ist auf 1000 pro Layer begrenzt
- Nur 2% der Verbindungen werden standardmäßig angezeigt
- Für bessere Performance kannst du `connectionSampleRate` weiter reduzieren

## Verwendung auf Websites

### Einbindung als iFrame
```html
<iframe src="path/to/neural-network-visualization/index.html"
        width="100%"
        height="600px"
        frameborder="0">
</iframe>
```

### Direkte Integration
Kopiere den Code aus `script.js` und passe das HTML nach deinen Bedürfnissen an.

### Als Modul
```javascript
import * as THREE from 'three';
// Dann den Code aus script.js verwenden
```

## Technologie

- Three.js r152
- Vanilla JavaScript (keine zusätzlichen Dependencies)
- Responsive Design

## Browser-Kompatibilität

- Chrome/Edge (empfohlen)
- Firefox
- Safari
- Benötigt WebGL-Unterstützung

## Lizenz

Frei verwendbar für persönliche und kommerzielle Projekte.
