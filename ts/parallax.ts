interface LayerElement extends HTMLElement {
    dataDepth: number;
    dataMaxRange: number;
}

interface ParallaxOptions {
    containerId: string;
}


class Parallax {
    private baseElement: HTMLElement;
    private parallaxContainer: HTMLElement;
    private layers: NodeListOf<HTMLElement>;
    private resizeObserver: ResizeObserver;

    constructor(containerId: string) {
        this.parallaxContainer = document.getElementById(containerId) as HTMLElement;
        this.layers = this.parallaxContainer.querySelectorAll('[data-depth]');
        this.baseElement = this.findBaseElement();
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayers());

        this.initializeParallax();
    }

    private findBaseElement(): HTMLElement {
        const base = this.parallaxContainer.querySelector('[data-isBaseDimensions]') as HTMLElement;
        if (!base) {
            console.error("Base element with `data-isBaseDimensions` not found. Defaulting to first child.");
            // If no base element is found, default to the first child if it exists, or create a new div as a fallback.
            if (this.parallaxContainer.children.length > 0) {
                return this.parallaxContainer.children[0] as HTMLElement;
            } else {
                console.warn("No children in parallax container. Creating an empty div as fallback.");
                return document.createElement('div'); // Creating an empty div if no children exist
            }
        }
        return base;
    }    

    private initializeParallax(): void {
        this.updateContainerAndLayers();
        this.attachEvents();
        this.setupResizeObserver();
    }

    private updateContainerAndLayers(): void {
        const baseWidth = this.baseElement.offsetWidth;
        const baseHeight = this.baseElement.offsetHeight;
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }

    private attachEvents(): void {
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }

    private handleMouseMove(event: MouseEvent): void {
        const centerX = this.parallaxContainer.offsetWidth / 2;
        const centerY = this.parallaxContainer.offsetHeight / 2;
        const mouseX = event.clientX - this.parallaxContainer.getBoundingClientRect().left;
        const mouseY = event.clientY - this.parallaxContainer.getBoundingClientRect().top;

        this.layers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth')!);
            const maxRange = parseFloat(layer.getAttribute('data-maxRange')!);
            const smoothingFactor = 0.13; // Adjusts the sensitivity
            let deltaX = (mouseX - centerX) * depth * smoothingFactor;
            let deltaY = (mouseY - centerY) * depth * smoothingFactor;
            const boundX = Math.min(Math.max(deltaX, -maxRange), maxRange);
            const boundY = Math.min(Math.max(deltaY, -maxRange), maxRange);

            layer.style.transform = `translate(${boundX}px, ${boundY}px)`;
        });
    }

    private setupResizeObserver(): void {
        this.resizeObserver.observe(this.baseElement);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Parallax('parallaxContainer');
});
