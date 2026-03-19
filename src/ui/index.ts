import React from 'react';

export interface StatusMessageProps {
  readonly message: string;
}

export const StatusMessage = ({ message }: StatusMessageProps): React.JSX.Element =>
  React.createElement(React.Fragment, null, message);
