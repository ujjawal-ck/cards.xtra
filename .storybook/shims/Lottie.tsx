import React from 'react';
import { View, Text } from 'react-native';
/** Web shim for lottie-react-native — shows a static placeholder in Storybook. */
export default function LottieView({ style }: any) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#0741ef', borderRadius: 12 }, style]}>
      <Text style={{ color: '#fff', fontSize: 12 }}>Lottie animation (view on device)</Text>
    </View>
  );
}
