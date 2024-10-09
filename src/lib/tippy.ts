import tippy, { Instance } from 'tippy.js';
import 'tippy.js/animations/shift-toward-subtle.css';

// Define the default options for the Tippy instance
export const defaultOptions = {
  animation: 'shift-toward-subtle',
  theme: 'my-theme',
};

// Define a type for the options parameter
type TooltipOptions = {
  animation?: string;
  theme?: string;
  [key: string]: any; // Allows for additional options
};

// The main function to create a Tippy instance
export default function createTooltip(el: HTMLElement, options: TooltipOptions = {}): Instance {
  // Set the 'vtooltip' attribute on the element if it has the setAttribute method
  if (el.setAttribute) {
    el.setAttribute('vtooltip', '');
  }

  // Create a Tippy instance with default and user-defined options
  const instance = tippy(el, {
    ...defaultOptions,
    ...options,
  });

  return instance;
}
