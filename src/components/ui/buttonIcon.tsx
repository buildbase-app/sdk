import React from 'react';

import { Button, ButtonProps } from './button';

interface IProps extends ButtonProps {
  icon: React.ReactElement;
  size: ButtonProps['size'];
  variant?: ButtonProps['variant'];
}

export default function IconButton(props: IProps) {
  return (
    <Button startIcon={props.progress ? <></> : props.icon} disabled={props.progress} {...props} />
  );
}
