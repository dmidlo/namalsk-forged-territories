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
    initialOrientation = { beta: null, gamma: null };
    continuousCalibrationData = { beta: [], gamma: [] };
    calibrationThreshold = 100;
    calibrationDelay = 500;
    supportDelay = 500;
    calibrateX = false;
    calibrateY = true;
    calibrationTimer;
    calibrationX = 0;
    calibrationY = 0;
    attachDeviceOrientationListener; // Asynchronously attaches a device orientation event listener.
    constructor(options) {
        const defaults = {
            mouseSmoothingFactor: 0.13, // Default smoothing factor for movement smoothness.
            gyroEffectModifier: 1, // Default gyro effect modifier for device orientation sensitivity.
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
        return aspectRatio * 2; // Multiply aspect ratio by 10 to derive a basic sensitivity level.
    }
    initialOrientationCalibration() {
        // Initial orientation calibration captures the first stable beta and gamma values when the device is motionless.
        const initialOrientationListener = (event) => {
            if (this.initialOrientation.beta === null || this.initialOrientation.gamma === null) {
                this.initialOrientation.beta = event.beta;
                this.initialOrientation.gamma = event.gamma;
                // Adjust initial values if device is facing downward
                if (event.beta > 90 || event.beta < -90) {
                    this.initialOrientation.beta = 180 - event.beta;
                    this.initialOrientation.gamma = -event.gamma;
                }
                // After initial values are set, remove this listener to prevent recalibration.
                window.removeEventListener('deviceorientation', initialOrientationListener);
            }
        };
        window.addEventListener('deviceorientation', initialOrientationListener);
    }
    onCalibrationTimer() {
        this.continuousCalibrationData.beta = [];
        this.continuousCalibrationData.gamma = [];
    }
    queueCalibration(delay) {
        // Calibration is queued with a delay to allow the device orientation to stabilize
        clearTimeout(this.calibrationTimer);
        this.calibrationTimer = window.setTimeout(() => this.onCalibrationTimer(), delay);
    }
    applyCalibration(inputX, inputY) {
        // Continuous calibration updates the calibration offsets using a moving average approach.
        if (this.continuousCalibrationData.beta.length >= this.calibrationThreshold) {
            // Calculate the moving averages for beta and gamma
            const avgBeta = this.continuousCalibrationData.beta.reduce((acc, value) => acc + value, 0) / this.continuousCalibrationData.beta.length;
            const avgGamma = this.continuousCalibrationData.gamma.reduce((acc, value) => acc + value, 0) / this.continuousCalibrationData.gamma.length;
            // Update calibration offsets
            this.calibrationX = avgBeta;
            this.calibrationY = avgGamma;
            // Clear the arrays to start collecting new data points for the next average calculation
            this.continuousCalibrationData.beta = [];
            this.continuousCalibrationData.gamma = [];
        }
        // Adjust input by subtracting the calibration values
        inputX -= this.calibrationX;
        inputY -= this.calibrationY;
        return [inputX, inputY];
    }
    rotate(beta, gamma) {
        if (beta === null || gamma === null) {
            return;
        }
        // Adjust the beta and gamma based on the initial orientation calibration
        beta -= this.initialOrientation.beta;
        gamma -= this.initialOrientation.gamma;
        // Consider the ergonomic handling, adapting to different user grips and orientations
        this.continuousCalibrationData.beta.push(beta);
        this.continuousCalibrationData.gamma.push(gamma);
        // Call calibration function which will adjust inputX and inputY
        let [calibratedX, calibratedY] = this.applyCalibration(beta, gamma);
        // Store the calibrated values to be used in animations or transformations
        this.inputX = calibratedX;
        this.inputY = calibratedY;
    }
    handleMouseMove(event) {
        const [centerX, centerY] = this.getCenterXY();
        const mouseX = event.clientX - centerX - this.baseElement.getBoundingClientRect().left;
        const mouseY = event.clientY - centerY - this.baseElement.getBoundingClientRect().top;
        this.inputX = mouseX / centerX;
        this.inputY = mouseY / centerY;
        window.requestAnimationFrame(() => {
            this.applyLayerTransformations(this.options.mouseSmoothingFactor, this.options.mouseSmoothingFactor, 'mouse');
        });
    }
    handleDeviceOrientation(event) {
        let { beta, gamma } = event;
        // Adapt beta and gamma based on orientation and positioning requirements.
        if (beta !== null && gamma !== null) {
            // Check for supine position, where the device is likely facing downward
            if (beta > 90 || beta < -90) {
                beta = 180 - beta;
                gamma = -gamma;
            }
            else if (Math.abs(beta) < 10 && Math.abs(gamma) < 10) {
                // Device is likely in a flat, upward-facing position
                beta = 0;
                gamma = 0;
            }
            // Check for prone position adaptations, if the device is facing upwards while the user is lying face down
            if (beta < -90) {
                beta = -180 - beta;
            }
            this.rotate(beta, gamma);
            // Process transformation based on calibrated values
            window.requestAnimationFrame(() => {
                let gyroModifier = this.options.gyroEffectModifier ?? 1;
                // Apply layer transformations using calibrated values
                this.applyLayerTransformations(this.inputX * gyroModifier, this.inputY * gyroModifier, 'gyro');
            });
        }
    }
    handleDeviceMotion(event) {
        if (event.rotationRate) {
            const { beta, gamma } = event.rotationRate;
            if (beta !== null && gamma !== null) {
                this.rotate(beta, gamma);
                window.requestAnimationFrame(() => {
                    const motionModifier = this.options.gyroEffectModifier ?? 10;
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
            modifierX *= 0.025;
            modifierY *= 0.025;
        }
        else if (eventOrigin === 'motion') {
            // Device motion inputs often have larger range and variability
            modifierX *= 0.012;
            modifierY *= 0.012;
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
                    this.initialOrientationCalibration();
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
            this.initialOrientationCalibration();
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
    new Parallax({ containerId: 'parallaxContainer' });
});
//# sourceMappingURL=parallax.js.map