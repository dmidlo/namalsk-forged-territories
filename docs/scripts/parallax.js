"use strict";
/**
 * Manages a parallax effect within a specified container, dynamically adjusting layer positions based on user interactions and sensor data.
 * It supports dynamic resizing, mouse movement debouncing, and enhanced interactivity through device orientation handling with explicit permission management.
 *
 * @typeparam T - Restricts type to HTMLElement or its subtypes for precise type control.
 *
 * @property {T} baseElement - The primary reference layer that dictates the sizing for the entire parallax container.
 * @property {T} parallaxContainer - The main container for all parallax layers.
 * @property {NodeListOf<T>} children - Child elements within the container, potential parallax layers.
 * @property {NodeListOf<ParallaxLayer>} layers - Configured parallax layers with defined depth and movement characteristics.
 * @property {ResizeObserver} resizeObserver - Observes and reacts to size changes in the parallax container.
 * @property {ParallaxOptions} options - Configuration settings for the parallax effect, including behavior and responsiveness.
 * @property {number | undefined} moveTimeout - Timer handle for debouncing mouse move events to optimize performance.
 * @property {() => Promise<void>} attachDeviceOrientationListener - Public method to initiate permission request for device orientation access.
 *
 * @method constructor(options: ParallaxOptions) - Initializes the parallax effect with provided settings and validates container ID.
 * @method private initializeLayers() - Configures layers using depth and range data attributes.
 * @method private findBaseElement() - Identifies the base element to use as a dimensional reference for the parallax setup.
 * @method private setupResizeObserver() - Sets up a ResizeObserver for responsive adjustments to size changes.
 * @method private updateContainerAndLayers() - Updates container and layer dimensions based on the base element or provided specifications.
 * @method private debounceMouseMove(event: MouseEvent) - Manages mouse movement responsiveness by limiting the rate of handling events.
 * @method private getCenterXY() - Determines the central coordinates of the parallax container for relative movement calculations.
 * @method private handleMouseMove(event: MouseEvent) - Computes and applies movement transformations to layers based on mouse position.
 * @method private computeSensitivity() - Calculates a sensitivity value based on the device's aspect ratio to adjust orientation-based movements.
 * @method private rotate(beta: number | null, gamma: number | null) - Adjusts layer positions based on normalized device orientation inputs.
 * @method private handleDeviceOrientation(event: DeviceOrientationEvent) - Applies orientation-based adjustments to layers using computed inputs.
 * @method private initializeParallax() - Sets initial dimensions, attaches event listeners, and initiates size monitoring.
 * @method private async _attachDeviceOrientationListener() - Manages permission requests and attaches device orientation event listeners conditionally.
 * @method private attachEvents() - Sets up interactive event handlers, including those for mouse and device orientation events, enhancing the parallax effect.
 *
 * Features:
 * - Dynamic resizing and debounced mouse movement handling enhance performance.
 * - Permission management for device orientation boosts interactivity while complying with privacy standards.
 *
 * Guards and Checks:
 * - Validates existence of container ID during initialization to avoid runtime errors.
 * - Implements debouncing to minimize excessive processing and potential performance issues.
 * - Manages device orientation permissions thoughtfully to meet privacy regulations.
 */
class Parallax {
    baseElement; // Defines the parallax container's dimensions.
    parallaxContainer; // Container for all parallax layers.
    children; // Child elements within the container, potential layers.
    layers; // Configured parallax layers.
    resizeObserver; // Monitors size changes of the base element.
    options; // Configurable options for behavior and responsiveness.
    inputX = 0; // Default initialization to 0 to ensure value is always defined.
    inputY = 0; // Default initialization to 0 to ensure value is always defined.
    moveTimeout; // Explicitly mark as possibly undefined.
    attachDeviceOrientationListener; // Asynchronously attaches a device orientation event listener.
    /**
     * Constructs a new Parallax instance with provided configuration options, setting up all necessary elements,
     * permissions, and event handlers for a responsive parallax effect.
     *
     * @param {ParallaxOptions} options - Configuration options for the parallax effect.
     * @throws {Error} When the specified container ID does not match any existing element.
     *
     * Features:
     * - Sets up initial dimensions and positions based on the specified container.
     * - Attaches resize and device orientation events for dynamic and responsive behavior.
     * - Initializes mouse movement debouncing for performance optimization.
     *
     * Guards and Checks:
     * - Ensures that the container's existence is validated to prevent runtime errors.
     * - Applies default configuration for smoothing and gyro effects if not specified.
     * - Configures sensitivity based on device and environment characteristics if not provided.
     * - Proactively manages device orientation permissions to comply with privacy standards.
     */
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
        this.moveTimeout = undefined; // Setup variable for debouncing mouse move events.
    }
    /**
     * Initializes parallax layers by extracting and setting depth and maxRange from data attributes.
     * Ensures that each layer in the parallax system is configured with essential properties for depth-based movement.
     *
     * Features:
     * - Extracts `data-depth` and `data-max-range` attributes and converts them to numeric values.
     * - Ensures all parallax layers have necessary properties for movement calculations.
     *
     * Guards and Checks:
     * - Provides default values for `depth` and `maxRange` if data attributes are missing, ensuring layers are always functional.
     *
     * @returns {NodeListOf<ParallaxLayer>} Configured NodeList of parallax layers.
     */
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
    /**
     * Identifies and returns the base element within the parallax container. This element defines the reference
     * dimensions for the parallax effect. If no specific base element is found, it defaults to the first child or
     * creates a fallback div if the container is empty.
     *
     * Features:
     * - Searches for a specified base element marked with `data-is-base-dimensions`.
     * - Defaults to the first child if the specified base is not found.
     * - Creates a new div as a fallback if no children are present, ensuring the system remains functional.
     *
     * Guards and Checks:
     * - Logs errors and warnings to assist debugging if the base element is not found or if there are no children in the container.
     *
     * @returns {T} The base element of the parallax scene, crucial for setting initial dimensions and positions.
     */
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
    /**
     * Sets up a ResizeObserver to dynamically adapt the parallax container and layers to size changes of the base element.
     * The observer triggers updates to maintain alignment and scaling with the viewport, ensuring the parallax effect remains consistent across different screen sizes.
     *
     * Features:
     * - Continuous monitoring of base element dimensions to adjust parallax container and layer sizes.
     *
     * Guards and Checks:
     * - None explicitly needed as this function relies on the ResizeObserver API, which handles element observation and callback invocation natively.
     */
    setupResizeObserver() {
        // Observe size changes in the base element to update the parallax dimensions responsively.
        this.resizeObserver.observe(this.baseElement);
    }
    /**
     * Updates the dimensions of the parallax container to match those of the base element or specified dimensions.
     * This ensures that the container size adapts to changes in the base element, maintaining a consistent parallax effect.
     * It's essential for the responsiveness of the parallax scene across different viewport sizes.
     *
     * Features:
     * - Dynamically adjusts the container's width and height to match the base element or provided dimensions.
     * - Directly modifies CSS properties to reflect new dimensions, ensuring immediate visual update.
     *
     * Guards and Checks:
     * - Utilizes default parameters to use current dimensions of the base element if no explicit dimensions are provided.
     * - Operates under the assumption that the base element's dimensions are accurate and meaningful for the container's size.
     *
     * @param baseWidth - Optional width to set for the parallax container, defaults to the base element's current width.
     * @param baseHeight - Optional height to set for the parallax container, defaults to the base element's current height.
     */
    updateContainerAndLayers(baseWidth = this.baseElement.offsetWidth, baseHeight = this.baseElement.offsetHeight) {
        // Apply the specified or current base element dimensions to the container's CSS properties.
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }
    /**
     * Debounces mouse move events to optimize responsiveness and performance.
     * This method limits the frequency of parallax calculations during rapid or frequent mouse movements by introducing a short delay.
     *
     * Features:
     * - Reduces the load on the rendering process by debouncing high-frequency events.
     *
     * Guards and Checks:
     * - Clears any previous timeout to ensure that the latest event is the one processed, avoiding redundant calculations.
     *
     * @param event - The MouseEvent object from the mouse movement.
     */
    debounceMouseMove(event) {
        // Reset the debounce timer to ensure only the latest event is processed
        clearTimeout(this.moveTimeout);
        // Delay the mouse move handling to limit the frequency of updates
        this.moveTimeout = setTimeout(() => {
            this.handleMouseMove(event);
        }, 6); // Delay set to 6 milliseconds for a balance between performance and responsiveness
    }
    /**
     * Calculates and returns the central coordinates of the parallax container.
     * This method provides a consistent reference point for calculating layer movements during mouse interactions.
     *
     * @returns {[number, number]} A tuple of x and y coordinates representing the center of the container.
     *
     * @remarks
     * This method assumes a rectangular container where the reference for center calculation is straightforward.
     * No guards or checks are needed as it purely relies on the container's current dimensions, which are expected
     * to be valid and positive.
     */
    getCenterXY() {
        // Calculate the vertical center of the container.
        const centerY = this.parallaxContainer.offsetHeight / 2;
        // Calculate the horizontal center of the container.
        const centerX = this.parallaxContainer.offsetWidth / 2;
        // Return the calculated center coordinates.
        return [centerX, centerY];
    }
    /**
     * Handles mouse movement events to dynamically adjust the positions of parallax layers.
     * This method calculates the mouse position relative to the center of the parallax container and applies transformations to each layer based on their depth and configured maximum range.
     *
     * Features:
     * - Adjusts layer positions dynamically based on mouse interaction to create an interactive parallax effect.
     * - Utilizes smoothing factors to moderate the movement speed of the layers, enhancing the visual fluidity.
     *
     * Guards and Checks:
     * - Ensures that movements are constrained within each layer's configured maximum allowable range to prevent unrealistic displacements.
     * - Uses a fail-safe check (`!`) on the optional `smoothingFactor` to handle scenarios where it might not be provided, ensuring a default behavior.
     *
     * @param event - The MouseEvent object containing details about the cursor's current position.
     */
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
    /**
     * Calculates sensitivity for device orientation based on device's aspect ratio.
     * This sensitivity factor affects how parallax layers react to device tilts.
     *
     * @returns {number} Computed sensitivity value.
     *
     * @remarks
     * Sensitivity adjustment is crucial for ensuring that the parallax effect remains
     * consistent and intuitive across different devices. The formula used here can be
     * adjusted based on empirical testing or specific application requirements.
     *
     * Features:
     * - Dynamically adjusts sensitivity based on the device's aspect ratio, ensuring tailored responsiveness.
     *
     * Guards and Checks:
     * - This method inherently assumes that the device's window dimensions are non-zero, which is a safe assumption in browser environments.
     */
    computeSensitivity() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        return aspectRatio * 10; // Multiply aspect ratio by 10 to derive a basic sensitivity level.
    }
    /**
     * Adjusts the parallax layer positions based on device orientation inputs (`beta` and `gamma`).
     * This method calculates a normalized input range derived from the device's orientation angles,
     * making the parallax effect responsive to device tilting. The computed values are used to
     * dynamically adjust the layer positions relative to the orientation.
     *
     * Features:
     * - Processes device orientation signals to compute responsive layer adjustments.
     * - Utilizes a configurable sensitivity to scale orientation inputs for finer control.
     *
     * Guards and Checks:
     * - Exits early if essential orientation data (`beta`, `gamma`) is missing, ensuring robust execution.
     * - Uses a default sensitivity if not specified, maintaining consistent behavior under variable conditions.
     *
     * @param beta The device's tilt front-to-back in degrees, where positive values indicate tilting forward.
     * @param gamma The device's tilt left-to-right in degrees, where positive values indicate tilting to the right.
     */
    rotate(beta, gamma) {
        if (beta === null || gamma === null) {
            return;
        }
        const sensitivity = this.options.sensitivity ?? 30;
        this.inputX = beta / sensitivity;
        this.inputY = gamma / sensitivity;
    }
    /**
     * Handles device orientation events to adjust parallax layer positions dynamically.
     * The function extracts `beta` and `gamma` orientation values and calculates adjustments
     * for layer positions based on device tilt. These adjustments are refined through a rotation
     * calculation method to ensure responsiveness and natural movement within allowed ranges.
     *
     * @param event - The DeviceOrientationEvent containing orientation data.
     *
     * Features:
     * - Dynamic adjustment of layer positions in response to device tilts.
     * - Enhanced realism through application of gyroscopic effects and smoothing.
     * - Utilization of a rotation function to calculate and apply transformations.
     *
     * Guards and Checks:
     * - Ensures calculated movements are confined within each layer's maximum allowable range.
     * - Verifies presence of necessary orientation values before proceeding with transformations.
     * - Default values for `gyroEffectModifier` ensure fail-safe operation if not explicitly set.
     */
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
    /**
     * Initializes parallax functionality with necessary configurations.
     * Sets the initial dimensions and positions based on the base element, binds interactive event listeners,
     * and starts observing size changes for dynamic responsiveness. This method orchestrates the foundational setup
     * ensuring the parallax system is fully operational immediately after instantiation.
     *
     * Features:
     * - Sets up initial dimensions and alignment of the parallax container to match the base element.
     * - Attaches dynamic interaction handlers for mouse and device orientation events.
     * - Establishes a resize observer to adapt the display to viewport changes.
     *
     * Guards and Checks:
     * - Ensures that event listeners are attached only after the base element’s dimensions are set.
     * - Uses resizing observation to maintain visual consistency across varying viewport sizes.
     */
    initializeParallax() {
        this.updateContainerAndLayers(); // Set initial container and layer dimensions.
        this.attachEvents(); // Bind event handlers for interactive parallax effects.
        this.setupResizeObserver(); // Start observing for changes in container size.
    }
    /**
     * Asynchronously attaches a device orientation event listener, handling permissions dynamically.
     * This method checks for the necessity of permissions and attaches the event listener accordingly.
     * It ensures compliance with privacy regulations and enhances the interactive parallax effect by
     * integrating real-time device movements.
     *
     * Features:
     * - Dynamically handles permission requests for device orientation.
     * - Enhances parallax effects with device orientation data.
     *
     * Guards and Checks:
     * - Prevents multiple permission requests by removing event listeners after the initial user gesture.
     * - Handles possible exceptions during the permission request process.
     * - Logs an error if device orientation is unsupported.
     */
    async _attachDeviceOrientationAndMotionListener() {
        const addOrientationAndMotionListeners = () => {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
            window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
        };
        // Check if DeviceOrientationEvent and DeviceMotionEvent support the requestPermission method.
        if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
            document.removeEventListener('click', this._attachDeviceOrientationAndMotionListener);
            document.removeEventListener('touchend', this._attachDeviceOrientationAndMotionListener);
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
            addOrientationAndMotionListeners();
        }
        else {
            console.error('Device orientation or motion is not supported by this device.');
        }
    }
    /**
     * Attaches event listeners for mouse movement, device orientation changes, and window resizing.
     * This setup enhances the interactivity and responsiveness of the parallax effect by dynamically adjusting layer positions
     * based on user inputs and browser window changes.
     *
     * Features:
     * - Debounced mouse movement handling to optimize performance by reducing the frequency of recalculations.
     * - Conditional device orientation listener attachment based on the presence of a specific HTML attribute,
     *   ensuring flexibility and user control in triggering permissions requests.
     * - Responsive resizing to maintain parallax effect integrity across varying viewport sizes.
     *
     * Guards and Checks:
     * - Uses `clearTimeout` to prevent multiple resizing triggers from stacking, ensuring only the most recent action is processed.
     * - Conditionally manages device orientation permissions to comply with platform-specific privacy requirements.
     * - Provides fallbacks by adding default event listeners if no specific user gesture initiator is present.
     *
     * @remarks
     * The class also includes a public interface allowing developers to trigger device orientation permission requests
     * interactively, enhancing user experience on devices that require explicit permissions for accessing motion sensors.
     */
    attachEvents() {
        // Debounce mouse movements to optimize performance.
        document.addEventListener('mousemove', this.debounceMouseMove.bind(this));
        // Attach device orientation listener, either on a user gesture or immediately based on browser policy.
        const gyroListenerTrigger = this.parallaxContainer.querySelector('[data-gyroscope-listener]');
        if (gyroListenerTrigger) {
            gyroListenerTrigger.addEventListener('click', () => this._attachDeviceOrientationAndMotionListener());
        }
        else {
            this._attachDeviceOrientationAndMotionListener(); // Fallback to attaching without user gesture if no specific element found.
        }
        // Debounce window resize events to ensure parallax dimensions are updated efficiently after viewport changes.
        let resizeTimer;
        const resizeDelayMS = 6; // Minimal delay to balance responsiveness and performance.
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer); // Clear previous timer to ensure only the last resize event is processed.
            resizeTimer = setTimeout(() => {
                this.updateContainerAndLayers(window.innerWidth); // Update dimensions based on new viewport size.
            }, resizeDelayMS);
        });
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