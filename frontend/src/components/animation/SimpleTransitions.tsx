import React, { useEffect, useRef, useState } from 'react';

export interface SimpleTransitionProps {
    show: boolean;
    children: React.ReactNode;
    className?: string;
    duration?: number;
}

/**
 * Simple CSS-based transitions that should work reliably
 */

export const SimpleFadeTransition: React.FC<SimpleTransitionProps> = ({
    show,
    children,
    className = '',
    duration = 300,
}) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isVisible, setIsVisible] = useState(show);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (show) {
            // Show element first
            setShouldRender(true);
            // Then trigger transition on next frame
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        } else {
            // Start exit animation
            setIsVisible(false);
            // Remove from DOM after animation completes
            timeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, duration);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [show, duration]);

    if (!shouldRender) {
        return null;
    }

    return (
        <div
            className={`transition-opacity ease-in-out ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                opacity: isVisible ? 1 : 0,
            }}
        >
            {children}
        </div>
    );
};

export const SimpleScaleTransition: React.FC<SimpleTransitionProps> = ({
    show,
    children,
    className = '',
    duration = 300,
}) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isVisible, setIsVisible] = useState(show);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        } else {
            setIsVisible(false);
            timeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, duration);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [show, duration]);

    if (!shouldRender) {
        return null;
    }

    return (
        <div
            className={`transition-all ease-in-out ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'scale(1)' : 'scale(0.9)',
                transformOrigin: 'center',
            }}
        >
            {children}
        </div>
    );
};

export const SimpleSlideDownTransition: React.FC<SimpleTransitionProps> = ({
    show,
    children,
    className = '',
    duration = 300,
}) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isVisible, setIsVisible] = useState(show);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        } else {
            setIsVisible(false);
            timeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, duration);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [show, duration]);

    if (!shouldRender) {
        return null;
    }

    return (
        <div
            className={`transition-all ease-in-out overflow-hidden ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
                maxHeight: isVisible ? '500px' : '0',
            }}
        >
            {children}
        </div>
    );
};

export const SimpleSlideUpTransition: React.FC<SimpleTransitionProps> = ({
    show,
    children,
    className = '',
    duration = 300,
}) => {
    const [shouldRender, setShouldRender] = useState(show);
    const [isVisible, setIsVisible] = useState(show);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (show) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        } else {
            setIsVisible(false);
            timeoutRef.current = setTimeout(() => {
                setShouldRender(false);
            }, duration);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [show, duration]);

    if (!shouldRender) {
        return null;
    }

    return (
        <div
            className={`transition-all ease-in-out overflow-hidden ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                maxHeight: isVisible ? '500px' : '0',
            }}
        >
            {children}
        </div>
    );
};
