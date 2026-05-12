import { OAuth2Client } from 'google-auth-library';
try {
  const client = new OAuth2Client(undefined);
  console.log('Success with undefined');
} catch (e) {
  console.log('Failed with undefined:', e.message);
}
try {
  const client = new OAuth2Client('');
  console.log('Success with empty string');
} catch (e) {
  console.log('Failed with empty string:', e.message);
}
