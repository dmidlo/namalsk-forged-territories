/**
 * Represents an HTML element within the parallax scene that can move independently based on the mouse movements.
 */
interface LayerElement extends HTMLElement {
    dataDepth: number;  // Represents how much the layer moves relative to mouse movement.
    dataMaxRange: number;  // Maximum movement range of the layer in pixels.
}

/**
 * Defines the configuration options for the Parallax effect within a container.
 */
interface ParallaxOptions {
    containerId: string;  // ID of the HTML element that contains the parallax layers.
    smoothingFactor?: number;  // Smoothing factor for the parallax effect to control motion smoothness.
}

/**
 * Creates and manages a parallax effect within a specified container, handling resizing and mouse movements to adjust the positions of inner elements.
 */
class Parallax<T extends HTMLElement> {
    private baseElement: T;  // The base layer that defines the size of the parallax container.
    private parallaxContainer: T;  // The main container that holds all parallax layers.
    private layers: NodeListOf<T>;  // Collection of all parallax layer elements.
    private resizeObserver: ResizeObserver;  // Observer to handle resizing of the viewport.
    private options: ParallaxOptions;  // Configuration options for the parallax effect.

    /**
     * Initializes a new instance of the Parallax class using specified options.
     * @param options - The configuration options for the parallax effect.
     * @throws {Error} If the specified container element does not exist.
     */
    constructor(options: ParallaxOptions) {
        this.options = { ...options, smoothingFactor: 0.13 }; // Set default smoothing factor if not provided.
        this.parallaxContainer = document.getElementById(options.containerId) as T;  // Get the container by ID.

        // If the container is not found, throw an error.
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }

        this.layers = this.parallaxContainer.querySelectorAll<T>('[data-depth]');  // Get all layers with 'data-depth' attribute.
        this.baseElement = this.findBaseElement();  // Find the base layer to determine container dimensions.
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers());  // Setup resize observer.

        this.initializeParallax();  // Initialize parallax settings and event listeners.
    }

    /**
     * Searches for the base element within the container that dictates the dimensions of the parallax scene.
     * @returns The base element used to determine the size of the parallax container.
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
     * Sets up the initial configuration and event listeners for the parallax effect.
     */
    private initializeParallax(): void {
        this.updateContainerAndLayers();  // Set initial dimensions and positions.
        this.attachEvents();  // Attach mouse movement events.
        this.setupResizeObserver();  // Start observing for resize events.
    }

    /**
     * Updates the dimensions and position of the container and its child layers based on the base element.
     */
    private updateContainerAndLayers(): void {
        const baseWidth = this.baseElement.offsetWidth;  // Get width of the base element.
        const baseHeight = this.baseElement.offsetHeight;  // Get height of the base element.
        this.parallaxContainer.style.width = `${baseWidth}px`;  // Set the container's width.
        this.parallaxContainer.style.height = `${baseHeight}px`;  // Set the container's height.
    }

    /**
     * Attaches mouse movement events to the container to enable interactive parallax effects.
     */
    private attachEvents(): void {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    /**
     * Adjusts the position of each parallax layer in response to mouse movements.
     * @param event - The MouseEvent object containing the mouse's position.
     */
    private handleMouseMove(event: MouseEvent): void {
        const centerX = this.parallaxContainer.offsetWidth / 2;  // Calculate the center X of the container.
        const centerY = this.parallaxContainer.offsetHeight / 2;  // Calculate the center Y of the container.
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;  // Mouse X relative to container.
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;  // Mouse Y relative to container.

        // Adjust each layer based on its depth and max range, applying the smoothing factor.
        this.layers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth')!) || 0;  // Get depth or default to 0.
            const maxRange = parseFloat(layer.getAttribute('data-maxRange')!) || 0;  // Get max range or default to 0.
            let deltaX = (mouseX - centerX) * depth * this.options.smoothingFactor!;  // Calculate X movement.
            let deltaY = (mouseY - centerY) * depth * this.options.smoothingFactor!;  // Calculate Y movement.
            const boundX = Math.min(Math.max(deltaX, -maxRange), maxRange);  // Ensure X movement is within bounds.
            const boundY = Math.min(Math.max(deltaY, -maxRange), maxRange);  // Ensure Y movement is within bounds.

            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;  // Apply the transformation.
        });
    }

    /**
     * Sets up an observer to adjust the parallax scene when the container's size changes.
     */
    private setupResizeObserver(): void {
        this.resizeObserver.observe(this.baseElement);  // Start observing the base element for size changes.
    }
}

// Initialize Parallax when the document content is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    new Parallax<HTMLElement>({ containerId: 'parallaxContainer', smoothingFactor: 0.13 });
});
