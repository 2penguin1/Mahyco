import { useAuth } from '@/lib/providers/AuthProvider';

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading ...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {user.picture && (
        <img
          src={user.picture}
          alt={user.full_name}
          className="h-8 w-8 rounded-full"
        />
      )}
      <div className="text-sm">
        <p className="font-medium text-[var(--text-primary)]">{user.full_name}</p>
        <p className="text-[var(--text-muted)]">{user.email}</p>
      </div>
    </div>
  );
};

export default Profile;
