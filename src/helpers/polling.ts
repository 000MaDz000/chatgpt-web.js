/**
 * Configuration object for the polling function.
 */
interface PollingConfig {
    retries?: number;        // Number of retry attempts (default: 5)
    delay?: number;          // Delay in milliseconds between retries (default: 1000 ms)
    functionName?: string;   // Optional name of the function for logging purposes (default: "UnknownFunction")
    allowLogs?: boolean;
}

/**
 * Polling function that retries the provided async callback if it fails.
 * 
 * @template T - The return type of the callback function.
 * @param {() => Promise<T>} callback - An async function that returns a Promise.
 * @param {PollingConfig} config - Configuration object for retries, delay, and function name.
 * @returns {Promise<T | null>} - Resolves with the result of the callback or rejects after all retries fail.
 */
export async function polling<T>(
    callback: () => Promise<T>,
    config: PollingConfig = {}  // Default empty config
): Promise<T | null> {
    const {
        retries = 5,
        delay = 1000,
        functionName = "UnknownFunction",
        allowLogs
    } = config;  // Destructuring config with default values

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (allowLogs) {
                console.log(`[${functionName}] Attempt ${attempt}: Trying...`);
            }
            const result = await callback();
            if (allowLogs) {
                console.log(`[${functionName}] Success on attempt ${attempt}`);
            }
            return result;
        }
        catch (error: any) {
            if (allowLogs) {
                console.error(`[${functionName}] Attempt ${attempt} failed:`, error);
            }
            if (attempt < retries) {
                if (allowLogs) {
                    console.log(`[${functionName}] Retrying after ${delay}ms...`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                if (allowLogs) {
                    console.error(`[${functionName}] All ${retries} attempts failed.`);
                    console.error(`Polling failed in [${functionName}] after ${retries} attempts.`);
                }
                return null;
            }
        }
    }

    return null;
}
