import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onCredential: (credential: string) => Promise<void>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
  label: string;
}

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// GoogleLogin from @react-oauth/google renders its own button by default.
// We wrap it in a hidden div and show our own styled button that triggers
// the popup. The trick: we use the `render` prop (custom button) pattern
// which @react-oauth/google supports via the `useGoogleLogin` hook instead.
// For simplicity and reliability, we render GoogleLogin's built-in flow
// and overlay our button on top — but actually the cleanest approach with
// @react-oauth/google v0.12 is just to use <GoogleLogin> directly and
// style the container, OR use useGoogleLogin hook with our own button.

const GoogleSignInButton: React.FC<Props> = ({ onCredential, loading, setLoading, setError, label }) => {
  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed: no credential received.');
      return;
    }
    setLoading(true);
    try {
      await onCredential(credentialResponse.credential);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
    setLoading(false);
  };

  return (
    <div className="google-login-wrapper">
      {/* We use GoogleLogin and style it via CSS injection on the wrapper */}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        text="signin_with"
        theme="outline"
        size="large"
        width="100%"
      />
    </div>
  );
};

export default GoogleSignInButton;
