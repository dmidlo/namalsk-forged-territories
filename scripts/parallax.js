"use strict";
class Parallax {
    containerId;
    layers;
    constructor(containerId) {
        this.containerId = containerId;
        const container = document.getElementById(this.containerId);
        // Using querySelectorAll to ensure all direct children are selected
        this.layers = container.querySelectorAll(':scope > *');
        this.attachEvents();
    }
    attachEvents() {
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }
    handleMouseMove(event) {
        const { clientX, clientY, view } = event;
        if (!view) {
            return;
        }
        const { innerWidth, innerHeight } = view;
        const xPercent = (clientX / innerWidth - 0.5) * 2;
        const yPercent = (clientY / innerHeight - 0.5) * 2;
        this.layers.forEach((layer) => {
            // Accessing dataset values with type assertion for safety
            const depth = parseFloat(layer.dataset['depth'] || "0");
            const maxRange = parseFloat(layer.dataset['maxRange'] || "50");
            const xOffset = xPercent * maxRange * depth;
            const yOffset = yPercent * maxRange * depth;
            layer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    }
}
new Parallax('parallaxContainer');
//# sourceMappingURL=parallax.js.map