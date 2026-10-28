/** Lets the browser paint and handle input between heavy steps of a long task. */
export const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
