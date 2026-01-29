import React, { useState, useEffect } from 'react';
import './InstallPWA.css';

const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if dismissed recently (within 7 days)
        const dismissedTime = localStorage.getItem('pwa-install-dismissed');
        if (dismissedTime && Date.now() - parseInt(dismissedTime) < 7 * 24 * 60 * 60 * 1000) {
            return;
        }

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // For iOS, show banner after delay
        if (isIOSDevice) {
            const timer = setTimeout(() => setShowInstallBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show banner after a short delay for better UX
            setTimeout(() => setShowInstallBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowInstallBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for user response
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted PWA install');
        } else {
            console.log('User dismissed PWA install');
        }

        setDeferredPrompt(null);
        setShowInstallBanner(false);
    };

    const handleDismiss = () => {
        setShowInstallBanner(false);
        setShowIOSInstructions(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    const handleRemindLater = () => {
        setShowInstallBanner(false);
        setShowIOSInstructions(false);
        // Will show again in 24 hours
        localStorage.setItem('pwa-install-dismissed', (Date.now() - 6 * 24 * 60 * 60 * 1000).toString());
    };

    if (isInstalled || !showInstallBanner) {
        return null;
    }

    return (
        <>
            {/* Main Install Banner */}
            <div className={`pwa-install-banner ${showInstallBanner ? 'show' : ''}`}>
                <div className="pwa-banner-content">
                    <div className="pwa-app-info">
                        <div className="pwa-app-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        </div>
                        <div className="pwa-app-details">
                            <h4>Install MediCare+</h4>
                            <p>Get quick access to appointments, records & emergency services</p>
                        </div>
                    </div>
                    <div className="pwa-banner-actions">
                        <button className="pwa-btn-later" onClick={handleRemindLater}>
                            Later
                        </button>
                        <button className="pwa-btn-install" onClick={handleInstallClick}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                            </svg>
                            Install App
                        </button>
                    </div>
                </div>
                <button className="pwa-close-btn" onClick={handleDismiss} aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>

            {/* iOS Instructions Modal */}
            {showIOSInstructions && (
                <div className="pwa-ios-overlay" onClick={handleDismiss}>
                    <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="pwa-ios-close" onClick={handleDismiss}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                        <div className="pwa-ios-header">
                            <div className="pwa-ios-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                            </div>
                            <h3>Install MediCare+</h3>
                            <p>Add to your home screen for the best experience</p>
                        </div>
                        <div className="pwa-ios-steps">
                            <div className="pwa-ios-step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <p>Tap the <strong>Share</strong> button in Safari</p>
                                    <div className="step-icon share-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path fillRule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="pwa-ios-step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <p>Scroll and tap <strong>"Add to Home Screen"</strong></p>
                                    <div className="step-icon add-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="pwa-ios-step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <p>Tap <strong>"Add"</strong> to install</p>
                                </div>
                            </div>
                        </div>
                        <button className="pwa-ios-got-it" onClick={handleDismiss}>
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPWA;
