"use strict";
class Parallax {
    containerId;
    layers;
    canvas;
    container;
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            throw new Error('Container not found');
        }
        this.layers = this.container.querySelectorAll(':scope > *');
        this.canvas = this.container.querySelector('[data-is-canvas="true"]');
        // Automatically assign z-index based on depth
        this.assignZIndex();
        // Update container height based on canvas height
        this.updateContainerHeight();
        this.attachEvents();
    }
    assignZIndex() {
        const layersArray = Array.from(this.layers);
        layersArray.sort((a, b) => {
            const depthA = parseFloat(a.dataset['depth'] || "0");
            const depthB = parseFloat(b.dataset['depth'] || "0");
            return depthB - depthA; // Sort in descending order of depth
        });
        layersArray.forEach((layer, index) => {
            layer.style.zIndex = (layersArray.length - index).toString();
        });
    }
    updateContainerHeight() {
        if (this.canvas) {
            this.container.style.height = getComputedStyle(this.canvas).height;
        }
    }
    attachEvents() {
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        window.addEventListener('resize', () => this.updateContainerHeight()); // Adjust container height on window resize
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