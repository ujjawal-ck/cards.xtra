import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Button } from '../../src/atoms/Button';
const meta: Meta = { title: 'Spike/Button' };
export default meta;
export const Solid: StoryObj = { render: () => <Button label="Apply now" variant="solid" tone="main" size={44} /> };
