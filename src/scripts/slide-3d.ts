/**
 * 3D Product Slide Effect
 * Creates an interactive 3D tilt effect on product images using mouse/touch/gyroscope
 */

interface Slide3DOptions {
  maxRotation?: number; // Max rotation in degrees
  perspective?: number; // CSS perspective value
  transitionSpeed?: number; // Transition duration in ms
  gyroSensitivity?: number; // Gyroscope sensitivity multiplier
}

const defaultOptions: Slide3DOptions = {
  maxRotation: 15,
  perspective: 1000,
  transitionSpeed: 150,
  gyroSensitivity: 0.3,
};

class Slide3DEffect {
  private elements: NodeListOf<HTMLElement>;
  private options: Required<Slide3DOptions>;
  private gyroSupported = false;
  private currentSlideIndex = 0;

  constructor(selector: string, options: Slide3DOptions = {}) {
    this.options = { ...defaultOptions, ...options } as Required<Slide3DOptions>;
    this.elements = document.querySelectorAll(selector);
    
    if (this.elements.length === 0) {
      console.warn('[Slide3D] No elements found with selector:', selector);
      return;
    }

    this.init();
  }

  private init(): void {
    // Set up each element
    this.elements.forEach((el) => {
      el.style.perspective = `${this.options.perspective}px`;
      el.style.transformStyle = 'preserve-3d';
    });

    // Add event listeners
    this.setupMouseEvents();
    this.setupTouchEvents();
    this.setupGyroscope();
    this.setupIntersectionObserver();
  }

  private setupMouseEvents(): void {
    this.elements.forEach((el) => {
      const wrapper = el.querySelector('.product-image-wrapper') as HTMLElement;
      const shadow = el.querySelector('.product-shadow') as HTMLElement;
      
      if (!wrapper) return;

      el.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate rotation based on mouse position relative to center
        const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * this.options.maxRotation;
        const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * this.options.maxRotation;
        
        this.applyTransform(wrapper, shadow, rotateX, rotateY);
      });

      el.addEventListener('mouseleave', () => {
        this.resetTransform(wrapper, shadow);
      });
    });
  }

  private setupTouchEvents(): void {
    this.elements.forEach((el) => {
      const wrapper = el.querySelector('.product-image-wrapper') as HTMLElement;
      const shadow = el.querySelector('.product-shadow') as HTMLElement;
      
      if (!wrapper) return;

      let touchStartX = 0;
      let touchStartY = 0;

      el.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      el.addEventListener('touchmove', (e: TouchEvent) => {
        const touch = e.touches[0];
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const rotateY = ((touch.clientX - centerX) / (rect.width / 2)) * this.options.maxRotation;
        const rotateX = -((touch.clientY - centerY) / (rect.height / 2)) * this.options.maxRotation;
        
        this.applyTransform(wrapper, shadow, rotateX, rotateY);
      }, { passive: true });

      el.addEventListener('touchend', () => {
        this.resetTransform(wrapper, shadow);
      }, { passive: true });
    });
  }

  private setupGyroscope(): void {
    // Check for gyroscope support
    if (typeof DeviceOrientationEvent !== 'undefined') {
      // Request permission on iOS 13+
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        // Will need user interaction to enable
        document.addEventListener('click', async () => {
          try {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            if (permission === 'granted') {
              this.enableGyroscope();
            }
          } catch (error) {
            console.warn('[Slide3D] Gyroscope permission denied');
          }
        }, { once: true });
      } else {
        // Non-iOS devices
        this.enableGyroscope();
      }
    }
  }

  private enableGyroscope(): void {
    this.gyroSupported = true;
    
    window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      
      // Only apply to currently visible slide
      const visibleSlide = this.elements[this.currentSlideIndex];
      if (!visibleSlide) return;

      const wrapper = visibleSlide.querySelector('.product-image-wrapper') as HTMLElement;
      const shadow = visibleSlide.querySelector('.product-shadow') as HTMLElement;
      
      if (!wrapper) return;

      // gamma: left/right tilt (-90 to 90)
      // beta: front/back tilt (-180 to 180)
      const rotateY = (e.gamma || 0) * this.options.gyroSensitivity;
      const rotateX = ((e.beta || 0) - 45) * this.options.gyroSensitivity; // Offset for typical phone holding position
      
      // Clamp values
      const clampedY = Math.max(-this.options.maxRotation, Math.min(this.options.maxRotation, rotateY));
      const clampedX = Math.max(-this.options.maxRotation, Math.min(this.options.maxRotation, rotateX));
      
      this.applyTransform(wrapper, shadow, clampedX, clampedY);
    }, { passive: true });
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const slideIndex = parseInt((entry.target as HTMLElement).dataset.slideIndex || '0', 10);
            this.currentSlideIndex = slideIndex;
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll('.product-slide').forEach((slide) => {
      observer.observe(slide);
    });
  }

  private applyTransform(
    wrapper: HTMLElement,
    shadow: HTMLElement | null,
    rotateX: number,
    rotateY: number
  ): void {
    // Pause the float animation when actively manipulating
    wrapper.style.animationPlayState = 'paused';
    wrapper.style.transition = `transform ${this.options.transitionSpeed}ms ease-out`;
    wrapper.style.transform = `
      translateY(-6px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.02)
    `;

    // Move shadow opposite to tilt direction
    if (shadow) {
      shadow.style.transition = `all ${this.options.transitionSpeed}ms ease-out`;
      shadow.style.transform = `
        translateX(calc(-50% + ${rotateY * 0.5}px))
        scaleX(${1 + Math.abs(rotateY) * 0.005})
      `;
      shadow.style.opacity = `${0.4 + Math.abs(rotateX) * 0.01}`;
    }
  }

  private resetTransform(wrapper: HTMLElement, shadow: HTMLElement | null): void {
    // Resume float animation
    wrapper.style.animationPlayState = 'running';
    wrapper.style.transition = `transform ${this.options.transitionSpeed * 2}ms ease-out`;
    wrapper.style.transform = '';

    if (shadow) {
      shadow.style.transition = `all ${this.options.transitionSpeed * 2}ms ease-out`;
      shadow.style.transform = 'translateX(-50%)';
      shadow.style.opacity = '1';
    }
  }

  public destroy(): void {
    // Clean up would go here if needed
  }
}

// Auto-initialize when DOM is ready
function initSlide3D(): void {
  new Slide3DEffect('[data-3d-element]', {
    maxRotation: 12,
    transitionSpeed: 100,
    gyroSensitivity: 0.25,
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSlide3D);
} else {
  initSlide3D();
}

// Re-initialize on Astro page transitions (View Transitions API)
document.addEventListener('astro:page-load', initSlide3D);

export { Slide3DEffect, initSlide3D };
