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
    calibrationThreshold = 100;
    calibrationDelay = 500;
    supportDelay = 500;
    calibrateX = false;
    calibrateY = true;
    calibrationTimer;
    calibrationFlag = true;
    calibrationX = 0;
    calibrationY = 0;
    attachDeviceOrientationListener; // Asynchronously attaches a device orientation event listener.
    constructor(options) {
        const defaults = {
            smoothingFactor: 0.13, // Default smoothing factor for movement smoothness.
            gyroEffectModifier: 10, // Default gyro effect modifier for device orientation sensitivity.
            mouseDebounce: 6, // Milliseconds delay before re-polling mouse coordinates.
            windowResizeDebounce: 6, // Milliseconds delay before re-polling window dimensions during resize events.
            deviceDebounce: 6, // Milliseconds delay before re-polling device motion and event metrics.
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
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayersOnWindowResize()); // Monitor size changes for dynamic responsiveness.
        this.inputX = 0;
        this.inputY = 0;
        this.initializeParallax(); // Complete the setup by initializing dimensions, attaching event handlers, and starting observers.
        this.attachDeviceOrientationListener = this._attachDeviceOrientationAndMotionListener.bind(this); // Prepare device orientation handling with permissions.
    }
    initializeLayers() {
        // Map through children to assign depth, maxRange, and calibration properties based on data attributes.
        const layers = Array.from(this.children).map(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth') ?? '0');
            const maxRange = parseFloat(layer.getAttribute('data-max-range') ?? '0');
            const calibrateX = layer.hasAttribute('data-calibrate-x') ? layer.getAttribute('data-calibrate-x') === 'true' : this.calibrateX;
            const calibrateY = layer.hasAttribute('data-calibrate-y') ? layer.getAttribute('data-calibrate-y') === 'true' : this.calibrateY;
            Object.assign(layer, { depth, maxRange, calibrateX, calibrateY });
            return layer;
        });
        return layers;
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
    updateContainerAndLayersOnWindowResize(baseWidth = this.baseElement.offsetWidth, baseHeight = this.baseElement.offsetHeight) {
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }
    getCenterXY() {
        // Return center of the base element, not the entire container to avoid using inflated values
        const centerY = this.baseElement.offsetHeight / 2;
        const centerX = this.baseElement.offsetWidth / 2;
        return [centerX, centerY];
    }
    computeSensitivity() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        return aspectRatio * 10; // Multiply aspect ratio by 10 to derive a basic sensitivity level.
    }
    onCalibrationTimer() {
        // Resets the calibration flag to trigger new calibration on the next appropriate event
        this.calibrationFlag = true;
    }
    queueCalibration(delay) {
        // Debounce calibration attempts
        clearTimeout(this.calibrationTimer);
        this.calibrationTimer = window.setTimeout(() => this.onCalibrationTimer(), delay);
    }
    // private calibrate(x?: boolean, y?: boolean): void {
    //     // Optionally set calibration axis
    //     this.calibrateX = x !== undefined ? x : this.calibrateX;
    //     this.calibrateY = y !== undefined ? y : this.calibrateY;
    // }
    applyCalibration(inputX, inputY) {
        // Apply calibration to input values. If the difference between input and calibration exceeds the threshold, adjust the input by subtracting the calibration offset.
        if (Math.abs(inputX - this.calibrationX) > this.calibrationThreshold) {
            inputX -= this.calibrationX;
        }
        if (Math.abs(inputY - this.calibrationY) > this.calibrationThreshold) {
            inputY -= this.calibrationY;
        }
        return [inputX, inputY];
    }
    rotate(beta, gamma) {
        if (beta === null || gamma === null) {
            return;
        }
        const isPortrait = window.innerHeight > window.innerWidth;
        let inputX = isPortrait ? gamma : beta;
        let inputY = isPortrait ? beta : gamma;
        if (this.calibrationFlag) {
            this.calibrationFlag = false;
            this.calibrationX = inputX;
            this.calibrationY = inputY;
        }
        [inputX, inputY] = this.applyCalibration(inputX, inputY);
        const sensitivity = this.options.sensitivity ?? 30;
        this.inputX = inputX / sensitivity;
        this.inputY = inputY / sensitivity;
    }
    handleMouseMove(event) {
        const [centerX, centerY] = this.getCenterXY();
        const mouseX = event.clientX - centerX - this.baseElement.getBoundingClientRect().left;
        const mouseY = event.clientY - centerY - this.baseElement.getBoundingClientRect().top;
        this.inputX = mouseX / centerX;
        this.inputY = mouseY / centerY;
        window.requestAnimationFrame(() => {
            this.applyLayerTransformations(this.options.smoothingFactor, this.options.smoothingFactor, 'mouse');
        });
    }
    handleDeviceOrientation(event) {
        const { beta, gamma } = event;
        if (beta !== null && gamma !== null) {
            this.rotate(beta, gamma);
            const gyroModifier = this.options.gyroEffectModifier ?? 10;
            window.requestAnimationFrame(() => {
                let [calibratedX, calibratedY] = this.applyCalibration(this.inputX, this.inputY);
                // Applying layer transformations using calibrated values
                this.applyLayerTransformations(calibratedX * gyroModifier, calibratedY * gyroModifier, 'gyro');
            });
        }
    }
    handleDeviceMotion(event) {
        if (event.rotationRate) {
            const { beta, gamma } = event.rotationRate;
            if (beta !== null && gamma !== null) {
                // Use the rotate method to adjust inputX and inputY based on the device orientation
                this.rotate(beta, gamma);
                const motionModifier = this.options.gyroEffectModifier ?? 10;
                window.requestAnimationFrame(() => {
                    // Apply transformations to layers using the modified inputs and a specific modifier for device motion
                    this.applyLayerTransformations(motionModifier, motionModifier, 'motion');
                });
            }
        }
    }
    applyLayerTransformations(inputModifierX, inputModifierY, eventOrigin) {
        const [centerX, centerY] = this.getCenterXY();
        // Adjust input modifiers based on the event source to control responsiveness and effects
        let modifierX = inputModifierX;
        let modifierY = inputModifierY;
        if (eventOrigin === 'gyro') {
            // Gyro inputs can be more sensitive, so reduce the effect
            modifierX *= 0.1;
            modifierY *= 0.1;
        }
        else if (eventOrigin === 'motion') {
            // Device motion inputs often have larger range and variability
            modifierX *= 0.05;
            modifierY *= 0.05;
        } // No additional scaling for mouse as it is already fairly direct
        this.layers.forEach(layer => {
            const { depth, maxRange } = layer;
            // Calculate the allowed movement range while considering the modified sensitivity
            const deltaX = Math.min(Math.max(-maxRange, this.inputX * depth * modifierX * centerX), maxRange);
            const deltaY = Math.min(Math.max(-maxRange, this.inputY * depth * modifierY * centerY), maxRange);
            // Apply the transform with calculated offsets and ensure movements are within the maximum range
            layer.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });
    }
    initializeParallax() {
        this.updateContainerAndLayersOnWindowResize(); // Set initial dimensions and setup event listeners.
        this.attachEvents();
        this.setupResizeObserver();
        this.queueCalibration(this.calibrationDelay); // Start calibration process initially.
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
                    // Use support delay to debounce the addition of orientation and motion listeners
                    setTimeout(addOrientationAndMotionListeners, this.supportDelay);
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
            // No permission needed, but supported; still apply support delay before attaching event listeners
            setTimeout(addOrientationAndMotionListeners, this.supportDelay);
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
        // Debounced mouse movement handling for optimized performance
        const debouncedMouseMove = this.debounce(this.handleMouseMove.bind(this), this.options.mouseDebounce);
        this.parallaxContainer.addEventListener('mousemove', debouncedMouseMove);
        // Debounced orientation and motion listener attachment
        const debouncedDeviceListener = this.debounce(this._attachDeviceOrientationAndMotionListener.bind(this), this.options.deviceDebounce);
        // Check if there is an element with the 'data-attach-gyro-listener' attribute
        const gyroListenerElement = document.querySelector('[data-attach-gyro-listener]');
        if (gyroListenerElement) {
            // If found, add click event handler to this specific element
            gyroListenerElement.addEventListener('click', debouncedDeviceListener);
        }
        else {
            // If not found, add click and touchend event handlers to the document
            document.addEventListener('click', debouncedDeviceListener);
            document.addEventListener('touchend', debouncedDeviceListener);
        }
        window.addEventListener('resize', this.debounce(() => {
            // Update dimensions upon resizing
            this.updateContainerAndLayersOnWindowResize(window.innerWidth, window.innerHeight);
        }, this.options.windowResizeDebounce));
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new Parallax({ containerId: 'parallaxContainer', smoothingFactor: 0.13, gyroEffectModifier: 10 });
});
//# sourceMappingURL=parallax.js.map