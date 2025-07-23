import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Card } from '../components/base/Card/Card';
import { Button } from '../components/base/Button/Button';

const meta = {
  title: 'Base/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outlined', 'elevated'],
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Card Title</h3>
        <p className="text-gray-600">This is a simple card with some content.</p>
      </div>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Outlined Card</h3>
        <p className="text-gray-600">This card has an outlined style.</p>
      </div>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
        <p className="text-gray-600">This card has an elevated style with shadow.</p>
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Card with Actions</h3>
        <p className="text-gray-600 mb-4">This card includes action buttons.</p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm">
            Primary Action
          </Button>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Large Padding</h3>
        <p className="text-gray-600">This card has large padding for more spacious content.</p>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    padding: 'none',
    children: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Custom Padding</h3>
        <p className="text-gray-600">
          This card has no default padding, but custom padding is applied.
        </p>
      </div>
    ),
  },
};
