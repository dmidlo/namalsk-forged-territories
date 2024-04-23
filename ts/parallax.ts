interface ParallaxLayer extends HTMLElement {
    depth: number;
    maxRange: number;
}

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

interface DeviceMotionEventPermissions {
    requestPermission: () => Promise<'granted' | 'denied' | 'prompt'>;
}

interface ParallaxOptions {
    containerId: string;  // Required: Identifies the DOM element to be used as the parallax viewport.
    smoothingFactor?: number;  // Optional: Controls the motion smoothness, defaults can be set in the implementation if not provided.
    gyroEffectModifier?: number;  // Optional: Adjusts the sensitivity of device orientation-based movements.
    sensitivity?: number;
    mouseDebounce?: number;
    windowResizeDebounce?: number;
}

class Parallax<T extends HTMLElement> {
    private baseElement: T;  // Defines the parallax container's dimensions.
    private parallaxContainer: T;  // Container for all parallax layers.
    private children: NodeListOf<T>;  // Child elements within the container, potential layers.
    private layers: NodeListOf<ParallaxLayer>;  // Configured parallax layers.
    private resizeObserver: ResizeObserver;  // Monitors size changes of the base element.
    private options: ParallaxOptions;  // Configurable options for behavior and responsiveness.
    private inputX: number = 0; // Default initialization to 0 to ensure value is always defined.
    private inputY: number = 0; // Default initialization to 0 to ensure value is always defined.
    public attachDeviceOrientationListener: () => Promise<void>;  // Asynchronously attaches a device orientation event listener.

    constructor(options: ParallaxOptions) {
        const defaults: Partial<ParallaxOptions> = {
            smoothingFactor: 0.13, // Default smoothing factor for movement smoothness.
            gyroEffectModifier: 10, // Default gyro effect modifier for device orientation sensitivity.
            mouseDebounce: 6, // Milliseconds delay before re-polling mouse coordinates.
            windowResizeDebounce: 6, // Milliseconds delay before re-polling window dimensions during resize events.
        };

        // Calculate default sensitivity if not provided, adjusting for device and display characteristics.
        if (options.sensitivity === undefined) {
            options.sensitivity = this.computeSensitivity();
        }

        this.options = { ...defaults, ...options }; // Merge user-provided options with defaults.
        this.parallaxContainer = document.getElementById(options.containerId) as T;

        // Validate the existence of the specified container to ensure subsequent operations.
        if (!this.parallaxContainer) {
            throw new Error(`Element with ID '${options.containerId}' not found.`);
        }

        // Identify and configure all child elements that represent parallax layers.
        this.children = this.parallaxContainer.querySelectorAll<T>('[data-depth]');
        this.layers = this.initializeLayers(); // Set depth and maxRange based on data attributes.

        // Determine the base element for setting dimensions and reference for resizing.
        this.baseElement = this.findBaseElement();
        this.resizeObserver = new ResizeObserver(() => this.updateContainerAndLayersOnWindowResize()); // Monitor size changes for dynamic responsiveness.
        this.inputX = 0;
        this.inputY = 0;

        this.initializeParallax(); // Complete the setup by initializing dimensions, attaching event handlers, and starting observers.
        this.attachDeviceOrientationListener = this._attachDeviceOrientationAndMotionListener.bind(this); // Prepare device orientation handling with permissions.
    }

    private initializeLayers(): NodeListOf<ParallaxLayer> {
        // Map through children to assign depth and maxRange properties based on data attributes.
        const layers = Array.from(this.children).map(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth') ?? '0');  // Default depth is 0 if attribute is absent.
            const maxRange = parseFloat(layer.getAttribute('data-max-range') ?? '0');  // Default maxRange is 0 if attribute is absent.
            Object.assign(layer, { depth, maxRange });  // Update layer with parsed properties.
            return layer as unknown as ParallaxLayer;  // Cast back to ParallaxLayer type.
        });

        return layers as unknown as NodeListOf<ParallaxLayer>;  // Return NodeList of configured layers.
    }

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

    private setupResizeObserver(): void {
        // Observe size changes in the base element to update the parallax dimensions responsively.
        this.resizeObserver.observe(this.baseElement);
    }

    private updateContainerAndLayersOnWindowResize(baseWidth: number = this.baseElement.offsetWidth, baseHeight: number = this.baseElement.offsetHeight): void {
        this.parallaxContainer.style.width = `${baseWidth}px`;
        this.parallaxContainer.style.height = `${baseHeight}px`;
    }
    

    private getCenterXY(): [number, number] {
        // Return center of the base element, not the entire container to avoid using inflated values
        const centerY = this.baseElement.offsetHeight / 2;
        const centerX = this.baseElement.offsetWidth / 2;
        return [centerX, centerY];
    }

    private computeSensitivity(): number {
        const aspectRatio = window.innerWidth / window.innerHeight;
        return aspectRatio * 10;  // Multiply aspect ratio by 10 to derive a basic sensitivity level.
    }

    private rotate(beta: number | null, gamma: number | null): void {
        if (beta === null || gamma === null) {
          return;
        }
    
        const sensitivity = this.options.sensitivity ?? 30;
        this.inputX = beta / sensitivity;
        this.inputY = gamma / sensitivity;
    }

    private handleMouseMove(event: MouseEvent): void {
        const [centerX, centerY] = this.getCenterXY();
        const mouseX = event.clientX - centerX - this.baseElement.getBoundingClientRect().left;
        const mouseY = event.clientY - centerY - this.baseElement.getBoundingClientRect().top;
    
        this.inputX = mouseX / centerX;
        this.inputY = mouseY / centerY;
    
        window.requestAnimationFrame(() => {
            this.applyLayerTransformations(this.options.smoothingFactor!, this.options.smoothingFactor!, 'mouse');
        });
    }

    private handleDeviceOrientation(event: DeviceOrientationEvent): void {
        const { beta, gamma } = event;
    
        if (beta !== null && gamma !== null) {
            this.rotate(beta, gamma);
            const gyroModifier = this.options.gyroEffectModifier ?? 10;
    
            window.requestAnimationFrame(() => {
                this.applyLayerTransformations(gyroModifier, gyroModifier, 'gyro');
            });
        }
    }

    private handleDeviceMotion(event: DeviceMotionEvent): void {
        if (event.rotationRate) {
            const { beta, gamma } = event.rotationRate;
    
            if (beta !== null && gamma !== null) {
                this.inputX = beta / (this.options.sensitivity ?? 30);
                this.inputY = gamma / (this.options.sensitivity ?? 30);
    
                const motionModifier = this.options.gyroEffectModifier ?? 10;
    
                window.requestAnimationFrame(() => {
                    this.applyLayerTransformations(motionModifier, motionModifier, 'motion');
                });
            }
        }
    }

    private applyLayerTransformations(inputModifierX: number, inputModifierY: number, eventOrigin: 'mouse' | 'gyro' | 'motion'): void {
    const [centerX, centerY] = this.getCenterXY();

    // Adjust input modifiers based on the event source to control responsiveness and effects
    let modifierX = inputModifierX;
    let modifierY = inputModifierY;
    if (eventOrigin === 'gyro') {
        // Gyro inputs can be more sensitive, so reduce the effect
        modifierX *= 0.1;
        modifierY *= 0.1;
    } else if (eventOrigin === 'motion') {
        // Device motion inputs often have larger range and variability
        modifierX *= 0.05;
        modifierY *= 0.05;
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



    private initializeParallax(): void {
        this.updateContainerAndLayersOnWindowResize();  // Set initial container and layer dimensions.
        this.attachEvents();  // Bind event handlers for interactive parallax effects.
        this.setupResizeObserver();  // Start observing for changes in container size.
    }

    private async _attachDeviceOrientationAndMotionListener() {
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
                const permission = await (DeviceOrientationEvent as unknown as DeviceOrientationEventPermissions).requestPermission();
                if (permission === 'granted') {
                    addOrientationAndMotionListeners();
                } else {
                    console.error('Permission for device orientation was denied.');
                }
            } catch (error) {
                console.error('Error requesting permission for device orientation:', error);
            }
        } else if ('ondeviceorientation' in window && 'ondevicemotion' in window) {
            addOrientationAndMotionListeners(); // No permission needed, but supported
        } else {
            console.error('Device orientation or motion is not supported by this device.');
        }
    }

    private debounce(func: (...args: any[]) => void, wait: number, immediate: boolean = false): (...args: any[]) => void {
        let timeout: number | undefined;
        return function(this: any, ...args: any[]) {
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

    private attachEvents(): void {
        // Debounced mouse movement handling for optimized performance
        const debouncedMouseMove = this.debounce(this.handleMouseMove.bind(this), this.options.mouseDebounce!);
        this.parallaxContainer.addEventListener('mousemove', debouncedMouseMove);
    
        window.addEventListener('resize', this.debounce(() => {
            // Update dimensions upon resizing
            this.updateContainerAndLayersOnWindowResize(window.innerWidth, window.innerHeight);
        }, this.options.windowResizeDebounce!));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Parallax<HTMLElement>({ containerId: 'parallaxContainer', smoothingFactor: 0.13, gyroEffectModifier: 10 });
});
