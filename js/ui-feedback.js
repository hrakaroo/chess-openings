// UI Feedback Module
// Handles loading indicators, error messages, and user notifications

/**
 * Show a loading indicator
 * @param {string} message - Message to display
 * @returns {function} Function to hide the loading indicator
 */
function showLoading(message) {
    var existing = document.getElementById('loadingIndicator');
    if (existing) {
        existing.remove();
    }

    var overlay = document.createElement('div');
    overlay.id = 'loadingIndicator';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        flex-direction: column;
    `;

    var spinner = document.createElement('div');
    spinner.style.cssText = `
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    `;

    var text = document.createElement('div');
    text.textContent = message || 'Loading...';
    text.style.cssText = `
        color: white;
        font-size: 18px;
        font-family: Arial, sans-serif;
    `;

    overlay.appendChild(spinner);
    overlay.appendChild(text);
    document.body.appendChild(overlay);

    // Add CSS animation if not already present
    if (!document.getElementById('spinnerAnimation')) {
        var style = document.createElement('style');
        style.id = 'spinnerAnimation';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Return a function to hide the loading indicator
    return function() {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    };
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    var overlay = document.getElementById('loadingIndicator');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Show an error message to the user
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {string} [details] - Optional technical details
 */
function showError(title, message, details) {
    var modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
    `;

    var content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        max-width: 500px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    var titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        color: #e74c3c;
        margin-top: 0;
        margin-bottom: 15px;
    `;

    var messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin-bottom: 15px;
        line-height: 1.5;
    `;

    content.appendChild(titleEl);
    content.appendChild(messageEl);

    if (details) {
        var detailsEl = document.createElement('details');
        detailsEl.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
        `;

        var summary = document.createElement('summary');
        summary.textContent = 'Technical Details';
        summary.style.cssText = `
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 10px;
        `;

        var detailsText = document.createElement('pre');
        detailsText.textContent = details;
        detailsText.style.cssText = `
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 12px;
            font-family: monospace;
        `;

        detailsEl.appendChild(summary);
        detailsEl.appendChild(detailsText);
        content.appendChild(detailsEl);
    }

    var closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
    closeButton.onclick = function() {
        modal.remove();
    };

    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close on background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

/**
 * Show an input prompt dialog
 * @param {string} title - Prompt title
 * @param {string} message - Prompt message
 * @param {string} [defaultValue=''] - Default input value
 * @returns {Promise<string|null>} Promise that resolves with input value or null if cancelled
 */
function showPrompt(title, message, defaultValue) {
    return new Promise(function(resolve) {
        var modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        var content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            min-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        var titleEl = document.createElement('h2');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            color: #2c3e50;
            margin-top: 0;
            margin-bottom: 15px;
        `;

        var messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            margin-bottom: 15px;
            line-height: 1.5;
        `;

        var input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue || '';
        input.style.cssText = `
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 20px;
            box-sizing: border-box;
        `;

        var buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;

        var cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #95a5a6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelButton.onclick = function() {
            modal.remove();
            resolve(null);
        };

        var okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        okButton.onclick = function() {
            var value = input.value.trim();
            modal.remove();
            resolve(value);
        };

        // Enter key submits
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                okButton.click();
            }
        });

        // Escape key cancels
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                cancelButton.click();
            }
        });

        content.appendChild(titleEl);
        content.appendChild(messageEl);
        content.appendChild(input);
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(okButton);
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Focus input and select default text
        setTimeout(function() {
            input.focus();
            input.select();
        }, 100);

        // Close on background click
        modal.onclick = function(e) {
            if (e.target === modal) {
                cancelButton.click();
            }
        };
    });
}

/**
 * Show a success message to the user
 * @param {string} message - Success message
 * @param {number} [duration=3000] - Duration in milliseconds
 */
function showSuccess(message, duration) {
    var notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    // Add CSS animation if not already present
    if (!document.getElementById('slideInAnimation')) {
        var style = document.createElement('style');
        style.id = 'slideInAnimation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(function() {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(function() {
            notification.remove();
        }, 300);
    }, duration || 3000);
}

/**
 * Wrap an async function with loading indicator and error handling
 * @param {function} fn - Async function to execute
 * @param {string} loadingMessage - Message to show while loading
 * @param {string} [successMessage] - Message to show on success
 * @returns {Promise} Promise that resolves/rejects based on function result
 */
async function withLoadingAndError(fn, loadingMessage, successMessage) {
    var hideLoading = showLoading(loadingMessage);
    try {
        var result = await fn();
        hideLoading();
        if (successMessage) {
            showSuccess(successMessage);
        }
        return result;
    } catch (error) {
        hideLoading();
        showError(
            'Operation Failed',
            error.message || 'An unexpected error occurred',
            error.stack
        );
        throw error;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showLoading,
        hideLoading,
        showError,
        showPrompt,
        showSuccess,
        withLoadingAndError
    };
}
