import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ToolResultsScreen } from '../../src/screens/tools/ToolResultsScreen';
import { ScreenHarness } from '../../storybook/harness/ScreenHarness';
import calc from '../../src/api/__fixtures__/uat.calculate_league_trimmed.json';

const params = { tool: 'ultimate', spends: { amazon_spends: 10000, flipkart_spends: 5000 }, answers: {}, title: 'Your ultimate card' };
const routes = [{ match: '/cardgenius/calculate', body: calc }];
const meta: Meta = { title: 'Spike/ToolResults', parameters: { layout: 'fullscreen' } };
export default meta;
const S = (api: any): StoryObj => ({ render: () => <ScreenHarness name="ToolResults" component={ToolResultsScreen} params={params} api={api} /> });
export const Populated = S({ mode: 'ok', routes });
export const Loading = S({ mode: 'loading' });
export const ServerError = S({ mode: 'error' });
export const Offline = S({ mode: 'offline' });
