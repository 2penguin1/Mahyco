import { useAuth } from '@/lib/providers/AuthProvider';

const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <button
      onClick={() => logout()}
      className="button logout"
    >
      Sign Out
    </button>
  );
};

export default LogoutButton;
