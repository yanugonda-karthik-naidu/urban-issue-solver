import { Link, LinkProps } from 'react-router-dom';
import { useRoutePrefetch } from '@/hooks/useRoutePrefetch';

interface PrefetchLinkProps extends LinkProps {
  to: string;
}

export const PrefetchLink = ({ to, children, ...props }: PrefetchLinkProps) => {
  const { onMouseEnter } = useRoutePrefetch();

  return (
    <Link 
      to={to} 
      onMouseEnter={onMouseEnter(to)}
      {...props}
    >
      {children}
    </Link>
  );
};
