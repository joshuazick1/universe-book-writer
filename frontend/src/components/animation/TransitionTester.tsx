import React, { useState } from 'react';
import {
    FadeTransition,
    ScaleTransition,
    SlideDownTransition,
    SlideUpTransition,
} from './index';

/**
 * Animation Framework Tester Component
 * 
 * A focused testing component for basic transitions.
 * This is simpler than AnimationShowcase and provides a quick way
 * to test that the core transition functionality is working properly.
 */
export const TransitionTester: React.FC = () => {
    const [showTransitions, setShowTransitions] = useState(false);

    return (
        <div className="p-6 bg-white rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">🎬 Transition Framework Test</h3>

            <button
                onClick={() => setShowTransitions(!showTransitions)}
                className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
                {showTransitions ? 'Hide' : 'Show'} Transitions
            </button>

            <div className="space-y-6">
                <div>
                    <p className="text-sm text-gray-600 mb-2">Fade Transition:</p>
                    <FadeTransition show={showTransitions} duration={400}>
                        <div className="p-4 bg-blue-100 rounded border border-blue-200">
                            ✨ This content should fade in/out smoothly
                        </div>
                    </FadeTransition>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-2">Scale Transition:</p>
                    <ScaleTransition show={showTransitions} duration={400}>
                        <div className="p-4 bg-green-100 rounded border border-green-200">
                            📏 This content should scale in/out from center
                        </div>
                    </ScaleTransition>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-2">Slide Down Transition:</p>
                    <SlideDownTransition show={showTransitions} duration={400}>
                        <div className="p-4 bg-yellow-100 rounded border border-yellow-200">
                            ⬇️ This content should slide down from above
                        </div>
                    </SlideDownTransition>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-2">Slide Up Transition:</p>
                    <SlideUpTransition show={showTransitions} duration={400}>
                        <div className="p-4 bg-purple-100 rounded border border-purple-200">
                            ⬆️ This content should slide up from below
                        </div>
                    </SlideUpTransition>
                </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                    <strong>Current state:</strong> {showTransitions ? 'VISIBLE' : 'HIDDEN'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    All transitions use a 400ms duration for smoother animations.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    For comprehensive animation examples, see the AnimationShowcase component.
                </p>
            </div>
        </div>
    );
};
