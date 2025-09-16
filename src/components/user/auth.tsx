import { useSaaSAuth } from '../../providers/auth/hooks';
import { AuthStatus } from '../../providers/auth/types';

interface IProps {
  children: React.ReactNode;
}

export const WhenAuthenticated = (props: IProps) => {
  const { children } = props;
  const { status } = useSaaSAuth();

  if (status !== AuthStatus.authenticated) return null;

  return children;
};

export const WhenUnauthenticated = (props: IProps) => {
  const { children } = props;
  const { status } = useSaaSAuth();

  if (status === AuthStatus.authenticated) return null;

  return children;
};
