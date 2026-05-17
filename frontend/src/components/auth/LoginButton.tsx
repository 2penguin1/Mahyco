import { useNavigate } from 'react-router';

const LoginButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/login')}
      className="button login"
    >
      Sign In
    </button>
  );
};

export default LoginButton;
