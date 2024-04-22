/**
 * Represents a layer within a parallax scene, extending HTMLElement with properties specific to parallax effects.
 * Each layer's movement characteristics are influenced by its `depth` and `maxRange` properties.
 * The `depth` property determines the layer's relative speed and responsiveness during interactions,
 * while `maxRange` limits the maximum movement in any direction from its original position.
 *
 * @extends {HTMLElement}
 *
 * @property {number} depth - Indicates the perceived distance of the layer from the viewer.
 *                            A higher value suggests a deeper layer, resulting in more pronounced movement effects.
 *                            Layers with higher depth values move more in response to interaction compared to nearer layers.
 *
 * @property {number} maxRange - Specifies the maximum movement (in pixels) allowed from the layer's original position.
 *                               This property controls the extent of translation that a layer can undergo, ensuring that
 *                               the movement remains within visually acceptable bounds, enhancing the realism of the parallax effect.
 */
interface ParallaxLayer extends HTMLElement {
    depth: number;
    maxRange: number;
}

/**
 * Provides a method to request permission to access device orientation events. This interface is crucial
 * for browsers that require explicit user consent before accessing motion sensors due to privacy concerns.
 * 
 * Features:
 * - `requestPermission`: A method to invoke the permission request dialog for device orientation access.
 * 
 * Guards and Checks:
 * - The interface ensures that the consumer code explicitly handles three states: 'granted', 'denied', and 'prompt'.
 *   This is essential for managing user consent in a compliant and predictable manner.
 *
 * @interface
 */
interface DeviceOrientationEventPermissions {
    /**
     * Requests permission from the user to access device orientation data. This method is pivotal in environments
     * where privacy regulations or device capabilities restrict immediate access to sensor data.
     * 
     * Returns:
     * - 'granted': The user has allowed access to device orientation data.
     * - 'denied': The user has denied access to device orientation data.
     * - 'prompt': The user is prompted to grant or deny access, typically through a dialog.
     * 
     * @returns {Promise<'granted' | 'denied' | 'prompt'>} A promise resolving to the permission status.
     */
    requestPermission: () => Promise<'granted' | 'denied' | 'prompt'>;
}

/**
 * Configuration options for setting up a parallax effect within a specified container.
 * Allows customization of the parallax system's responsiveness and behavior based on user interactions,
 * including motion effects from mouse movement and device orientation changes.
 * 
 * @interface
 * @property {string} containerId - The ID of the HTML element that acts as the container for all parallax layers.
 *                                  This property is mandatory and is used to locate the container within the DOM.
 * @property {number} [smoothingFactor] - Optional smoothing factor that modulates the responsiveness and smoothness
 *                                       of the parallax motion. Higher values result in more fluid, but slower reactions to
 *                                       mouse movements. If not provided, a default value can be used within the implementation.
 * @property {number} [gyroEffectModifier] - Optional effect modifier that adds additional movement based on device orientation events.
 *                                           This modifier scales the movement effects caused by tilting the device, increasing
 *                                           or decreasing the sensitivity of the parallax effect to these motions.
 */
interface ParallaxOptions {
    containerId: string;  // Required: Identifies the DOM element to be used as the parallax viewport.
    smoothingFactor?: number;  // Optional: Controls the motion smoothness, defaults can be set in the implementation if not provided.
    gyroEffectModifier?: number;  // Optional: Adjusts the sensitivity of device orientation-based movements.
}

/**
 * Manages a parallax effect within a specified container by handling resizing,
 * mouse movements, and device orientation changes. This class dynamically adjusts
 * positions of parallax layers based on user interactions and sensor data to create
 * immersive visual effects.
 * 
 * Features:
 * - Dynamic resizing support with a ResizeObserver.
 * - Mouse movement handling with debouncing for performance optimization.
 * - Device orientation handling with permission management for enhanced interactivity.
 * 
 * Guards and Checks:
 * - Ensures valid container ID upon initialization or throws an error.
 * - Implements debouncing for mouse movement events to reduce excessive rendering.
 * - Conditionally manages device orientation permissions to comply with privacy standards.
 * 
 * @typeparam T - Specifies that the type parameter must be an HTMLElement or a subtype thereof.
 * @property {T} baseElement - Primary layer defining the dimensions of the parallax container.
 * @property {T} parallaxContainer - Main container holding all parallax layers.
 * @property {NodeListOf<T>} children - NodeList of child elements within the container.
 * @property {NodeListOf<ParallaxLayer>} layers - NodeList of parallax layers with depth and movement range properties.
 * @property {ResizeObserver} resizeObserver - Observer for detecting size changes in the parallax container.
 * @property {ParallaxOptions} options - Configuration options for the parallax effect.
 * @property {number | undefined} moveTimeout - Timer for debouncing mouse move events.
 * 
 * @method constructor(options: ParallaxOptions) - Initializes the parallax effect with specified configuration options.
 * @method private initializeLayers() - Sets up parallax layers based on data attributes.
 * @method private findBaseElement() - Identifies the base element defining container dimensions.
 * @method private setupResizeObserver() - Attaches a ResizeObserver to the base element.
 * @method private updateContainerAndLayers() - Updates container and layer dimensions to match the base element or specified dimensions.
 * @method private debounceMouseMove(event: MouseEvent) - Throttles mouse movement handling to enhance performance.
 * @method private handleMouseMove(event: MouseEvent) - Applies parallax movement calculations to layers based on mouse position.
 * @method private initializeParallax() - Sets initial dimensions, binds event listeners, and starts the resize observer.
 * @method private attachEvents() - Binds necessary event handlers for dynamic interaction with the parallax system.
 */
class Parallax<T extends HTMLElement> {
    private baseElement: T;  // The base layer that defines the size of the parallax container.
    private parallaxContainer: T;  // The main container that holds all parallax layers.
    private children: NodeListOf<T>;
    private layers: NodeListOf<ParallaxLayer>;  // Collection of all parallax layer elements.
    private resizeObserver: ResizeObserver;  // Observer to handle resizing of the viewport.
    private options: ParallaxOptions;  // Configuration options for the parallax effect.
    private moveTimeout: number | undefined;  // debounce timer for mousemouse events.

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
    constructor(options: ParallaxOptions) {
        this.options = { ...options, smoothingFactor: 0.13 }; // Set default smoothing factor if not provided.
        this.parallaxContainer = document.getElementById(options.containerId) as T;  // Get the container by ID.

        // If the container is not found, throw an error.
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }

        this.children = this.parallaxContainer.querySelectorAll<T>('[data-depth]');  // Get all layers with 'data-depth' attribute.
        this.layers = this.initializeLayers();  // Initialize and store the layer elements with depth and maxRange
        
        this.baseElement = this.findBaseElement();  // Find the base layer to determine container dimensions.
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers());  // Setup resize observer.

        this.initializeParallax();  // Initialize parallax settings and event listeners.

        this.moveTimeout = undefined;
    }

    /**
     * Initializes and configures the parallax layers based on data attributes.
     * This method extracts the 'data-depth' and 'data-max-range' attributes from each child element,
     * converts them to numeric values, and assigns these values to each corresponding layer.
     * It ensures that every layer is configured with essential properties for depth-based movement calculations.
     * If attributes are missing, defaults (0 for both depth and maxRange) are used.
     *
     * @returns {NodeListOf<ParallaxLayer>} A NodeList of parallax layer elements, each enriched with 'depth' and 'maxRange' properties.
     */
    private initializeLayers(): NodeListOf<ParallaxLayer> {
        const layers = Array.from(this.children).map(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth') ?? '0');  // Extract depth, default to 0 if missing.
            const maxRange = parseFloat(layer.getAttribute('data-max-range') ?? '0');  // Extract max range, default to 0 if missing.
            Object.assign(layer, {depth, maxRange});  // Assign extracted values to the layer.
            return layer as unknown as ParallaxLayer;  // Cast back to ParallaxLayer to treat as such.
        });

        return layers as unknown as NodeListOf<ParallaxLayer>;  // Return NodeList of configured layers.
    }

    /**
     * Identifies and returns the base element within the parallax container. This element defines the reference
     * dimensions for the parallax effect. The method checks for an element marked with `data-is-base-dimensions`.
     * If no such element is found, it defaults to the first child of the container. If the container has no children,
     * a new div is created and returned as the base element.
     * 
     * This method includes error handling for cases where no suitable base element is found, logging appropriate
     * errors and creating a fallback element if necessary to ensure the parallax system can still function.
     *
     * @returns {T} The base element of the parallax scene, which sets the scene's dimensions and initial positions.
     * @throws {Error} If no base element is found and no children are present in the container, an error is logged and a fallback div is created and returned.
     */
    private findBaseElement(): T {
        const base = this.parallaxContainer.querySelector<T>('[data-is-base-dimensions]');
        if (!base) {
            console.error("Base element with `data-is-base-dimensions` not found. Defaulting to first child.");
            if (this.parallaxContainer.children.length > 0) {
                return this.parallaxContainer.children[0] as T;
            } else {
                console.warn("No children in parallax container. Creating an empty div as fallback.");
                const fallbackDiv = document.createElement('div');
                fallbackDiv.id = "layer-01";
                this.parallaxContainer.appendChild(fallbackDiv);
                return fallbackDiv as unknown as T;
            }
        }
        return base;
    }

    /**
     * Sets up a ResizeObserver on the base element to monitor changes in its dimensions.
     * This is crucial for adapting the parallax container and layers to the viewport's changes.
     * Observing the base element helps maintain the alignment and scaling of the parallax effect
     * relative to the container's dimensions, ensuring visual consistency across different window sizes.
     */
    private setupResizeObserver(): void {
        // Start observing the base element for changes in size to dynamically adjust the parallax scene.
        this.resizeObserver.observe(this.baseElement);
    }

    /**
     * Updates the dimensions of the parallax container to match the current base element's dimensions.
     * This synchronization ensures that the container size accurately reflects the base element's size,
     * maintaining consistent parallax effects across various viewport sizes. The method accepts optional
     * parameters for width and height that default to the base element's current dimensions, allowing for
     * flexibility in dynamically resizing the container.
     * 
     * @param baseWidth - Optional width for the parallax container, defaults to the current width of the base element.
     * @param baseHeight - Optional height for the parallax container, defaults to the current height of the base element.
     */
    private updateContainerAndLayers(baseWidth: number = this.baseElement.offsetWidth, baseHeight: number = this.baseElement.offsetHeight): void {
        this.parallaxContainer.style.width = `${baseWidth}px`;  // Set the container's width to either the specified or base element's width.
        this.parallaxContainer.style.height = `${baseHeight}px`;  // Set the container's height to either the specified or base element's height.
    }

    /**
     * Debounces mouse movement events to enhance performance and responsiveness.
     * This method limits the frequency of execution for `handleMouseMove` to prevent excessive calculations
     * and re-renderings during rapid or frequent mouse movements. A timeout is used to delay the processing of
     * mouse movements until a short period of inactivity (6 milliseconds) has occurred, thus reducing the load
     * on the browser's rendering thread and improving the overall responsiveness of the parallax effect.
     * 
     * @param event - The MouseEvent object containing details about the current mouse position and movement.
     */
    private debounceMouseMove(event: MouseEvent): void {
        // Clear any existing timeout to reset the debounce timer
        clearTimeout(this.moveTimeout);

        // Set a new timeout to delay the handling of the mouse move event
        this.moveTimeout = setTimeout(() => {
            // Call the primary mouse move handler after the debounce delay
            this.handleMouseMove(event);
        }, 6); // 6 milliseconds delay for the debounce, providing a balance between responsiveness and performance
    }

    /**
     * Calculates and returns the central coordinates of the parallax container. This method is crucial for determining the
     * reference point from which layer movements are calculated during mouse interactions.
     *
     * Features:
     * - Provides a consistent reference for central coordinates, enhancing the accuracy of parallax effect calculations.
     *
     * Guards and Checks:
     * - None required, as it operates purely based on the dimensions of `parallaxContainer` which are expected to be valid and positive.
     *
     * @returns {[number, number]} A tuple representing the x and y coordinates of the container's center.
     */
    private getCenterXY(): [number, number] {
        // Compute the vertical center by dividing the container's offset height by two.
        const centerY = this.parallaxContainer.offsetHeight / 2;

        // Compute the horizontal center, assuming a symmetrical container (width equals height).
        const centerX = this.parallaxContainer.offsetWidth / 2;

        // Return the center coordinates as a tuple.
        return [centerX, centerY];
    }


    /**
     * Handles mouse movement events within the parallax container to adjust layer positions dynamically.
     * This method calculates the relative mouse coordinates with respect to the container's center.
     * It then determines and applies the parallax effect to each layer based on their respective depth
     * and movement range constraints. The motion is smoothed by a factor defined in the options.
     * 
     * @param event - The MouseEvent object containing details about the cursor's current position.
     */
    private handleMouseMove(event: MouseEvent): void {
        // Calculate the center coordinates of the parallax container.
        const [centerX, centerY] = this.getCenterXY();

        // Determine the mouse's position relative to the parallax container.
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;  // Mouse X relative to container.
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;  // Mouse Y relative to container.

        // Adjust each layer based on its specified depth and maximum movement range.
        this.layers.forEach(layer => {
            // Calculate the potential displacement based on the cursor's deviation from the center.
            let deltaX = (mouseX - centerX) * layer.depth * this.options.smoothingFactor!;
            let deltaY = (mouseY - centerY) * layer.depth * this.options.smoothingFactor!;

            // Constrain the movement to the layer's maximum allowable range.
            const boundX = Math.min(Math.max(deltaX, -layer.maxRange), layer.maxRange);
            const boundY = Math.min(Math.max(deltaY, -layer.maxRange), layer.maxRange);

            // Apply the calculated transformation to the layer.
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }

    /**
     * Handles device orientation events to adjust the position of parallax layers based on the device's tilt.
     * This method responds to the orientation of the device in real-time, calculating horizontal and vertical
     * movements from the 'beta' (front-to-back tilt) and 'gamma' (left-to-right tilt) values. These movements
     * are modified by the gyroEffectModifier and smoothingFactor settings to tune the responsiveness and amplitude
     * of layer movements. Each layer's movement is also constrained within its defined maximum range to prevent
     * excessive displacement. The method includes checks for null orientation values to ensure reliable execution.
     * 
     * @param event - The DeviceOrientationEvent providing the orientation data.
     */
    private handleDeviceOrientation(event: DeviceOrientationEvent): void {
        const { beta, gamma } = event;
        if (beta === null || gamma === null) {
            return; // Exit if essential data is missing.
        }

        // Calculate movement assuming the phone is in normal portrait orientation.
        let movementX = gamma; // Tilt left-to-right affects horizontal movement.
        let movementY = beta;  // Tilt front-to-back affects vertical movement.

        // Apply the gyro effect modifier and a smoothing factor for each movement.
        const gyroEffect = this.options.gyroEffectModifier || 10;
        const smoothing = this.options.smoothingFactor || 0.13;
        movementX *= gyroEffect * smoothing;
        movementY *= gyroEffect * smoothing;

        // Update each layer's position based on calculated movements and depth.
        this.layers.forEach(layer => {
            const deltaX = movementX * layer.depth;
            const deltaY = movementY * layer.depth;
            const boundX = Math.min(Math.max(deltaX, -layer.maxRange), layer.maxRange);
            const boundY = Math.min(Math.max(deltaY, -layer.maxRange), layer.maxRange);
            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }

    /**
     * Initializes the foundational aspects of the parallax system. This includes setting the initial
     * dimensions and positions of the layers, attaching event listeners for interactive parallax effects,
     * and initiating a resize observer to adapt to viewport changes. This method ensures the parallax
     * system is responsive and ready for user interactions immediately after setup.
     * 
     * - Ensures the container and layers match the initial dimensions of the base element.
     * - Binds mouse and device orientation event handlers to enable dynamic interactions.
     * - Sets up a resize observer to maintain alignment and scaling relative to the viewport, providing a
     *   responsive experience across different device sizes.
     */
    private initializeParallax(): void {
        this.updateContainerAndLayers();  // Initialize dimensions and positions based on the base element.
        this.attachEvents();  // Bind event listeners for mouse and device orientation movements.
        this.setupResizeObserver();  // Begin observing size changes for responsive adjustments.
    }

    /**
     * Asynchronously attaches a device orientation event listener to enhance parallax effects based on device tilts.
     * This method dynamically handles permission requests for device orientation events on platforms that require it (like iOS).
     * It utilizes a two-stage approach: first, it checks if permission needs to be requested and handles that by setting up
     * a temporary event listener that triggers the permission request on user interaction. If the permission is granted, or if
     * the device supports orientation events without permissions, the orientation listener is added. Otherwise, it logs an error.
     * This setup ensures compliance with privacy standards and enhances user interaction by integrating device motion into the parallax effect.
     *
     * Features:
     * - Checks and requests permission for device orientation where required.
     * - Dynamically attaches device orientation event listeners upon user consent.
     * - Enhances the parallax effect with real-time device orientation data.
     * - Guards against multiple permission requests and handles possible exceptions.
     * 
     * @remarks
     * - This method should be called after the DOM is fully loaded to ensure all elements are accessible.
     * - Proper error handling and user feedback mechanisms are crucial for a good user experience in environments requiring permissions.
     */
    private async attachDeviceOrientationListener() {
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
                    const permission = await (DeviceOrientationEvent as unknown as DeviceOrientationEventPermissions).requestPermission();
                    if (permission === 'granted') {
                        addOrientationListener();
                    } else {
                        console.error('Permission for device orientation was denied.');
                    }
                } catch (error) {
                    console.error('Error requesting permission for device orientation:', error);
                }
            };

            // Attach listeners to document to trigger permission request on the first user interaction.
            document.addEventListener('click', requestPermissionOnUserGesture);
            document.addEventListener('touchend', requestPermissionOnUserGesture);
        } else if ('ondeviceorientation' in window) {
            // Add the event listener if permissions are not required.
            addOrientationListener();
        } else {
            // Log error if device orientation is unsupported.
            console.error('Device orientation is not supported by this device.');
        }
    }

    /**
     * Attaches necessary event listeners to facilitate dynamic parallax interactions. 
     * It listens for mouse movements to adjust the parallax effect dynamically and handles window resizing to ensure 
     * the parallax display is correctly scaled to the current viewport. It also initiates the attachment process 
     * for device orientation events, supporting responsive parallax effects based on device movements.
     * 
     * Features:
     * - Debounces mouse move events to limit the frequency of recalculations for performance optimization.
     * - Dynamically updates the parallax layer dimensions on window resize with a minimal delay to prevent excessive recalculations.
     * - Checks and requests permission for device orientation events where necessary, enhancing interactivity on supported devices.
     * 
     * Guards and Checks:
     * - Ensures that mouse move event recalculations are debounced, thus preventing excessive function calls during rapid movement.
     * - Implements a safety check using `clearTimeout` before setting a new resize timeout to ensure that only the latest call is processed.
     * - Conditionally handles device orientation permissions and capabilities based on browser and device support, providing fallbacks or errors as appropriate.
     */
    private attachEvents(): void {
        // Listen to mouse movement across the document, applying a debounced handler to reduce performance impact.
        document.addEventListener('mousemove', this.debounceMouseMove.bind(this));

        // Initialize listening for device orientation changes, requesting permissions if necessary.
        this.attachDeviceOrientationListener();

        // Handle window resizing with a debounce mechanism to update parallax dimensions responsively yet efficiently.
        let resizeTimer: number;
        const resizeDelayMS: number = 6;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);  // Clear any previous timer to ensure only the last resize event within the delay period triggers the update.
            resizeTimer = setTimeout(() => {
                // Update the container and layer dimensions based on the new viewport size after a brief delay.
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
    new Parallax<HTMLElement>({ containerId: 'parallaxContainer', smoothingFactor: 0.13, gyroEffectModifier: 10 });
});
