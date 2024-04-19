"use strict";
/**
 * Parallax class to handle dynamic dimensional updates and interactive mouse parallax effects with responsiveness.
 */
class Parallax {
    baseElement; // Element used as the dimension anchor
    parallaxContainer; // Container for all parallax layers
    layers; // Collection of all parallax layers
    resizeObserver; // Observer to handle dimension changes
    /**
     * Constructor to initialize the Parallax effect.
     * @param containerId The ID of the container element that holds all parallax layers.
     */
    constructor(containerId) {
        this.parallaxContainer = document.getElementById(containerId);
        this.layers = this.parallaxContainer.querySelectorAll('[data-depth]');
        this.baseElement = this.findBaseElement();
        this.resizeObserver = new ResizeObserver(() => {
            this.updateContainerAndLayers();
        });
        this.setupInitialDimensions();
        this.attachEvents();
        this.setupResizeObserver();
    }
    /**
     * Searches and returns the element with `data-isBaseDimensions`, expected to be exactly one.
     * @returns The HTMLElement that is the base for dimension calculations.
     */
    findBaseElement() {
        const base = this.parallaxContainer.querySelector('[data-isBaseDimensions]');
        if (!base)
            throw new Error("Base element with `data-isBaseDimensions` not found.");
        return base;
    }
    /**
     * Initializes the container and layer dimensions based on the base element's size.
     */
    setupInitialDimensions() {
        this.updateContainerAndLayers();
    }
    /**
     * Updates both the dimensions of the parallax container and its child layers to keep proportions responsive.
     */
    updateContainerAndLayers() {
        const baseWidth = this.baseElement.offsetWidth;
        const baseHeight = this.baseElement.offsetHeight;
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }
    /**
     * Attaches mouse move event to enable interactive parallax effect.
     */
    attachEvents() {
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event)); // Event Delegation
    }
    /**
     * Handles mouse movement to apply parallax effects on layers based on their depth and max range.
     * @param event The mouse event containing the cursor's current coordinates.
     */
    handleMouseMove(event) {
        const centerX = this.parallaxContainer.offsetWidth / 2;
        const centerY = this.parallaxContainer.offsetHeight / 2;
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;
        this.layers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth'));
            const maxRange = parseFloat(layer.getAttribute('data-maxRange'));
            const smoothingFactor = 0.13; // Adjusts the sensitivity of the parallax effect
            const deltaX = (mouseX - centerX) * depth * smoothingFactor;
            const deltaY = (mouseY - centerY) * depth * smoothingFactor;
            const boundX = Math.min(Math.max(deltaX, -maxRange), maxRange);
            const boundY = Math.min(Math.max(deltaY, -maxRange), maxRange);
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }
    /**
     * Sets up a resize observer to dynamically adjust dimensions based on base element changes.
     */
    setupResizeObserver() {
        this.resizeObserver.observe(this.baseElement);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new Parallax('parallaxContainer');
});
//# sourceMappingURL=parallax.js.map