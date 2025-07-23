import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { fn } from 'storybook/test';
import { Modal } from '../components/base/Modal/Modal';
import { Button } from '../components/base/Button/Button';
import { Input } from '../components/base/Input/Input';

const meta = {
  title: 'Base/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
    },
    isOpen: {
      control: 'boolean',
    },
  },
  args: {
    onClose: fn(),
    isOpen: true, // Always show modal in stories
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Modal Title',
    children: (
      <div>
        <p className="mb-4">This is a simple modal with some content.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Confirm</Button>
        </div>
      </div>
    ),
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    title: 'Small Modal',
    children: (
      <div>
        <p className="mb-4">This is a small modal.</p>
        <Button variant="primary" className="w-full">
          OK
        </Button>
      </div>
    ),
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    title: 'Large Modal',
    children: (
      <div>
        <p className="mb-6">This is a large modal with more content space.</p>
        <div className="space-y-4 mb-6">
          <Input label="Name" placeholder="Enter your name" />
          <Input label="Email" type="email" placeholder="Enter your email" />
          <Input label="Message" placeholder="Enter your message" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Submit</Button>
        </div>
      </div>
    ),
  },
};

export const ConfirmationDialog: Story = {
  args: {
    size: 'sm',
    title: 'Confirm Action',
    children: (
      <div>
        <p className="mb-6">
          Are you sure you want to delete this item? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
      </div>
    ),
  },
};

export const FormModal: Story = {
  args: {
    size: 'md',
    title: 'Create New Project',
    children: (
      <div>
        <div className="space-y-4 mb-6">
          <Input label="Project Name" placeholder="Enter project name" />
          <Input label="Description" placeholder="Enter project description" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Star Trek Universe</option>
              <option>Star Wars Universe</option>
              <option>Custom Universe</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Create Project</Button>
        </div>
      </div>
    ),
  },
};
