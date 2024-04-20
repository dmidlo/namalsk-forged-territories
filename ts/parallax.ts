/**
 * Interface for defining a layer within a parallax scene.
 * A `ParallaxLayer` extends the standard HTMLElement with additional properties
 * that determine how it interacts with parallax effects.
 * 
 * @extends {HTMLElement}
 * 
 * Properties:
 * @property {number} depth - The depth of the layer within the parallax scene. This value influences
 *                            the rate at which the layer moves in response to user interactions. A higher
 *                            value indicates a greater sense of depth and results in faster movement relative to
 *                            the foreground.
 * @property {number} maxRange - The maximum movement range (in pixels) that this layer can move
 *                               from its original position in response to the parallax effect. This
 *                               sets the boundary of movement in both X and Y directions.
 */
interface ParallaxLayer extends HTMLElement {
    depth: number;
    maxRange: number;
}

/**
 * Defines the configuration options for the Parallax effect within a container.
 * This interface is used to configure the behavior and visual effects of parallax layers
 * based on user interactions and environmental conditions.
 *
 * @interface
 * @property {string} containerId - The ID of the HTML element that acts as the container
 *                                  for all parallax layers. This element will host the visual
 *                                  elements that move in response to mouse movements.
 * @property {number} [smoothingFactor] - Optional smoothing factor that controls the
 *                                       responsiveness and smoothness of the parallax motion.
 *                                       Higher values result in smoother but slower reactions
 *                                       to mouse movement. If not provided, a default value
 *                                       is used which ensures a balance between smoothness and
 *                                       responsiveness.
 */
interface ParallaxOptions {
    containerId: string;
    smoothingFactor?: number;
}

/**
 * Manages and creates a parallax effect within a specified container. This class handles resizing,
 * mouse movements, and dynamic adjustments of positions of the inner elements based on specified
 * parallax depth and movement range properties of each layer. It ensures smooth, responsive
 * interactions by adjusting the position of parallax layers relative to user interactions.
 *
 * @typeparam T - A type parameter that extends HTMLElement, representing the type of the base and layer elements within the parallax container.
 *
 * @property {T} baseElement - The primary layer that determines the dimensions of the parallax container.
 * @property {T} parallaxContainer - The main container that holds all parallax layers.
 * @property {NodeListOf<T>} children - A NodeList of all child elements within the container that are involved in the parallax effect.
 * @property {NodeListOf<ParallaxLayer>} layers - A NodeList of all configured parallax layer elements.
 * @property {ResizeObserver} resizeObserver - An observer to handle changes in the viewport size affecting the parallax container.
 * @property {ParallaxOptions} options - Configuration options for the parallax effect, including container ID and smoothing factor.
 *
 * @constructor
 * Initializes the parallax system, sets up the main container and layers, and attaches necessary event listeners for handling parallax effects.
 * Throws an error if the container specified by the options does not exist.
 *
 * @method initializeLayers - Initializes and configures the parallax layers setting their depth and maxRange properties from data attributes.
 * @method findBaseElement - Identifies the base element in the container used to define the dimensions and reference point for the parallax effect.
 * @method setupResizeObserver - Initializes a ResizeObserver to monitor and react to changes in the size of the base element.
 * @method updateContainerAndLayers - Updates the dimensions of the parallax container and layers based on the base element's size.
 * @method handleMouseMove - Handles mouse movement events, adjusting the position of each layer based on its configured properties.
 * @method initializeParallax - Sets up the foundational aspects of the parallax system including initial dimensions, positions, and event listeners.
 * @method attachEvents - Attaches mouse movement event listeners to the document for interactive parallax effects.
 */
class Parallax<T extends HTMLElement> {
    private baseElement: T;  // The base layer that defines the size of the parallax container.
    private parallaxContainer: T;  // The main container that holds all parallax layers.
    private children: NodeListOf<T>;
    private layers: NodeListOf<ParallaxLayer>;  // Collection of all parallax layer elements.
    private resizeObserver: ResizeObserver;  // Observer to handle resizing of the viewport.
    private options: ParallaxOptions;  // Configuration options for the parallax effect.

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
    }

    /**
     * Initializes and configures the parallax layers by setting their depth and maxRange properties.
     * This method iterates over all child elements that have a `data-depth` attribute, converting them
     * into `ParallaxLayer` instances. Each layer's depth and maxRange are determined by the respective
     * data attributes and are crucial for calculating their movement within the parallax effect.
     *
     * This is a performance optimization to cache depth and maxRange values of each layer instead
     * of repeatedly calling `getAttribute` within `handleMouseMove`.
     * 
     * @returns {NodeListOf<ParallaxLayer>} A NodeList of ParallaxLayer elements, each configured with depth and maxRange properties.
     */
    private initializeLayers(): NodeListOf<ParallaxLayer> {
        const layers = Array.from(this.children).map(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth') || '0');
            const maxRange = parseFloat(layer.getAttribute('data-maxRange') || '0');
            Object.assign(layer, {depth, maxRange});
            return layer as unknown as ParallaxLayer;
        });

        return layers as unknown as NodeListOf<ParallaxLayer>;
    }

    /**
     * Searches for and identifies the base element within the parallax container, which defines the dimensions and reference point for the parallax effect. 
     * The base element is specified by the `data-isBaseDimensions` attribute. If no such element exists, the method defaults to using the first child of the parallax container.
     * If the container is empty, it creates and returns a new div element to serve as the base.
     * 
     * @returns {T} The base element of the parallax scene, crucial for setting the scene's dimensions and initial positions.
     * @throws {Error} Throws an error if no base element is found and no children are present in the parallax container to default to.
     */
    private findBaseElement(): T {
        const base = this.parallaxContainer.querySelector<T>('[data-isBaseDimensions]');  // Get element marked as base dimensions.
        if (!base) {
            console.error("Base element with `data-isBaseDimensions` not found. Defaulting to first child.");
            // Default to first child if no base element is found or create a fallback if no children exist.
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
     * Initializes a ResizeObserver to monitor changes in the size of the base element.
     * This observer ensures that any adjustments in the dimensions of the base element trigger
     * updates to the parallax container and layers, maintaining the correct scale and alignment
     * of the parallax effect relative to the viewport.
     */
    private setupResizeObserver(): void {
        this.resizeObserver.observe(this.baseElement);  // Start observing the base element for size changes.
    }

    /**
     * Updates the dimensions of the parallax container to match those of the base element.
     * This method adjusts the width and height of the main parallax container based on the dimensions of the base element.
     * It ensures that the container accurately reflects the base element's size for consistent parallax effects.
     */
    private updateContainerAndLayers(baseWidth: Number = this.baseElement.offsetWidth, baseHeight: Number = this.baseElement.offsetHeight): void {
        // const baseWidth = this.baseElement.offsetWidth;  // Get width of the base element.
        // const baseHeight = this.baseElement.offsetHeight;  // Get height of the base element.
        this.parallaxContainer.style.width = `${baseWidth}px`;  // Set the container's width.
        this.parallaxContainer.style.height = `${baseHeight}px`;  // Set the container's height.
    }

    /**
     * Handles mouse move events within the parallax container and adjusts the position of each parallax layer.
     * This method calculates the relative movement of the mouse within the parallax container and applies a transformation
     * to each layer based on its depth and maximum allowable range. The transformation for each layer is adjusted using
     * a smoothing factor to ensure the movement is fluid.
     *
     * @param event - The MouseEvent object that contains details about the mouse position and movement.
     */
    private handleMouseMove(event: MouseEvent): void {
        const centerX = this.parallaxContainer.offsetWidth / 2;  // Calculate the center X of the container.
        const centerY = this.parallaxContainer.offsetHeight / 2;  // Calculate the center Y of the container.
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;  // Mouse X relative to container.
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;  // Mouse Y relative to container.

        // Adjust each layer based on its depth and max range, applying the smoothing factor.
        this.layers.forEach(layer => {
            let deltaX = (mouseX - centerX) * layer.depth * this.options.smoothingFactor!;  // Calculate X movement.
            let deltaY = (mouseY - centerY) * layer.depth * this.options.smoothingFactor!;  // Calculate Y movement.
            const boundX = Math.min(Math.max(deltaX, -layer.maxRange), layer.maxRange);  // Ensure X movement is within bounds.
            const boundY = Math.min(Math.max(deltaY, -layer.maxRange), layer.maxRange);  // Ensure Y movement is within bounds.

            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;  // Apply the transformation.
        });
    }

    /**
     * Initializes the parallax effect by setting up the initial dimensions, positions, and event listeners for interactivity.
     * This method orchestrates the foundational setup of the parallax system by updating the container and layer sizes,
     * attaching mouse movement events to enable dynamic interaction with the parallax elements, and setting up a resize
     * observer to maintain the layout integrity when the viewport size changes. This setup ensures that the parallax effect
     * responds appropriately to user interactions and environmental conditions.
     */
    private initializeParallax(): void {
        this.updateContainerAndLayers();  // Set initial dimensions and positions.
        this.attachEvents();  // Attach mouse movement events.
        this.setupResizeObserver();  // Start observing for resize events.
    }

    /**
     * Attaches mouse movement events to the document to enable interactive parallax effects within the container.
     * This method binds the `handleMouseMove` method to mousemove events on the document, ensuring that
     * the parallax effect responds dynamically to user mouse movements across the entire viewport.
     */
    private attachEvents(): void {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('resize', () => {
            this.updateContainerAndLayers(window.innerWidth)
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
    new Parallax<HTMLElement>({ containerId: 'parallaxContainer', smoothingFactor: 0.13 });
});
