declare module 'react-katex' {
  import { FC } from 'react';

  interface MathProps {
    math?: string;
    children?: string;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => JSX.Element;
    settings?: any; // <--- Adicionamos isso para aceitar 'strict', 'trust', etc.
  }

  export const InlineMath: FC<MathProps>;
  export const BlockMath: FC<MathProps>;
}