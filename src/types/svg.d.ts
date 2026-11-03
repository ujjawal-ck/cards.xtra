/**
 * Tell TypeScript that `import Foo from './foo.svg'` resolves to a React
 * component accepting react-native-svg props. The actual transformation
 * happens in metro.config.js via react-native-svg-transformer.
 */
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
