declare module 'react-katex' {
  import { FC } from 'react';

  interface MathProps {
    math?: string;
    children?: string;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => JSX.Element;
  }

  export const InlineMath: FC<MathProps>;
  export const BlockMath: FC<MathProps>;
}