/**
 * Plugin Animation Registry
 * System for registering and managing plugin-specific animations
 */

import React from 'react';

export interface PluginAnimationComponent {
    name: string;
    component: React.ComponentType<any>;
    category: 'transition' | 'effect' | 'ui' | 'specialized';
    universeType?: string;
    description?: string;
    examples?: Array<{
        name: string;
        props: Record<string, any>;
    }>;
}

export interface PluginAnimationRegistry {
    animations: Map<string, PluginAnimationComponent>;
    universeAnimations: Map<string, PluginAnimationComponent[]>;
}

class AnimationRegistryService {
    private registry: PluginAnimationRegistry = {
        animations: new Map(),
        universeAnimations: new Map(),
    };

    /**
     * Register a plugin animation component
     */
    registerAnimation(animation: PluginAnimationComponent): void {
        const key = `${animation.universeType || 'core'}.${animation.name}`;
        this.registry.animations.set(key, animation);

        // Group by universe type
        if (animation.universeType) {
            const universeAnimations = this.registry.universeAnimations.get(animation.universeType) || [];
            universeAnimations.push(animation);
            this.registry.universeAnimations.set(animation.universeType, universeAnimations);
        }
    }

    /**
     * Unregister animations for a specific universe/plugin
     */
    unregisterAnimations(universeType: string): void {
        // Remove from main registry
        for (const [key, animation] of this.registry.animations) {
            if (animation.universeType === universeType) {
                this.registry.animations.delete(key);
            }
        }

        // Remove from universe registry
        this.registry.universeAnimations.delete(universeType);
    }

    /**
     * Get animation component by key
     */
    getAnimation(universeType: string, name: string): PluginAnimationComponent | undefined {
        const key = `${universeType}.${name}`;
        return this.registry.animations.get(key);
    }

    /**
     * Get all animations for a universe
     */
    getUniverseAnimations(universeType: string): PluginAnimationComponent[] {
        return this.registry.universeAnimations.get(universeType) || [];
    }

    /**
     * Get all registered animations
     */
    getAllAnimations(): PluginAnimationComponent[] {
        return Array.from(this.registry.animations.values());
    }

    /**
     * Get animations by category
     */
    getAnimationsByCategory(category: PluginAnimationComponent['category']): PluginAnimationComponent[] {
        return this.getAllAnimations().filter(anim => anim.category === category);
    }
}

// Singleton instance
export const animationRegistry = new AnimationRegistryService();

/**
 * Hook for using plugin animations
 */
export const usePluginAnimations = (universeType?: string) => {
    return {
        getAnimation: (name: string) =>
            universeType
                ? animationRegistry.getAnimation(universeType, name)
                : undefined,
        getUniverseAnimations: (targetUniverse?: string) =>
            animationRegistry.getUniverseAnimations(targetUniverse || universeType || ''),
        getAllAnimations: () => animationRegistry.getAllAnimations(),
    };
};
