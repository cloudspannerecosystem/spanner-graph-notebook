class LoaderManager {
  constructor() {
    this.templateCache = null;
  }

  createLoaderElement(message) {
    const loaderContainer = document.createElement('div');
    
    Object.assign(loaderContainer.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '99999',
      pointerEvents: 'all',
      borderRadius: '8px'
    });

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      textAlign: 'center',
      padding: '20px'
    });

    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
      border: '6px solid #f3f3f3',
      borderTop: '6px solid #4285F4',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      margin: 'auto',
      animation: 'spin 1s linear infinite'
    });

    const messageEl = document.createElement('div');
    Object.assign(messageEl.style, {
      marginTop: '10px',
      fontSize: '16px',
      color: '#333',
      fontFamily: 'Arial, sans-serif'
    });
    messageEl.textContent = message;

    if (!document.getElementById('loader-keyframes')) {
      const style = document.createElement('style');
      style.id = 'loader-keyframes';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Assemble elements
    wrapper.appendChild(spinner);
    wrapper.appendChild(messageEl);
    loaderContainer.appendChild(wrapper);

    return loaderContainer;
  }

  async showLoader(message = "Loading...", container = null) {    
    const loaderId = container ? `auth-loader-${container.dataset.id || 'default'}` : 'auth-loader';
    
    // Remove existing loader first
    const existingLoader = document.getElementById(loaderId);
    if (existingLoader) {
      existingLoader.remove();
    }

    const loaderContainer = this.createLoaderElement(message);
    loaderContainer.id = loaderId;

    if (container) {
      const originalPosition = window.getComputedStyle(container).position;
      
      if (originalPosition === 'static' || originalPosition === '') {
        container.style.position = 'relative';
        loaderContainer.dataset.originalPosition = '';
      } else {
        loaderContainer.dataset.originalPosition = container.style.position;
      }
      
      if (container.offsetHeight === 0) {
        container.style.minHeight = '200px';
      }
      
      container.appendChild(loaderContainer);
    } else {
      Object.assign(loaderContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh'
      });
      document.body.appendChild(loaderContainer);
    }
    loaderContainer.offsetHeight;
    
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(loaderContainer);
    }, 100);
    
    return loaderContainer;
  }

  removeLoader(container = null) {    
    const loaderId = container ? `auth-loader-${container.dataset.id || 'default'}` : 'auth-loader';
    const loader = document.getElementById(loaderId);

    if (loader) {      
      if (container) {
        const originalPosition = loader.dataset.originalPosition;
        if (originalPosition !== undefined) {
          if (originalPosition === '') {
            container.style.position = 'static';
          } else {
            container.style.position = originalPosition;
          }
        }
      }
      
      loader.remove();
    }
  }
}

const loader = new LoaderManager();
window.showLoader = loader.showLoader.bind(loader);
window.removeLoader = loader.removeLoader.bind(loader);