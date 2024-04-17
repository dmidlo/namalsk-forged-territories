interface ParallaxLayer {
    depth: number;        // Layer's depth, affecting movement intensity
    maxRange: number;     // Maximum pixel movement range for the layer
}

class Parallax {
    private layers: NodeListOf<HTMLElement>;

    constructor(private containerId: string) {
        const container = document.getElementById(this.containerId) as HTMLElement;
        // Using querySelectorAll to ensure all direct children are selected
        this.layers = container.querySelectorAll<HTMLElement>(':scope > *');
        this.attachEvents();
    }

    private attachEvents(): void {
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }

    private handleMouseMove(event: MouseEvent): void {
        const { clientX, clientY, view } = event;
        if (!view) {
          return;
        }

        const { innerWidth, innerHeight } = view;
        const xPercent = (clientX / innerWidth - 0.5) * 2;
        const yPercent = (clientY / innerHeight - 0.5) * 2;

        this.layers.forEach((layer) => {
            // Accessing dataset values with type assertion for safety
            const depth = parseFloat(layer.dataset['depth'] || "0");
            const maxRange = parseFloat(layer.dataset['maxRange'] || "50");
            const xOffset = xPercent * maxRange * depth;
            const yOffset = yPercent * maxRange * depth;
            layer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    }
}

new Parallax('parallaxContainer');
