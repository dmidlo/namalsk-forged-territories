"use strict";
class Parallax {
    baseElement;
    parallaxContainer;
    layers;
    resizeObserver;
    options;
    constructor(options) {
        this.options = { ...options, smoothingFactor: 0.13 }; // Default smoothing factor
        this.parallaxContainer = document.getElementById(options.containerId);
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }
        this.layers = this.parallaxContainer.querySelectorAll('[data-depth]');
        this.baseElement = this.findBaseElement();
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers());
        this.initializeParallax();
    }
    findBaseElement() {
        const base = this.parallaxContainer.querySelector('[data-isBaseDimensions]');
        if (!base) {
            console.error("Base element with `data-isBaseDimensions` not found. Defaulting to first child.");
            if (this.parallaxContainer.children.length > 0) {
                return this.parallaxContainer.children[0];
            }
            else {
                console.warn("No children in parallax container. Creating an empty div as fallback.");
                const fallbackDiv = document.createElement('div');
                fallbackDiv.id = "layer-01";
                this.parallaxContainer.appendChild(fallbackDiv);
                return fallbackDiv;
            }
        }
        return base;
    }
    initializeParallax() {
        this.updateContainerAndLayers();
        this.attachEvents();
        this.setupResizeObserver();
    }
    updateContainerAndLayers() {
        const baseWidth = this.baseElement.offsetWidth;
        const baseHeight = this.baseElement.offsetHeight;
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }
    attachEvents() {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
    handleMouseMove(event) {
        const centerX = this.parallaxContainer.offsetWidth / 2;
        const centerY = this.parallaxContainer.offsetHeight / 2;
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;
        this.layers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth')) || 0;
            const maxRange = parseFloat(layer.getAttribute('data-maxRange')) || 0;
            let deltaX = (mouseX - centerX) * depth * this.options.smoothingFactor;
            let deltaY = (mouseY - centerY) * depth * this.options.smoothingFactor;
            const boundX = Math.min(Math.max(deltaX, -maxRange), maxRange);
            const boundY = Math.min(Math.max(deltaY, -maxRange), maxRange);
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }
    setupResizeObserver() {
        this.resizeObserver.observe(this.baseElement);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new Parallax({ containerId: 'parallaxContainer' });
});
//# sourceMappingURL=parallax.js.map