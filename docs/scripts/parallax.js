"use strict";
class Parallax {
    baseElement; // Defines the parallax container's dimensions.
    parallaxContainer; // Container for all parallax layers.
    children; // Child elements within the container, potential layers.
    layers; // Configured parallax layers.
    resizeObserver; // Monitors size changes of the base element.
    options; // Configurable options for behavior and responsiveness.
    inputX = 0; // Default initialization to 0 to ensure value is always defined.
    inputY = 0; // Default initialization to 0 to ensure value is always defined.
    attachDeviceOrientationListener; // Asynchronously attaches a device orientation event listener.
    constructor(options) {
        const defaults = {
            smoothingFactor: 0.13, // Default smoothing factor for movement smoothness.
            gyroEffectModifier: 10, // Default gyro effect modifier for device orientation sensitivity.
        };
        // Calculate default sensitivity if not provided, adjusting for device and display characteristics.
        if (options.sensitivity === undefined) {
            options.sensitivity = this.computeSensitivity();
        }
        this.options = { ...defaults, ...options }; // Merge user-provided options with defaults.
        this.parallaxContainer = document.getElementById(options.containerId);
        // Validate the existence of the specified container to ensure subsequent operations.
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }
        // Identify and configure all child elements that represent parallax layers.
        this.children = this.parallaxContainer.querySelectorAll('[data-depth]');
        this.layers = this.initializeLayers(); // Set depth and maxRange based on data attributes.
        // Determine the base element for setting dimensions and reference for resizing.
        this.baseElement = this.findBaseElement();
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers()); // Monitor size changes for dynamic responsiveness.
        this.initializeParallax(); // Complete the setup by initializing dimensions, attaching event handlers, and starting observers.
        this.attachDeviceOrientationListener = this._attachDeviceOrientationAndMotionListener.bind(this); // Prepare device orientation handling with permissions.
    }
    initializeLayers() {
        // Map through children to assign depth and maxRange properties based on data attributes.
        const layers = Array.from(this.children).map(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth') ?? '0'); // Default depth is 0 if attribute is absent.
            const maxRange = parseFloat(layer.getAttribute('data-max-range') ?? '0'); // Default maxRange is 0 if attribute is absent.
            Object.assign(layer, { depth, maxRange }); // Update layer with parsed properties.
            return layer; // Cast back to ParallaxLayer type.
        });
        return layers; // Return NodeList of configured layers.
    }
    findBaseElement() {
        const base = this.parallaxContainer.querySelector('[data-is-base-dimensions]');
        if (!base) {
            console.error("Base element with `data-is-base-dimensions` not found. Defaulting to first child.");
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
    setupResizeObserver() {
        // Observe size changes in the base element to update the parallax dimensions responsively.
        this.resizeObserver.observe(this.baseElement);
    }
    updateContainerAndLayers(baseWidth = this.baseElement.offsetWidth, baseHeight = this.baseElement.offsetHeight) {
        // Apply the specified or current base element dimensions to the container's CSS properties.
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }
    getCenterXY() {
        // Calculate the vertical center of the container.
        const centerY = this.parallaxContainer.offsetHeight / 2;
        // Calculate the horizontal center of the container.
        const centerX = this.parallaxContainer.offsetWidth / 2;
        // Return the calculated center coordinates.
        return [centerX, centerY];
    }
    handleMouseMove(event) {
        const [centerX, centerY] = this.getCenterXY();
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;
        this.inputX = (mouseX - centerX) / centerX;
        this.inputY = (mouseY - centerY) / centerY;
        const mouseModifierX = this.options.smoothingFactor ?? 0.1; // Default or specified smoothing factor for mouse.
        const mouseModifierY = this.options.smoothingFactor ?? 0.1;
        // Request a frame to update layer transformations
        window.requestAnimationFrame(() => {
            // Apply transformations with mouse-specific modifiers.
            this.applyLayerTransformations(mouseModifierX, mouseModifierY);
        });
    }
    computeSensitivity() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        return aspectRatio * 10; // Multiply aspect ratio by 10 to derive a basic sensitivity level.
    }
    rotate(beta, gamma) {
        if (beta === null || gamma === null) {
            return;
        }
        const sensitivity = this.options.sensitivity ?? 30;
        this.inputX = beta / sensitivity;
        this.inputY = gamma / sensitivity;
    }
    handleDeviceOrientation(event) {
        const { beta, gamma } = event;
        if (beta !== null && gamma !== null) {
            this.rotate(beta, gamma);
            const gyroModifierX = this.options.gyroEffectModifier ?? 10; // Default or specified gyro effect modifier.
            const gyroModifierY = this.options.gyroEffectModifier ?? 10;
            // Request a frame to update layer transformations
            window.requestAnimationFrame(() => {
                // Apply transformations with gyro-specific modifiers.
                this.applyLayerTransformations(gyroModifierX, gyroModifierY);
            });
        }
    }
    handleDeviceMotion(event) {
        // Ensure rotationRate is not null before attempting to destructure it
        if (event.rotationRate) {
            const { beta, gamma } = event.rotationRate;
            if (beta !== null && gamma !== null) {
                // Normalize orientation inputs by sensitivity
                this.inputX = beta / (this.options.sensitivity ?? 30);
                this.inputY = gamma / (this.options.sensitivity ?? 30);
                const motionModifierX = this.options.gyroEffectModifier ?? 10; // Example modifier for device motion.
                const motionModifierY = this.options.gyroEffectModifier ?? 10;
                // Request a frame to update layer transformations
                window.requestAnimationFrame(() => {
                    // Apply transformations with motion-specific modifiers.
                    this.applyLayerTransformations(motionModifierX, motionModifierY);
                });
            }
        }
    }
    applyLayerTransformations(inputModifierX, inputModifierY) {
        // Apply transformations to all layers based on modified input values.
        this.layers.forEach(layer => {
            const deltaX = this.inputX * layer.depth * inputModifierX;
            const deltaY = this.inputY * layer.depth * inputModifierY;
            layer.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });
    }
    initializeParallax() {
        this.updateContainerAndLayers(); // Set initial container and layer dimensions.
        this.attachEvents(); // Bind event handlers for interactive parallax effects.
        this.setupResizeObserver(); // Start observing for changes in container size.
    }
    async _attachDeviceOrientationAndMotionListener() {
        const addOrientationAndMotionListeners = () => {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
            window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
        };
        // Unify event removal to simplify permission handling
        const removeGestureListeners = () => {
            document.removeEventListener('click', this._attachDeviceOrientationAndMotionListener);
            document.removeEventListener('touchend', this._attachDeviceOrientationAndMotionListener);
        };
        if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
            removeGestureListeners(); // Assume permission needs to be requested once per session
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    addOrientationAndMotionListeners();
                }
                else {
                    console.error('Permission for device orientation was denied.');
                }
            }
            catch (error) {
                console.error('Error requesting permission for device orientation:', error);
            }
        }
        else if ('ondeviceorientation' in window && 'ondevicemotion' in window) {
            addOrientationAndMotionListeners(); // No permission needed, but supported
        }
        else {
            console.error('Device orientation or motion is not supported by this device.');
        }
    }
    debounce(func, wait, immediate = false) {
        let timeout;
        return function (...args) {
            const context = this;
            const later = () => {
                timeout = undefined;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    }
    attachEvents() {
        // Apply the generic debounce method directly in the event listener registration
        const debouncedMouseMove = this.debounce(this.handleMouseMove.bind(this), 6);
        document.addEventListener('mousemove', debouncedMouseMove);
        // Enhance conditional attachment for device orientation
        const gyroListenerTrigger = this.parallaxContainer.querySelector('[data-gyroscope-listener]');
        if (gyroListenerTrigger) {
            gyroListenerTrigger.addEventListener('click', this._attachDeviceOrientationAndMotionListener.bind(this));
        }
        else if (typeof DeviceOrientationEvent === 'undefined' || !('requestPermission' in DeviceOrientationEvent)) {
            this._attachDeviceOrientationAndMotionListener();
        }
        // Using the generalized debounce method for resizing events
        const debouncedResize = this.debounce(() => {
            this.updateContainerAndLayers(window.innerWidth); // Update dimensions based on new viewport size.
        }, 6);
        window.addEventListener('resize', debouncedResize);
    }
}
/**
 * Initializes the Parallax system once the HTML document is fully loaded.
 * This ensures that all DOM elements are available for manipulation and setup.
 * A new instance of the Parallax class is created with specified options,
 * specifying the container ID and an optional smoothing factor for the parallax effect.
 * The 'DOMContentLoaded' event is used to delay execution until the complete HTML document
 * has been fully loaded and parsed, ensuring that all elements referenced in the script are accessible.
 */
document.addEventListener('DOMContentLoaded', () => {
    new Parallax({ containerId: 'parallaxContainer', smoothingFactor: 0.13, gyroEffectModifier: 10 });
});
//# sourceMappingURL=parallax.js.map