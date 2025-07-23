/**
 * LCARS Visual Component Showcase
 * Complete LCARS interface that replaces the standard showcase when LCARS theme is active
 */

import React, { useState } from 'react';
import { LCARSElbow } from '../lcars/LCARSElbow.js';
import { LCARSPanel } from '../lcars/LCARSPanel.js';
import { LCARSButton } from '../lcars/LCARSButton.js';
import { LCARSBarCode } from '../lcars/LCARSBarCode.js';
import { PADD } from '../starfleet/PADD.js';

interface LCARSVisualComponentShowcaseProps {
    // Add any props needed for showcase functionality
}

export const LCARSVisualComponentShowcase: React.FC<LCARSVisualComponentShowcaseProps> = () => {
    const [activePanel, setActivePanel] = useState('main');
    const [systemStatus, setSystemStatus] = useState<'online' | 'standby' | 'alert'>('online');

    const toggleSystemStatus = () => {
        const statuses: ('online' | 'standby' | 'alert')[] = ['online', 'standby', 'alert'];
        const currentIndex = statuses.indexOf(systemStatus);
        setSystemStatus(statuses[(currentIndex + 1) % statuses.length]);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4" style={{
            fontFamily: '"Orbitron", "Courier New", monospace'
        }}>
            {/* LCARS Header */}
            <div className="relative mb-8">
                <LCARSElbow
                    position="top-left"
                    size="lg"
                    color="#FF9900"
                    className="absolute top-0 left-0"
                />
                <div className="ml-32 pt-4">
                    <h1 className="text-3xl font-bold uppercase tracking-wider text-orange-400">
                        LCARS INTERFACE
                    </h1>
                    <p className="text-sm text-orange-300 mt-2">
                        LIBRARY COMPUTER ACCESS/RETRIEVAL SYSTEM • STARFLEET COMMAND
                    </p>
                    <div className="text-xs text-orange-200 mt-1">
                        STARDATE: {new Date().getFullYear()}.{String(Math.floor(Math.random() * 900) + 100)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Sidebar - LCARS Bar Code Navigation */}
                <div className="col-span-2">
                    <LCARSBarCode
                        items={['MAIN', 'SYSTEMS', 'CONTROLS', 'STATUS', 'DIAGNOSTICS']}
                        activeIndex={['main', 'systems', 'controls', 'status', 'diagnostics'].indexOf(activePanel)}
                        color="#FF9900"
                    />
                </div>

                {/* Main Content Area */}
                <div className="col-span-8">
                    <LCARSPanel
                        title="VISUAL COMPONENT SHOWCASE"
                        subtitle="UNIVERSE INTERFACE DEMONSTRATION PROTOCOL"
                        status={systemStatus}
                        showElbows={true}
                        showSideBars={true}
                    >
                        <div className="space-y-6">
                            {/* Button Demonstration */}
                            <div>
                                <h3 className="text-lg font-bold text-orange-400 mb-4 uppercase tracking-wider">
                                    INTERACTIVE CONTROLS
                                </h3>
                                <div className="flex flex-wrap gap-4">
                                    <LCARSButton variant="primary" onClick={toggleSystemStatus}>
                                        ENGAGE
                                    </LCARSButton>
                                    <LCARSButton variant="secondary">
                                        STANDBY
                                    </LCARSButton>
                                    <LCARSButton variant="warning">
                                        CAUTION
                                    </LCARSButton>
                                    <LCARSButton variant="alert">
                                        ALERT
                                    </LCARSButton>
                                    <LCARSButton disabled>
                                        OFFLINE
                                    </LCARSButton>
                                </div>
                            </div>

                            {/* System Status Display */}
                            <div>
                                <h3 className="text-lg font-bold text-orange-400 mb-4 uppercase tracking-wider">
                                    SYSTEM STATUS
                                </h3>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-xs font-mono text-orange-300">WARP CORE</div>
                                        <div className="text-lg font-bold text-green-400">STABLE</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-mono text-orange-300">SHIELDS</div>
                                        <div className="text-lg font-bold text-blue-400">100%</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-mono text-orange-300">PHASERS</div>
                                        <div className="text-lg font-bold text-orange-400">READY</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-mono text-orange-300">COMMS</div>
                                        <div className="text-lg font-bold text-cyan-400">OPEN</div>
                                    </div>
                                </div>
                            </div>

                            {/* Interface Status */}
                            <div className="bg-gray-900 p-4 rounded border border-orange-500">
                                <h4 className="text-orange-400 font-bold mb-2 uppercase">
                                    🖖 AUTHENTIC LCARS INTERFACE ACTIVE
                                </h4>
                                <p className="text-sm text-orange-200">
                                    This layout demonstrates proper LCARS design principles:
                                    pill-shaped buttons, elbow frames, asymmetric layouts,
                                    and authentic Star Trek color schemes.
                                </p>
                                <div className="mt-2 text-xs text-orange-300">
                                    Current Status: <span className="text-orange-400 font-bold uppercase">{systemStatus}</span>
                                </div>
                            </div>
                        </div>
                    </LCARSPanel>
                </div>

                {/* Right Sidebar - Status Panels */}
                <div className="col-span-2 space-y-4">
                    <PADD
                        title="SHIP STATUS"
                        status="online"
                        className="h-48"
                    >
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span>Hull Integrity:</span>
                                <span className="text-green-400">100%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Power Level:</span>
                                <span className="text-blue-400">98%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Life Support:</span>
                                <span className="text-green-400">NOMINAL</span>
                            </div>
                        </div>
                    </PADD>

                    <PADD
                        title="MISSION LOG"
                        status="online"
                        className="h-32"
                    >
                        <div className="text-xs text-orange-200">
                            Testing LCARS interface components and theme integration.
                        </div>
                    </PADD>
                </div>
            </div>

            {/* LCARS Footer */}
            <div className="mt-8 relative">
                <LCARSElbow
                    position="bottom-right"
                    size="md"
                    color="#FF9900"
                    className="absolute bottom-0 right-0"
                />
                <div className="mr-28 pb-4 text-right">
                    <div className="text-xs text-orange-300">
                        UNITED FEDERATION OF PLANETS • STARFLEET COMMAND
                    </div>
                </div>
            </div>
        </div>
    );
};
