import React from 'react'; import { View } from 'react-native';
// Storybook stub: Rive is native only.
const Rive = React.forwardRef((props: any, _ref) => <View style={props.style} />);
export default Rive; export const Fit = { Contain: 'contain', Cover: 'cover' }; export const Alignment = { Center: 'center' };
