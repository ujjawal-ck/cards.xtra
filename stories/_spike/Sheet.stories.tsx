import React, { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { LogoutConfirmSheet, type LogoutConfirmSheetRef } from '../../src/organisms/LogoutConfirmSheet';
const meta: Meta = { title: 'Spike/Sheet', parameters: { layout: 'fullscreen' } };
export default meta;
function Open() {
  const ref = useRef<LogoutConfirmSheetRef>(null);
  useEffect(() => { const t = setTimeout(() => ref.current?.present(), 300); return () => clearTimeout(t); }, []);
  return <View style={{ width: 390, height: 844, alignSelf: 'center' }}><LogoutConfirmSheet ref={ref} onConfirm={() => {}} /></View>;
}
export const LogoutConfirm: StoryObj = { render: () => <Open /> };
