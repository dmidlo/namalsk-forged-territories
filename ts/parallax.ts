/**
 * Parallax class to handle dynamic dimensional updates and interactive mouse parallax effects with responsiveness.
 */
class Parallax {
    private baseElement: HTMLElement; // Element used as the dimension anchor
    private parallaxContainer: HTMLElement; // Container for all parallax layers
    private layers: NodeListOf<HTMLElement>; // Collection of all parallax layers
    private resizeObserver: ResizeObserver; // Observer to handle dimension changes

    /**
     * Constructor to initialize the Parallax effect.
     * @param containerId The ID of the container element that holds all parallax layers.
     */
    constructor(containerId: string) {
        this.parallaxContainer = document.getElementById(containerId) as HTMLElement;
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
    private findBaseElement(): HTMLElement {
        const base = this.parallaxContainer.querySelector('[data-isBaseDimensions]') as HTMLElement;
        if (!base) throw new Error("Base element with `data-isBaseDimensions` not found.");
        return base;
      }

    /**
     * Initializes the container and layer dimensions based on the base element's size.
     */
    private setupInitialDimensions(): void {
        this.updateContainerAndLayers();
      }

    /**
     * Updates both the dimensions of the parallax container and its child layers to keep proportions responsive.
     */
    private updateContainerAndLayers(): void {
        const baseWidth = this.baseElement.offsetWidth;
        const baseHeight = this.baseElement.offsetHeight;
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
      }

    /**
     * Attaches mouse move event to enable interactive parallax effect.
     */
    private attachEvents(): void {
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event)); // Event Delegation
      }

    /**
     * Handles mouse movement to apply parallax effects on layers based on their depth and max range.
     * @param event The mouse event containing the cursor's current coordinates.
     */
    private handleMouseMove(event: MouseEvent): void {
        const centerX = this.parallaxContainer.offsetWidth / 2;
        const centerY = this.parallaxContainer.offsetHeight / 2;
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;

        this.layers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth')!);
            const maxRange = parseFloat(layer.getAttribute('data-maxRange')!);
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
    private setupResizeObserver(): void {
        this.resizeObserver.observe(this.baseElement);
      }
}

document.addEventListener('DOMContentLoaded', () => {
    new Parallax('parallaxContainer');
});
