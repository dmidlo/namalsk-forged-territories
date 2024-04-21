"use strict";
/**
 * Manages and creates a parallax effect within a specified container. This class handles resizing,
 * mouse movements, and dynamic adjustments of positions of the inner elements based on specified
 * parallax depth and movement range properties of each layer. It ensures smooth, responsive
 * interactions by adjusting the position of parallax layers relative to user interactions.
 *
 * @typeparam T - Specifies that the type parameter T must be an HTMLElement or a subtype thereof.
 *
 * @property {T} baseElement - The primary layer that defines the dimensions of the parallax container.
 * @property {T} parallaxContainer - The main container element that holds all the parallax layers.
 * @property {NodeListOf<T>} children - NodeList of child elements within the parallax container.
 * @property {NodeListOf<ParallaxLayer>} layers - NodeList of all elements acting as parallax layers, each with additional properties for depth and movement range.
 * @property {ResizeObserver} resizeObserver - Observer to detect and react to size changes in the parallax container.
 * @property {ParallaxOptions} options - Configuration options for the parallax effect, such as container ID and smoothing factor.
 * @property {number | undefined} moveTimeout - Optional number representing a timer set to regulate the frequency of handling mouse move events to optimize performance.
 *
 * @method constructor(options: ParallaxOptions) - Initializes the parallax effect within the specified container with optional smoothing behavior.
 * @method private initializeLayers() - Sets up the parallax layers by defining their depth and max range from data attributes.
 * @method private findBaseElement() - Identifies the base element that defines the container dimensions, using a designated attribute or defaulting to the first child.
 * @method private setupResizeObserver() - Attaches a ResizeObserver to the base element to update parallax layer dimensions on resize events.
 * @method private updateContainerAndLayers(baseWidth?: number, baseHeight?: number) - Updates the dimensions of the container and its layers to match the base element or specified dimensions.
 * @method private debounceMouseMove(event: MouseEvent) - Throttles mouse movement handling to enhance performance and responsiveness.
 * @method private handleMouseMove(event: MouseEvent) - Calculates and applies the movement of each parallax layer based on the mouse's position relative to the container's center.
 * @method private initializeParallax() - Sets initial dimensions and positions, binds event listeners for interactive effects, and starts the resize observer.
 * @method private attachEvents() - Binds necessary event handlers to enable dynamic interaction with the parallax system.
 */
class Parallax {
    baseElement; // The base layer that defines the size of the parallax container.
    parallaxContainer; // The main container that holds all parallax layers.
    children;
    layers; // Collection of all parallax layer elements.
    resizeObserver; // Observer to handle resizing of the viewport.
    options; // Configuration options for the parallax effect.
    moveTimeout; // debounce timer for mousemouse events.
    /**
     * Constructs a new Parallax instance with specified configuration options.
     * Initializes the main container and layer elements, sets up the resize observer,
     * and initializes parallax settings including mouse event listeners for the interactive parallax effect.
     * If the specified container element is not found, an error is thrown.
     *
     * @param options - The configuration options for the parallax effect, specifying the container ID and optional smoothing factor.
     *                  The default smoothing factor is set to 0.13 if not provided.
     * @throws {Error} Throws an error if the HTML element with the specified container ID does not exist.
     */
    constructor(options) {
        this.options = { ...options, smoothingFactor: 0.13 }; // Set default smoothing factor if not provided.
        this.parallaxContainer = document.getElementById(options.containerId); // Get the container by ID.
        // If the container is not found, throw an error.
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }
        this.children = this.parallaxContainer.querySelectorAll('[data-depth]'); // Get all layers with 'data-depth' attribute.
        this.layers = this.initializeLayers(); // Initialize and store the layer elements with depth and maxRange
        this.baseElement = this.findBaseElement(); // Find the base layer to determine container dimensions.
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers()); // Setup resize observer.
        this.initializeParallax(); // Initialize parallax settings and event listeners.
        this.moveTimeout = undefined;
    }
    /**
     * Initializes and configures the parallax layers by setting their depth and maxRange properties.
     * Iterates over each child element with a 'data-depth' attribute, converting them into ParallaxLayer instances
     * with properties determined by their respective data attributes. These properties are essential for
     * calculating their movement within the parallax effect. This optimization caches the depth and maxRange values
     * of each layer to avoid repeated DOM queries during mouse movement events.
     *
     * @returns {NodeListOf<ParallaxLayer>} A NodeList of ParallaxLayer elements, each configured with depth and maxRange properties.
     */
    initializeLayers() {
        const layers = Array.from(this.children).map(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth') ?? '0');
            const maxRange = parseFloat(layer.getAttribute('data-max-range') ?? '0');
            Object.assign(layer, { depth, maxRange });
            return layer;
        });
        return layers;
    }
    /**
     * Identifies and returns the base element within the parallax container. This element defines the reference
     * dimensions for the parallax effect. The method looks for an element marked with `data-isBaseDimensions`.
     * If no such element is found, it defaults to the first child of the container. If the container has no children,
     * a new div is created and returned as the base element.
     *
     * @returns {T} The base element of the parallax scene, which sets the scene's dimensions and initial positions.
     * @throws {Error} If no base element is found and no children are present in the container, an error is logged and a fallback div is created and returned.
     */
    findBaseElement() {
        const base = this.parallaxContainer.querySelector('[data-is-base-dimensions]'); // Get element marked as base dimensions.
        if (!base) {
            console.error("Base element with `data-is-base-dimensions` not found. Defaulting to first child.");
            // Default to first child if no base element is found or create a fallback if no children exist.
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
     * Initializes and attaches a ResizeObserver to the base element of the parallax container.
     * This observer monitors changes in the size of the base element, ensuring that adjustments in the viewport size
     * are reflected in the layout and positioning of the parallax layers. The setup is essential for maintaining
     * the alignment and scaling of the parallax effect relative to the changing viewport dimensions.
     */
    setupResizeObserver() {
        this.resizeObserver.observe(this.baseElement); // Start observing the base element for size changes.
    }
    /**
     * Updates the dimensions of the parallax container to match those of the base element.
     * This method adjusts the width and height of the main parallax container based on the dimensions of the base element.
     * It ensures that the container accurately reflects the base element's size for consistent parallax effects.
     *
     * @param baseWidth - The width of the base element or the viewport width during window resizing (defaults to the base element's current width).
     * @param baseHeight - The height of the base element (defaults to the base element's current height).
     */
    updateContainerAndLayers(baseWidth = this.baseElement.offsetWidth, baseHeight = this.baseElement.offsetHeight) {
        this.parallaxContainer.style.width = `${baseWidth}px`; // Set the container's width.
        this.parallaxContainer.style.height = `${baseHeight}px`; // Set the container's height.
    }
    /**
     * Debounces the mouse move events to prevent excessive processing and ensure smoother performance.
     * This method uses a timeout to limit the frequency of handling mouse move events, reducing the number of calls
     * to `handleMouseMove` and thus improving performance, especially during fast and frequent mouse movements.
     *
     * @param event - The MouseEvent object containing details about the current mouse position and movement.
     */
    debounceMouseMove(event) {
        clearTimeout(this.moveTimeout);
        this.moveTimeout = setTimeout(() => {
            this.handleMouseMove(event);
        }, 6);
    }
    /**
     * Handles mouse movement events by adjusting the positions of parallax layers based on the cursor's position within the container.
     * This method calculates the relative mouse coordinates, determines the potential movement for each layer based on its depth,
     * applies the configured smoothing factor, and ensures the movement does not exceed the maximum range specified for each layer.
     * The final transformation is applied to each layer to create a dynamic and responsive parallax effect.
     *
     * @param event - The MouseEvent object containing details about the current mouse position.
     */
    handleMouseMove(event) {
        const centerX = this.parallaxContainer.offsetWidth / 2; // Calculate the center X of the container.
        const centerY = this.parallaxContainer.offsetHeight / 2; // Calculate the center Y of the container.
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left; // Mouse X relative to container.
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top; // Mouse Y relative to container.
        // Adjust each layer based on its depth and max range, applying the smoothing factor.
        this.layers.forEach(layer => {
            let deltaX = (mouseX - centerX) * layer.depth * this.options.smoothingFactor; // Calculate X movement.
            let deltaY = (mouseY - centerY) * layer.depth * this.options.smoothingFactor; // Calculate Y movement.
            const boundX = Math.min(Math.max(deltaX, -layer.maxRange), layer.maxRange); // Ensure X movement is within bounds.
            const boundY = Math.min(Math.max(deltaY, -layer.maxRange), layer.maxRange); // Ensure Y movement is within bounds.
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`; // Apply the transformation.
        });
    }
    handleDeviceOrientation(event) {
        const { beta, gamma } = event; // Extract the relevant components of the orientation
        if (beta === null || gamma === null) {
            return;
        } // If data is not available, exit.
        let movementX;
        let movementY;
        // Calculate movement based on the orientation. This can be adjusted for sensitivity.
        if (window.innerWidth > window.innerHeight) {
            movementX = gamma * this.options.smoothingFactor;
            movementY = beta * this.options.smoothingFactor;
        }
        else {
            movementX = beta * this.options.smoothingFactor;
            movementY = gamma * this.options.smoothingFactor;
        }
        // Apply the movement to each layer
        this.layers.forEach(layer => {
            let deltaX = movementX * layer.depth;
            let deltaY = movementY * layer.depth;
            const boundX = Math.min(Math.max(deltaX, -layer.maxRange), layer.maxRange);
            const boundY = Math.min(Math.max(deltaY, -layer.maxRange), layer.maxRange);
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }
    /**
     * Initializes the foundational aspects of the parallax system, including setting the initial dimensions
     * and positions of the layers, attaching mouse movement event listeners, and setting up a resize observer.
     * This method orchestrates the comprehensive setup required for enabling interactive parallax effects,
     * ensuring that the system responds appropriately to user interactions and environmental changes.
     */
    initializeParallax() {
        this.updateContainerAndLayers(); // Set initial dimensions and positions.
        this.attachEvents(); // Attach mouse movement events.
        this.setupResizeObserver(); // Start observing for resize events.
    }
    async attachDeviceOrientationListener() {
        // A function to actually add the device orientation event listener
        const addOrientationListener = () => {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
        };
        // Check if DeviceOrientationEvent exists and supports the requestPermission method directly.
        if (typeof DeviceOrientationEvent !== 'undefined' && 'requestPermission' in DeviceOrientationEvent) {
            // Add a temporary listener to the document that will request permission on user interaction
            const requestPermissionOnUserGesture = async () => {
                // Prevent multiple triggers
                document.removeEventListener('click', requestPermissionOnUserGesture);
                document.removeEventListener('touchend', requestPermissionOnUserGesture);
                try {
                    // Perform a more appropriate cast to the specific interface handling permissions.
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
            // Listen for the first user interaction to trigger permission request
            document.addEventListener('click', requestPermissionOnUserGesture);
            document.addEventListener('touchend', requestPermissionOnUserGesture);
        }
        else if ('ondeviceorientation' in window) {
            // Add the event listener if the event is inherently supported without permissions.
            addOrientationListener();
        }
        else {
            console.error('Device orientation is not supported by this device.');
        }
    }
    /**
     * Attaches event listeners for mouse movements and window resizing to enable dynamic interaction with the parallax effects.
     * For mouse movements, it binds the `debounceMouseMove` method to the document to adjust the position of parallax layers based on cursor position.
     * For window resizing, it sets up a debounced resize event handler to update the dimensions of the parallax container and layers after a slight delay,
     * ensuring that the parallax effects adjust smoothly to changes in window size.
     */
    attachEvents() {
        document.addEventListener('mousemove', this.debounceMouseMove.bind(this));
        this.attachDeviceOrientationListener();
        let resizeTimer;
        const resizeDelayMS = 6;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateContainerAndLayers(window.innerWidth);
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
    new Parallax({ containerId: 'parallaxContainer', smoothingFactor: 0.13 });
});
//# sourceMappingURL=parallax.js.map