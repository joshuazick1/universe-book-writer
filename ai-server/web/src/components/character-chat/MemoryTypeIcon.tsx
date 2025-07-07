/**
 * Memory Type Icon - Displays appropriate icons for different memory types
 * 
 * Features:
 * - Memory type specific icons
 * - Consistent styling and sizing
 * - Color coding by memory category
 * - Tooltip support
 */

import React from 'react';
import {
    UserIcon,
    BookOpenIcon,
    CalendarIcon,
    HeartIcon,
    CursorArrowRaysIcon,
    WrenchIcon,
    FaceSmileIcon,
    StarIcon,
    LightBulbIcon,
    MapIcon,
    ChatBubbleLeftRightIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

type MemoryType = 'trait' | 'knowledge' | 'event' | 'relationship' | 'goal' | 'skill' | 'emotion' | 'preference' | 'location' | 'conversation';

interface MemoryTypeIconProps {
    type: MemoryType;
    className?: string;
    showTooltip?: boolean;
}

export const MemoryTypeIcon: React.FC<MemoryTypeIconProps> = ({
    type,
    className = 'w-5 h-5',
    showTooltip = false
}) => {
    const getIconConfig = (memoryType: MemoryType) => {
        switch (memoryType) {
            case 'trait':
                return {
                    icon: <UserIcon className={className} />,
                    color: 'text-blue-600',
                    tooltip: 'Character Trait'
                };
            case 'knowledge':
                return {
                    icon: <BookOpenIcon className={className} />,
                    color: 'text-green-600',
                    tooltip: 'Knowledge & Facts'
                };
            case 'event':
                return {
                    icon: <CalendarIcon className={className} />,
                    color: 'text-purple-600',
                    tooltip: 'Event & Experience'
                };
            case 'relationship':
                return {
                    icon: <HeartIcon className={className} />,
                    color: 'text-red-600',
                    tooltip: 'Relationship'
                };
            case 'goal':
                return {
                    icon: <CursorArrowRaysIcon className={className} />,
                    color: 'text-orange-600',
                    tooltip: 'Goal & Motivation'
                };
            case 'skill':
                return {
                    icon: <WrenchIcon className={className} />,
                    color: 'text-yellow-600',
                    tooltip: 'Skill & Ability'
                };
            case 'emotion':
                return {
                    icon: <FaceSmileIcon className={className} />,
                    color: 'text-pink-600',
                    tooltip: 'Emotion & Feeling'
                };
            case 'preference':
                return {
                    icon: <StarIcon className={className} />,
                    color: 'text-indigo-600',
                    tooltip: 'Preference & Opinion'
                };
            case 'location':
                return {
                    icon: <MapIcon className={className} />,
                    color: 'text-teal-600',
                    tooltip: 'Location & Place'
                };
            case 'conversation':
                return {
                    icon: <ChatBubbleLeftRightIcon className={className} />,
                    color: 'text-cyan-600',
                    tooltip: 'Conversation Memory'
                };
            default:
                return {
                    icon: <LightBulbIcon className={className} />,
                    color: 'text-gray-600',
                    tooltip: 'Memory'
                };
        }
    };

    const { icon, color, tooltip } = getIconConfig(type);

    const iconElement = (
        <span className={`${color} ${showTooltip ? 'cursor-help' : ''}`}>
            {icon}
        </span>
    );

    if (showTooltip) {
        return (
            <span title={tooltip} className="inline-block">
                {iconElement}
            </span>
        );
    }

    return iconElement;
};

export default MemoryTypeIcon;
