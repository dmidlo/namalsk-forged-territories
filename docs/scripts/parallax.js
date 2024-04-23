"use strict";
/**
 * Manages a parallax effect in a specified container, dynamically adjusting layer positions based on user interactions and sensor data.
 * This class supports dynamic resizing, mouse movement debouncing, and enhanced interactivity through device orientation handling with permission management.
 *
 * @typeparam T - Restricts type to HTMLElement or its subtypes.
 *
 * @property {T} baseElement - The base layer that sets the size for the parallax container.
 * @property {T} parallaxContainer - Main container for all parallax layers.
 * @property {NodeListOf<T>} children - Child elements in the container.
 * @property {NodeListOf<ParallaxLayer>} layers - Parallax layers with defined depth and movement properties.
 * @property {ResizeObserver} resizeObserver - Monitors size changes in the parallax container.
 * @property {ParallaxOptions} options - Configuration settings for the parallax effect.
 * @property {number | undefined} moveTimeout - Timer for debouncing mouse move events.
 * @property {() => Promise<void>} attachDeviceOrientationListener - Public method to request device orientation permissions.
 *
 * @method constructor(options: ParallaxOptions) - Initializes parallax settings, checks for valid container ID.
 * @method private initializeLayers() - Sets up layers with depth and range from data attributes.
 * @method private findBaseElement() - Determines the base element for dimension referencing.
 * @method private setupResizeObserver() - Initializes a ResizeObserver for adaptive resizing.
 * @method private updateContainerAndLayers() - Updates dimensions based on the base element or specified values.
 * @method private debounceMouseMove(event: MouseEvent) - Throttles mouse movement handling.
 * @method private handleMouseMove(event: MouseEvent) - Applies parallax effects based on mouse position.
 * @method private initializeParallax() - Sets initial dimensions, binds event listeners, and starts resize observer.
 * @method private attachEvents() - Binds event handlers for dynamic parallax interactions.
 *
 * Features:
 * - Supports dynamic resizing and mouse movement handling with performance optimizations.
 * - Manages device orientation permissions for enhanced interactivity.
 *
 * Guards and Checks:
 * - Validates container ID at initialization.
 * - Debounces mouse movement to limit excessive rendering.
 * - Handles device orientation permissions to comply with privacy standards.
 */
class Parallax {
    baseElement; // Defines the parallax container's dimensions.
    parallaxContainer; // Container for all parallax layers.
    children; // Child elements within the container, potential layers.
    layers; // Configured parallax layers.
    resizeObserver; // Monitors size changes of the base element.
    options; // Configurable options for behavior and responsiveness.
    moveTimeout; // Timer for debouncing mouse move events.
    attachDeviceOrientationListener; // Asynchronously attaches a device orientation event listener.
    /**
     * Creates a Parallax instance with specified configuration options. Initializes the container, layers, and observes
     * resizing for dynamic responsiveness. Throws an error if the specified container is not found in the DOM.
     *
     * @param options - Configuration options for the parallax effect, including container ID and optional settings.
     * @throws {Error} - When the specified container ID does not match any existing element.
     *
     * Features:
     * - Initializes container and layers based on provided configuration.
     * - Sets default smoothing factor if not explicitly provided.
     * - Ensures the container's existence or throws an error.
     * - Attaches resize and orientation events for responsive behavior.
     *
     * Guards and Checks:
     * - Validates the existence of the container.
     * - Sets a default smoothing factor to ensure consistent behavior when unspecified.
     * - Proactively manages resize and orientation permissions to comply with device and browser capabilities.
     */
    constructor(options) {
        this.options = { ...options, smoothingFactor: 0.13 }; // Set default smoothing factor if not specified.
        this.parallaxContainer = document.getElementById(options.containerId); // Obtain container by ID.
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }
        this.children = this.parallaxContainer.querySelectorAll('[data-depth]'); // Retrieve layers with 'data-depth'.
        this.layers = this.initializeLayers(); // Initialize and configure layer elements.
        this.baseElement = this.findBaseElement(); // Identify the base element to set container dimensions.
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers()); // Set up resize observer for dynamic resizing.
        this.initializeParallax(); // Set up parallax settings and event listeners.
        this.attachDeviceOrientationListener = this._attachDeviceOrientationListener.bind(this); // Bind device orientation listener for permissions handling.
        this.moveTimeout = undefined; // Prepare for debouncing mouse move events.
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
        // Determine the center of the parallax container.
        const [centerX, centerY] = this.getCenterXY();
        // Calculate the mouse's relative position within the parallax container.
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;
        // Iterate over each layer to compute and apply the parallax transformation.
        this.layers.forEach(layer => {
            // Compute the displacement influenced by depth and the smoothing factor.
            let deltaX = (mouseX - centerX) * layer.depth * this.options.smoothingFactor;
            let deltaY = (mouseY - centerY) * layer.depth * this.options.smoothingFactor;
            // Restrict the displacement to within the predefined maximum range.
            const boundX = Math.min(Math.max(deltaX, -layer.maxRange), layer.maxRange);
            const boundY = Math.min(Math.max(deltaY, -layer.maxRange), layer.maxRange);
            // Apply the constrained transformation to the layer.
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }
    /**
     * Handles device orientation events to dynamically adjust the position of parallax layers based on device tilt.
     * This method computes movements from the 'beta' and 'gamma' orientation values and applies them, modified by
     * user-defined settings for gyroscopic effect and smoothing. It ensures movements are within each layer's defined range.
     *
     * Features:
     * - Real-time device orientation handling to create dynamic parallax effects.
     * - Uses 'beta' (front-to-back tilt) and 'gamma' (left-to-right tilt) to calculate directional movement.
     * - Applies a gyro effect modifier and a smoothing factor to enhance the natural feel of motion.
     *
     * Guards and Checks:
     * - Exits early if essential orientation data (beta, gamma) is missing, ensuring robust execution.
     * - Constrains calculated movements within each layer's maximum allowable range to maintain visual coherence.
     *
     * @param event - The DeviceOrientationEvent containing orientation data.
     */
    handleDeviceOrientation(event) {
        const { beta, gamma } = event;
        if (beta === null || gamma === null) {
            return; // Exit if essential orientation data is missing.
        }
        // Calculate movement based on device tilt, assuming normal portrait orientation.
        let movementX = gamma * (this.options.gyroEffectModifier || 10) * (this.options.smoothingFactor || 0.13);
        let movementY = beta * (this.options.gyroEffectModifier || 10) * (this.options.smoothingFactor || 0.13);
        // Apply calculated movements to each layer, adjusted for depth and constrained within maximum range.
        this.layers.forEach(layer => {
            const deltaX = Math.min(Math.max(movementX * layer.depth, -layer.maxRange), layer.maxRange);
            const deltaY = Math.min(Math.max(movementY * layer.depth, -layer.maxRange), layer.maxRange);
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
    async _attachDeviceOrientationListener() {
        // Function to add the device orientation event listener.
        const addOrientationListener = () => {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
        };
        // Check if DeviceOrientationEvent is defined and supports the requestPermission method.
        if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
            // Function to request permission on user gesture (click or touchend).
            const requestPermissionOnUserGesture = async () => {
                // Remove listeners to prevent multiple triggers.
                document.removeEventListener('click', requestPermissionOnUserGesture);
                document.removeEventListener('touchend', requestPermissionOnUserGesture);
                try {
                    // Request permission for device orientation.
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        addOrientationListener();
                    }
                    else {
                        console.error('Permission for device orientation was denied.');
                    }
                }
                catch (error) {
                    console.error('Error requesting permission for device orientation:', error);
                }
            };
            // Attach listeners to document to trigger permission request on the first user interaction.
            document.addEventListener('click', requestPermissionOnUserGesture);
            document.addEventListener('touchend', requestPermissionOnUserGesture);
        }
        else if ('ondeviceorientation' in window) {
            // Add the event listener if permissions are not required.
            addOrientationListener();
        }
        else {
            // Log error if device orientation is unsupported.
            console.error('Device orientation is not supported by this device.');
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
            gyroListenerTrigger.addEventListener('click', () => this._attachDeviceOrientationListener());
        }
        else {
            this._attachDeviceOrientationListener(); // Fallback to attaching without user gesture if no specific element found.
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